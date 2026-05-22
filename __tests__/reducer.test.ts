import {
  createInitialState,
  reducer,
  type ModalAction,
} from '../src/modal/reducer';
import type { StoryUser } from '../src/types';

const users: StoryUser[] = [
  {
    id: 'u1',
    avatarSource: { uri: 'a1' },
    stories: [
      { id: 's1a', source: { uri: 's1a' } },
      { id: 's1b', source: { uri: 's1b' } },
      { id: 's1c', source: { uri: 's1c' } },
    ],
  },
  {
    id: 'u2',
    avatarSource: { uri: 'a2' },
    stories: [
      { id: 's2a', source: { uri: 's2a' } },
      { id: 's2b', source: { uri: 's2b' } },
    ],
  },
];

const advance = (direction: 1 | -1): ModalAction => ({
  type: 'advance',
  direction,
  users,
});

describe('reducer', () => {
  it('initialises at the requested user/slide', () => {
    const s = createInitialState(users, 0, 0);
    expect(s.activeUserIndex).toBe(0);
    expect(s.slideIndexByUser).toEqual({ u1: 0 });
    expect(s.runId).toBe(1);
  });

  it('advances forward within a user', () => {
    const s0 = createInitialState(users, 0, 0);
    const s1 = reducer(s0, advance(1));
    expect(s1.activeUserIndex).toBe(0);
    expect(s1.slideIndexByUser.u1).toBe(1);
    expect(s1.runId).toBe(2);
  });

  it('advances forward across users when past last slide', () => {
    let s = createInitialState(users, 0, 2); // last slide of u1
    s = reducer(s, advance(1));
    expect(s.activeUserIndex).toBe(1);
    expect(s.slideIndexByUser.u2).toBe(0);
  });

  it('returns same state when trying to advance past the very end', () => {
    let s = createInitialState(users, 1, 1); // last slide of u2 (last user)
    const next = reducer(s, advance(1));
    expect(next).toBe(s); // identity — caller detects exhaustion
  });

  it('advances backward within a user', () => {
    let s = createInitialState(users, 0, 1);
    s = reducer(s, advance(-1));
    expect(s.activeUserIndex).toBe(0);
    expect(s.slideIndexByUser.u1).toBe(0);
  });

  it('advances backward across users to previous user last slide', () => {
    let s = createInitialState(users, 1, 0);
    s = reducer(s, advance(-1));
    expect(s.activeUserIndex).toBe(0);
    expect(s.slideIndexByUser.u1).toBe(2); // last slide of u1
  });

  it('no-ops backward from first user first slide', () => {
    const s0 = createInitialState(users, 0, 0);
    const s1 = reducer(s0, advance(-1));
    expect(s1).toBe(s0);
  });

  it('gotoUser jumps to a specific user/slide and bumps runId', () => {
    const s0 = createInitialState(users, 0, 0);
    const s1 = reducer(s0, {
      type: 'gotoUser',
      targetUserIndex: 1,
      targetSlideIndex: 1,
      users,
    });
    expect(s1.activeUserIndex).toBe(1);
    expect(s1.slideIndexByUser.u2).toBe(1);
    expect(s1.runId).toBe(s0.runId + 1);
  });

  it('restart just bumps runId', () => {
    const s0 = createInitialState(users, 0, 0);
    const s1 = reducer(s0, { type: 'restart' });
    expect(s1.activeUserIndex).toBe(s0.activeUserIndex);
    expect(s1.runId).toBe(s0.runId + 1);
  });
});
