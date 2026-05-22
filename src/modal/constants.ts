import { Dimensions, Platform } from 'react-native';

export const SCREEN_WIDTH = Dimensions.get('window').width;
export const SCREEN_HEIGHT = Dimensions.get('window').height;

export const DISMISS_THRESHOLD_Y = 120;
export const LONG_PRESS_MS = 200;
export const HORIZONTAL_SNAP_DURATION = 250;
export const APPEAR_DURATION = 220;
export const DISMISS_DRAG_RANGE = 240;

// ─────────── Cube tuning ───────────
// iOS ratio=2 gives a ~6% mid-swipe gap that matches the canonical
// visual. Android renders the rotated faces wider in screen space than
// iOS (perspective handling differs), so the same ratio causes visible
// overlap at the hinge — we use 1.35 there which lands at the same
// perceived spacing.
export const CUBE_ANGLE = Math.PI / 3; // 60° at the edge; ±30° mid-swipe
export const CUBE_RATIO = Platform.OS === 'ios' ? 2 : 1.35;
