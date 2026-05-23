import type { ReactNode } from 'react';
import type { ImageSourcePropType, TextStyle, ViewStyle } from 'react-native';

/**
 * A single story slide owned by one user. The library doesn't render
 * the slide content itself — the consumer passes `renderContent` which
 * returns whatever JSX they want (an image, a video, a marketing card,
 * etc).
 */
export interface StoryItem {
  id: string;
  /** Source used for the (optional) preload / fallback image. Required
   *  even if `renderContent` is provided so the library can pre-fetch
   *  before the slide opens. */
  source: ImageSourcePropType;
  /** Custom JSX shown when this slide is active. */
  renderContent?: () => ReactNode;
}

/** A user in the avatar row whose stories the modal will play through. */
export interface StoryUser {
  id: string;
  avatarSource: ImageSourcePropType;
  name?: string;
  /** Optional payload surfaced in the analytics callbacks. */
  priority?: number;
  stories: StoryItem[];
}

/** Public methods exposed via forwardRef so screens can drive the modal. */
export interface StoriesPublicMethods {
  /** Open the modal at a specific user (and optionally a specific slide). */
  show: (userId: string, slideId?: string) => void;
  /** Close the modal. */
  hide: () => void;
}

/** Analytics event payload (open / view-slide / close). */
export interface StoryAnalyticsEvent {
  userId: string;
  slideId: string;
  /** Zero-based slide index inside the user's stories array. */
  slideIndex: number;
}

/** Persisted progress — maps userId → last viewed slideId. */
export type SeenProgress = Record<string, string>;

/** Render-prop state passed to consumer-provided header / close button. */
export interface StoryHeaderRenderState {
  user: StoryUser;
  activeSlideIndex: number;
  close: () => void;
}

/** Render-prop state passed to consumer-provided avatar image. */
export interface AvatarImageRenderState {
  source: ImageSourcePropType;
  size: number;
}

export interface StoriesProps {
  /** Story users (avatar row + content). */
  users: StoryUser[];
  /** Default duration per slide in ms. Default 5000. */
  animationDuration?: number;
  /** Avatar ring colours for unseen stories. 1 colour = solid ring,
   *  ≥2 = linear gradient (top-left → bottom-right). Default
   *  `['#FF5C5C']`. */
  avatarBorderColors?: string[];
  /** Avatar ring colours for fully-seen stories. Default
   *  `['rgba(128,128,128,0.5)']`. */
  avatarSeenBorderColors?: string[];
  /** Diameter of avatar circle in px. Default 50. */
  avatarSize?: number;
  /** Show name label under each avatar. */
  showName?: boolean;
  /** Modal background. */
  backgroundColor?: string;
  /** Container style for the avatar row. */
  listContainerStyle?: ViewStyle;
  /** Style for the optional name label. */
  nameTextStyle?: TextStyle;
  /** Persist progress to a storage adapter. Default true (uses the
   *  in-memory adapter unless you pass a real one via `storage`). */
  saveProgress?: boolean;
  /** Storage adapter for the seen-progress map. If omitted the
   *  built-in in-memory adapter is used — progress is then lost on
   *  unmount. Import an AsyncStorage adapter from
   *  `@novev9/react-native-instagram-stories/async-storage` if you want
   *  real persistence. */
  storage?: StorageAdapter;
  // ───────── Render props (escape hatches) ─────────
  /** Override the header rendered above the slide (title + close). */
  renderHeader?: (state: StoryHeaderRenderState) => ReactNode;
  /** Override just the close button inside the default header. */
  renderCloseButton?: (state: StoryHeaderRenderState) => ReactNode;
  /** Override the avatar's image — useful for swapping in FastImage. */
  renderAvatarImage?: (state: AvatarImageRenderState) => ReactNode;
  // ───────── Analytics ─────────
  /** Fired when the modal first becomes visible for a user. */
  onShow?: (event: StoryAnalyticsEvent) => void;
  /** Fired each time a new slide becomes active. */
  onViewSlide?: (event: StoryAnalyticsEvent) => void;
  /** Fired when the modal closes, carrying the last-viewed slide. */
  onHide?: (event: StoryAnalyticsEvent) => void;
}

/** Minimum interface a storage backend must provide. Sync or async are
 *  both fine — the library awaits everything. */
export interface StorageAdapter {
  getItem: (key: string) => Promise<string | null> | string | null;
  setItem: (key: string, value: string) => Promise<void> | void;
}
