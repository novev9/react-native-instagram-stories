/* eslint-disable react-hooks/immutability, react-hooks/refs --
   Reanimated shared values are mutated through their `.value` setter
   (both inside worklets and from JS effects). React Compiler's lint
   plugin doesn't model that as separate-from-React state and flags
   every assignment. Silenced file-wide. */
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import {
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { StoryProgressBars } from '../components/StoryProgressBars';
import { StoryHeader } from '../components/StoryHeader';
import { StoryCubeSlot } from '../components/StoryCubeSlot';
import {
  APPEAR_DURATION,
  DISMISS_DRAG_RANGE,
  DISMISS_THRESHOLD_Y,
  HORIZONTAL_SNAP_DURATION,
  LONG_PRESS_MS,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
} from './constants';
import {
  createInitialState,
  reducer,
  type ModalState,
} from './reducer';
import type {
  StoryHeaderRenderState,
  StoryUser,
} from '../types';

interface Props {
  users: StoryUser[];
  initialUserIndex: number;
  initialSlideIndex: number;
  animationDuration: number;
  backgroundColor: string;
  /** Called whenever the active slide changes. */
  onSlideChange: (userIndex: number, slideIndex: number) => void;
  /** Called when dismissed (swipe-down, end-of-last-user, modal close). */
  onClose: () => void;
  /** Resolves the starting slide index when the carousel crosses into
   *  a user (e.g. swipe-back from a later user). Without this the modal
   *  would always restart at slide 0, dropping watch progress. */
  pickInitialSlideForUser: (userId: string) => number;
  /** Optional consumer-provided header override. */
  renderHeader?: (state: StoryHeaderRenderState) => React.ReactNode;
  /** Optional consumer-provided close button override. */
  renderCloseButton?: (state: StoryHeaderRenderState) => React.ReactNode;
}

function StoryModalComponent(props: Props) {
  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={props.onClose}
      statusBarTranslucent>
      <SafeAreaProvider>
        <StoryModalContent {...props} />
      </SafeAreaProvider>
    </Modal>
  );
}

