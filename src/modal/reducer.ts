import type { StoryUser } from '../types';

/**
 * Single source of truth for "what slide of which user is active".
 * Every transition increments `runId` — the progress animation effect
 * re-runs whenever runId changes, ensuring restart on slide change.
 * Functional reducer updates serialise rapid tap bursts correctly
 * (vs. read-modify-write via refs that lag a render behind).
 */

export interface ModalState {
  activeUserIndex: number;
  slideIndexByUser: Record<string, number>;
  runId: number;
}

export type ModalAction =
  | { type: 'advance'; direction: 1 | -1; users: StoryUser[] }
  | {
      type: 'gotoUser';
      targetUserIndex: number;
      targetSlideIndex: number;
      users: StoryUser[];
    }
  | { type: 'restart' };

export function reducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case 'advance': {
      const userIdx = state.activeUserIndex;
      const user = action.users[userIdx];
      if (!user) return state;
      const currentSlide = state.slideIndexByUser[user.id] ?? 0;
      const next = currentSlide + action.direction;

      if (next >= user.stories.length) {
        // Past the last slide of current user: advance to next user.
        if (userIdx + 1 >= action.users.length) {
          // Past the last user — caller's close-on-exhaust effect picks
          // this up by observing runId without state change.
          return state;
        }
        const nextUser = action.users[userIdx + 1];
        return {
          activeUserIndex: userIdx + 1,
          slideIndexByUser: {
            ...state.slideIndexByUser,
            [nextUser.id]: 0,
          },
          runId: state.runId + 1,
        };
      }
      if (next < 0) {
        // Past the first slide of current user: jump back to previous
        // user's last slide (or no-op if first user).
        if (userIdx === 0) return state;
        const prevUser = action.users[userIdx - 1];
        const lastIdx = prevUser.stories.length - 1;
        return {
          activeUserIndex: userIdx - 1,
          slideIndexByUser: {
            ...state.slideIndexByUser,
            [prevUser.id]: lastIdx,
          },
          runId: state.runId + 1,
        };
      }
      return {
        ...state,
        slideIndexByUser: { ...state.slideIndexByUser, [user.id]: next },
        runId: state.runId + 1,
      };
    }
    case 'gotoUser': {
      const targetUser = action.users[action.targetUserIndex];
      if (!targetUser) return state;
      return {
        activeUserIndex: action.targetUserIndex,
        slideIndexByUser: {
          ...state.slideIndexByUser,
          [targetUser.id]: action.targetSlideIndex,
        },
        runId: state.runId + 1,
      };
    }
    case 'restart':
      return { ...state, runId: state.runId + 1 };
  }
}

export function createInitialState(
  users: StoryUser[],
  initialUserIndex: number,
  initialSlideIndex: number
): ModalState {
  const initialUser = users[initialUserIndex];
  return {
    activeUserIndex: initialUserIndex,
    slideIndexByUser: initialUser
      ? { [initialUser.id]: initialSlideIndex }
      : {},
    runId: 1,
  };
}
