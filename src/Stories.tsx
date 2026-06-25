import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { StoryAvatarList } from './components/StoryAvatarList';
import { StoryModal } from './modal/StoryModal';
import { useStoryPersistence } from './hooks/useStoryPersistence';
import type {
  StoriesProps,
  StoriesPublicMethods,
  StoryAnalyticsEvent,
} from './types';

const DEFAULT_AVATAR_SIZE = 50;
const DEFAULT_ANIMATION_DURATION = 5000;
const DEFAULT_BACKGROUND = '#000000';
const DEFAULT_BORDER_COLORS = ['#FF5C5C'];
const DEFAULT_SEEN_BORDER_COLORS = ['rgba(128,128,128,0.5)'];

/**
 * Top-level Stories component. Owns the persisted "seen" state and
 * forwards imperative handles. The avatar row is rendered immediately;
 * the modal is mounted lazily on first open.
 */
export const Stories = forwardRef<StoriesPublicMethods, StoriesProps>(
  (props, ref) => {
    const {
      users,
      animationDuration = DEFAULT_ANIMATION_DURATION,
      modalAnimationDuration,
      dismissScale,
      avatarBorderColors = DEFAULT_BORDER_COLORS,
      avatarSeenBorderColors = DEFAULT_SEEN_BORDER_COLORS,
      avatarSize = DEFAULT_AVATAR_SIZE,
      backgroundColor = DEFAULT_BACKGROUND,
      showName = false,
      listContainerStyle,
      nameTextStyle,
      saveProgress = true,
      storage,
      renderHeader,
      renderCloseButton,
      renderAvatarImage,
      onShow,
      onViewSlide,
      onHide: onHideProp,
    } = props;

    const lastViewedRef = useRef<StoryAnalyticsEvent | null>(null);

    const { seen, markSeen } = useStoryPersistence({
      enabled: saveProgress,
      storage,
    });

    const [activeUserIndex, setActiveUserIndex] = useState<number | null>(null);
    const [initialSlideIndex, setInitialSlideIndex] = useState(0);

    /**
     * Resolve which slide a user should open at, given the persisted
     * seen-state. Returns:
     *   - `lastSeenIdx + 1` if the user has partially watched (resume),
     *   - `0` if the user has finished all slides (restart), or has
     *     never been watched.
     * Used by `openAt` for fresh `show()` calls AND by the modal
     * itself when the carousel crosses a user boundary (swipe / tap)
     * so progress is preserved everywhere — not just on initial open.
     */
    const pickInitialSlideForUser = useCallback(
      (userId: string): number => {
        const user = users.find(u => u.id === userId);
        if (!user) return 0;
        const lastSeenId = seen[userId];
        if (!lastSeenId) return 0;
        const lastIdx = user.stories.findIndex(s => s.id === lastSeenId);
        if (lastIdx >= 0 && lastIdx < user.stories.length - 1) {
          return lastIdx + 1;
        }
        return 0;
      },
      [users, seen]
    );

    const openAt = useCallback(
      (userId: string, slideId?: string) => {
        const userIdx = users.findIndex(u => u.id === userId);
        if (userIdx < 0) return;
        const user = users[userIdx];
        let startIndex: number;
        if (slideId) {
          const idx = user.stories.findIndex(s => s.id === slideId);
          startIndex = idx >= 0 ? idx : 0;
        } else {
          startIndex = pickInitialSlideForUser(userId);
        }
        const slide = user.stories[startIndex];
        if (!slide) return;
        setInitialSlideIndex(startIndex);
        setActiveUserIndex(userIdx);
        markSeen(userId, slide.id, user.stories.map(s => s.id));
        const initialEvent: StoryAnalyticsEvent = {
          userId,
          slideId: slide.id,
          slideIndex: startIndex,
        };
        lastViewedRef.current = initialEvent;
        if (onShow) onShow(initialEvent);
      },
      [users, pickInitialSlideForUser, markSeen, onShow]
    );

    const hide = useCallback(() => {
      const last = lastViewedRef.current;
      if (last && onHideProp) onHideProp(last);
      lastViewedRef.current = null;
      setActiveUserIndex(null);
    }, [onHideProp]);

    useImperativeHandle(ref, () => ({ show: openAt, hide }), [openAt, hide]);

    const onAvatarPress = useCallback(
      (userId: string) => openAt(userId),
      [openAt]
    );

    const onSlideChange = useCallback(
      (userIdx: number, slideIndex: number) => {
        const user = users[userIdx];
        if (!user) return;
        const slide = user.stories[slideIndex];
        if (!slide) return;
        markSeen(user.id, slide.id, user.stories.map(s => s.id));
        const event: StoryAnalyticsEvent = {
          userId: user.id,
          slideId: slide.id,
          slideIndex,
        };
        lastViewedRef.current = event;
        if (onViewSlide) onViewSlide(event);
      },
      [users, markSeen, onViewSlide]
    );

    return (
      <>
        <StoryAvatarList
          users={users}
          seen={seen}
          avatarBorderColors={avatarBorderColors}
          avatarSeenBorderColors={avatarSeenBorderColors}
          avatarSize={avatarSize}
          showName={showName}
          nameTextStyle={nameTextStyle}
          containerStyle={listContainerStyle}
          renderAvatarImage={renderAvatarImage}
          onAvatarPress={onAvatarPress}
        />
        {activeUserIndex !== null ? (
          <StoryModal
            users={users}
            initialUserIndex={activeUserIndex}
            initialSlideIndex={initialSlideIndex}
            animationDuration={animationDuration}
            modalAnimationDuration={modalAnimationDuration}
            dismissScale={dismissScale}
            backgroundColor={backgroundColor}
            onSlideChange={onSlideChange}
            onClose={hide}
            pickInitialSlideForUser={pickInitialSlideForUser}
            renderHeader={renderHeader}
            renderCloseButton={renderCloseButton}
          />
        ) : null}
      </>
    );
  }
);

Stories.displayName = 'Stories';
