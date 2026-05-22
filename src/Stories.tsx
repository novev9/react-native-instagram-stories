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

    const openAt = useCallback(
      (userId: string, slideId?: string) => {
        const userIdx = users.findIndex(u => u.id === userId);
        if (userIdx < 0) return;
        const user = users[userIdx];
        let startIndex = 0;
        if (slideId) {
          const idx = user.stories.findIndex(s => s.id === slideId);
          if (idx >= 0) startIndex = idx;
        } else {
          const lastSeenId = seen[userId];
          if (lastSeenId) {
            const lastIdx = user.stories.findIndex(
              s => s.id === lastSeenId
            );
            if (lastIdx >= 0 && lastIdx < user.stories.length - 1) {
              startIndex = lastIdx + 1;
            }
          }
        }
        const slide = user.stories[startIndex];
        if (!slide) return;
        setInitialSlideIndex(startIndex);
        setActiveUserIndex(userIdx);
        markSeen(userId, slide.id);
        const initialEvent: StoryAnalyticsEvent = {
          userId,
          slideId: slide.id,
          slideIndex: startIndex,
        };
        lastViewedRef.current = initialEvent;
        if (onShow) onShow(initialEvent);
      },
      [users, seen, markSeen, onShow]
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
        markSeen(user.id, slide.id);
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
            backgroundColor={backgroundColor}
            onSlideChange={onSlideChange}
            onClose={hide}
            renderHeader={renderHeader}
            renderCloseButton={renderCloseButton}
          />
        ) : null}
      </>
    );
  }
);

Stories.displayName = 'Stories';