function StoryModalContent(props: Props) {
  const {
    users,
    initialUserIndex,
    initialSlideIndex,
    animationDuration,
    backgroundColor,
    onSlideChange,
    onClose,
    pickInitialSlideForUser,
    renderHeader,
    renderCloseButton,
  } = props;

  const insets = useSafeAreaInsets();
  const safeTop = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0
  );

  const usersRef = useRef(users);
  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  const [state, dispatch] = useReducer(
    reducer,
    undefined as never,
    () => createInitialState(users, initialUserIndex, initialSlideIndex)
  ) as [ModalState, React.Dispatch<Parameters<typeof reducer>[1]>];

  const activeUser = users[state.activeUserIndex];
  const activeSlideIndex = activeUser
    ? state.slideIndexByUser[activeUser.id] ?? 0
    : 0;

  // ─────────── Shared values ───────────
  const progress = useSharedValue(0);
  const translateX = useSharedValue(-initialUserIndex * SCREEN_WIDTH);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const pausedProgress = useSharedValue(0);
  const panEnded = useSharedValue(false);
  const animToken = useSharedValue(0);
  const activeUserIndexSV = useSharedValue(initialUserIndex);
  const paused = useSharedValue(false);

  // ─────────── Open / close animation ───────────
  const appearProgress = useSharedValue(0);
  useEffect(() => {
    appearProgress.value = withTiming(1, { duration: APPEAR_DURATION });
  }, [appearProgress]);

  const requestClose = useCallback(() => {
    appearProgress.value = withTiming(
      0,
      { duration: APPEAR_DURATION },
      finished => {
        'worklet';
        if (finished) runOnJS(onClose)();
      }
    );
  }, [appearProgress, onClose]);

  // ─────────── Render-order driver ───────────
  // Android Fabric glitches if absolute-positioned siblings get
  // reordered mid-cube-rotation. Keep the render-order index lagging:
  // it only updates AFTER the snap animation finishes.
  const [renderOrderUserIndex, setRenderOrderUserIndex] =
    useState(initialUserIndex);
  const skipTranslateSyncForIndexRef = useRef<number | null>(null);
  const renderOrderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const scheduleRenderOrderUserIndex = useCallback(
    (targetUserIndex: number, token: number) => {
      if (renderOrderTimerRef.current) {
        clearTimeout(renderOrderTimerRef.current);
      }
      renderOrderTimerRef.current = setTimeout(() => {
        if (animToken.value === token) {
          setRenderOrderUserIndex(targetUserIndex);
        }
      }, HORIZONTAL_SNAP_DURATION + 50);
    },
    [animToken]
  );

  useEffect(() => {
    return () => {
      if (renderOrderTimerRef.current) {
        clearTimeout(renderOrderTimerRef.current);
      }
    };
  }, []);

  const pause = useCallback(() => {
    if (paused.value) return;
    paused.value = true;
    pausedProgress.value = progress.value;
    cancelAnimation(progress);
  }, [progress, pausedProgress, paused]);

  const activeUserIndexRef = useRef(state.activeUserIndex);
  const activeSlideIndexRef = useRef(activeSlideIndex);
  useEffect(() => {
    activeUserIndexRef.current = state.activeUserIndex;
    activeSlideIndexRef.current = activeSlideIndex;
    activeUserIndexSV.value = state.activeUserIndex;
  }, [state.activeUserIndex, activeSlideIndex, activeUserIndexSV]);

  const advanceForward = useCallback(() => {
    paused.value = false;
    const u = usersRef.current;
    const userIdx = activeUserIndexRef.current;
    const user = u[userIdx];
    if (!user) {
      requestClose();
      return;
    }
    const slide = activeSlideIndexRef.current;
    const isLastSlide = slide >= user.stories.length - 1;
    const isLastUser = userIdx >= u.length - 1;
    if (isLastSlide && isLastUser) {
      requestClose();
      return;
    }
    dispatch({ type: 'advance', direction: 1, users: u });
  }, [paused, requestClose]);

  const advanceBackward = useCallback(() => {
    paused.value = false;
    dispatch({ type: 'advance', direction: -1, users: usersRef.current });
  }, [paused]);

  const gotoUser = useCallback(
    (targetUserIndex: number, targetSlideIndex: number) => {
      paused.value = false;
      dispatch({
        type: 'gotoUser',
        targetUserIndex,
        targetSlideIndex,
        users: usersRef.current,
      });
    },
    [paused]
  );

  const commitUserIndex = useCallback(
    (targetUserIndex: number) => {
      paused.value = false;
      skipTranslateSyncForIndexRef.current = targetUserIndex;
      const targetUser = usersRef.current[targetUserIndex];
      if (!targetUser) return;
      // Pick the next-unseen slide (or restart if fully watched). This
      // preserves progress when the carousel crosses back to a user the
      // viewer has already partially watched in this session.
      const startSlide = pickInitialSlideForUser(targetUser.id);
      gotoUser(targetUserIndex, startSlide);
    },
    [gotoUser, paused, pickInitialSlideForUser]
  );

  const resume = useCallback(() => {
    if (!paused.value) return;
    paused.value = false;
    const fromValue = pausedProgress.value;
    const remaining = Math.max(50, animationDuration * (1 - fromValue));
    progress.value = withTiming(1, { duration: remaining }, finished => {
      if (finished) {
        runOnJS(advanceForward)();
      }
    });
  }, [animationDuration, progress, pausedProgress, paused, advanceForward]);

  useEffect(() => {
    paused.value = false;
    progress.value = 0;
    progress.value = withTiming(
      1,
      { duration: animationDuration },
      finished => {
        if (finished) {
          runOnJS(advanceForward)();
        }
      }
    );
    return () => {
      cancelAnimation(progress);
    };
  }, [state.runId, animationDuration, progress, advanceForward, paused]);

  useEffect(() => {
    if (skipTranslateSyncForIndexRef.current === state.activeUserIndex) {
      skipTranslateSyncForIndexRef.current = null;
      return;
    }
    const target = -state.activeUserIndex * SCREEN_WIDTH;
    const token = animToken.value + 1;
    animToken.value = token;
    cancelAnimation(translateX);
    activeUserIndexSV.value = state.activeUserIndex;
    scheduleRenderOrderUserIndex(state.activeUserIndex, token);
    translateX.value = withTiming(
      target,
      { duration: HORIZONTAL_SNAP_DURATION },
      () => {
        'worklet';
        if (animToken.value !== token) return;
        translateX.value = target;
      }
    );
  }, [
    state.activeUserIndex,
    translateX,
    animToken,
    activeUserIndexSV,
    scheduleRenderOrderUserIndex,
  ]);

  const lastRunIdRef = useRef(state.runId);
  useEffect(() => {
    if (state.runId === lastRunIdRef.current) return;
    lastRunIdRef.current = state.runId;
    const user = users[state.activeUserIndex];
    if (!user) {
      requestClose();
      return;
    }
    onSlideChange(state.activeUserIndex, activeSlideIndex);
  }, [
    state.runId,
    state.activeUserIndex,
    activeSlideIndex,
    users,
    requestClose,
    onSlideChange,
  ]);

  const tryAdvanceForward = useCallback(() => {
    const u = usersRef.current;
    const userIdx = state.activeUserIndex;
    const user = u[userIdx];
    if (!user) {
      requestClose();
      return;
    }
    const slide = state.slideIndexByUser[user.id] ?? 0;
    const lastSlide = slide >= user.stories.length - 1;
    const lastUser = userIdx >= u.length - 1;
    if (lastSlide && lastUser) {
      requestClose();
      return;
    }
    advanceForward();
  }, [
    state.activeUserIndex,
    state.slideIndexByUser,
    advanceForward,
    requestClose,
  ]);

  const advanceForwardOrClose = useCallback(() => {
    tryAdvanceForward();
  }, [tryAdvanceForward]);

  const usersLength = users.length;

  const snapToUserIndex = useCallback(
    (nextIndex: number) => {
      'worklet';
      const token = animToken.value + 1;
      animToken.value = token;
      cancelAnimation(translateX);
      runOnJS(scheduleRenderOrderUserIndex)(nextIndex, token);
      const toX = -nextIndex * SCREEN_WIDTH;
      const prevIndex = activeUserIndexSV.value;
      activeUserIndexSV.value = nextIndex;
      const userChanged = nextIndex !== prevIndex;
      if (userChanged) {
        runOnJS(commitUserIndex)(nextIndex);
      } else {
        runOnJS(resume)();
      }
      translateX.value = withTiming(
        toX,
        { duration: HORIZONTAL_SNAP_DURATION },
        () => {
          'worklet';
          if (animToken.value !== token) return;
          translateX.value = toX;
        }
      );
    },
    [
      animToken,
      translateX,
      activeUserIndexSV,
      commitUserIndex,
      resume,
      scheduleRenderOrderUserIndex,
    ]
  );

  const composedGesture = useMemo(() => {
    const longPress = Gesture.LongPress()
      .minDuration(LONG_PRESS_MS)
      .onStart(() => {
        'worklet';
        runOnJS(pause)();
      })
      .onFinalize(() => {
        'worklet';
        runOnJS(resume)();
      });

    const panGesture = Gesture.Pan()
      .activeOffsetX([-15, 15])
      .activeOffsetY([-15, 15])
      .onStart(() => {
        'worklet';
        panEnded.value = false;
        startX.value = translateX.value;
        startY.value = translateY.value;
        runOnJS(pause)();
      })
      .onUpdate(e => {
        'worklet';
        const absX = Math.abs(e.translationX);
        const absY = Math.abs(e.translationY);
        if (absY > absX && e.translationY > 0) {
          translateY.value = Math.max(0, startY.value + e.translationY);
        } else {
          const minTx = -(usersLength - 1) * SCREEN_WIDTH;
          const next = startX.value + e.translationX;
          translateX.value = Math.max(minTx, Math.min(0, next));
        }
      })
      .onEnd(e => {
        'worklet';
        panEnded.value = true;
        const absX = Math.abs(e.translationX);
        const absY = Math.abs(e.translationY);
        const swipedDown =
          absY > absX &&
          (translateY.value > DISMISS_THRESHOLD_Y || e.velocityY > 1000);
        if (swipedDown) {
          translateY.value = withTiming(SCREEN_HEIGHT, { duration: 200 });
          runOnJS(requestClose)();
          return;
        }
        if (translateY.value !== 0) {
          translateY.value = withTiming(0, { duration: 150 });
        }
        const projected =
          -(translateX.value + e.velocityX * 0.12) / SCREEN_WIDTH;
        const targetIdx = Math.min(
          usersLength - 1,
          Math.max(0, Math.round(projected))
        );
        snapToUserIndex(targetIdx);
      })
      .onFinalize(() => {
        'worklet';
        if (panEnded.value) return;
        if (translateY.value !== 0) {
          translateY.value = withTiming(0, { duration: 150 });
        }
        const nearestIdx = Math.min(
          usersLength - 1,
          Math.max(0, Math.round(-translateX.value / SCREEN_WIDTH))
        );
        snapToUserIndex(nearestIdx);
      });

    const tapGesture = Gesture.Tap()
      .maxDuration(LONG_PRESS_MS - 1)
      .maxDistance(10)
      .onEnd((e, success) => {
        'worklet';
        if (!success) return;
        if (e.absoluteX < SCREEN_WIDTH / 2) {
          runOnJS(advanceBackward)();
        } else {
          runOnJS(advanceForwardOrClose)();
        }
      });

    return Gesture.Race(
      tapGesture,
      Gesture.Simultaneous(panGesture, longPress)
    );
  }, [
    pause,
    resume,
    requestClose,
    translateX,
    translateY,
    startX,
    startY,
    usersLength,
    snapToUserIndex,
    panEnded,
    advanceBackward,
    advanceForwardOrClose,
  ]);

  const backdropStyle = useAnimatedStyle(() => {
    const dragProgress = Math.min(translateY.value / DISMISS_DRAG_RANGE, 1);
    const dragScale = interpolate(
      dragProgress,
      [0, 1],
      [1, 0.7],
      Extrapolation.CLAMP
    );
    const appearScale = interpolate(
      appearProgress.value,
      [0, 1],
      [0.7, 1],
      Extrapolation.CLAMP
    );
    return {
      transform: [
        { translateY: translateY.value },
        { scale: appearScale * dragScale },
      ],
    };
  });

  const renderUsers = useMemo(() => {
    const indexed = users.map((u, idx) => ({ u, idx }));
    if (Platform.OS !== 'android') return indexed;
    return indexed.slice().sort((a, b) => {
      const da = Math.abs(a.idx - renderOrderUserIndex);
      const db = Math.abs(b.idx - renderOrderUserIndex);
      return db - da;
    });
  }, [users, renderOrderUserIndex]);

  if (!activeUser) return null;

  const headerState: StoryHeaderRenderState = {
    user: activeUser,
    activeSlideIndex,
    close: requestClose,
  };

  return (
    <GestureHandlerRootView style={styles.fill}>
      <Animated.View style={[styles.fill, { backgroundColor }, backdropStyle]}>
        <GestureDetector gesture={composedGesture}>
          <Animated.View style={styles.fill}>
            {renderUsers.map(({ u: user, idx: userIdx }) => {
              const sIdx = state.slideIndexByUser[user.id] ?? 0;
              const slide = user.stories[sIdx];
              const isNear =
                Math.abs(userIdx - state.activeUserIndex) <= 1 ||
                Math.abs(userIdx - renderOrderUserIndex) <= 1;
              return (
                <StoryCubeSlot
                  key={user.id}
                  userIdx={userIdx}
                  translateX={translateX}
                  width={SCREEN_WIDTH}
                  isNear={isNear}>
                  {slide?.renderContent ? slide.renderContent() : null}
                </StoryCubeSlot>
              );
            })}
          </Animated.View>
        </GestureDetector>

        <View
          style={[styles.overlay, { paddingTop: safeTop }]}
          pointerEvents="box-none">
          <StoryProgressBars
            count={activeUser.stories.length}
            activeIndex={activeSlideIndex}
            progress={progress}
          />
          {renderHeader ? (
            renderHeader(headerState)
          ) : (
            <StoryHeader
              {...headerState}
              renderCloseButton={renderCloseButton}
            />
          )}
        </View>
      </Animated.View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});

export const StoryModal = memo(StoryModalComponent);
