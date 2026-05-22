import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

interface Props {
  /** Total slide count for this user. */
  count: number;
  /** Index of the currently animating slide. */
  activeIndex: number;
  /** Shared value 0→1, animation progress of the active slide. */
  progress: SharedValue<number>;
  color?: string;
  backgroundColor?: string;
}

/**
 * Each bar is a flex slot. The fill is always full-width but anchored
 * to the left via `transformOrigin: left`, so `scaleX` interpolates
 * between 0 (empty) and 1 (full). We avoid animating `width: '%'`
 * because under RN New Architecture / Fabric Reanimated layout-prop
 * updates are slower and occasionally crash on Android.
 */
function StoryProgressBarsComponent(props: Props) {
  const {
    count,
    activeIndex,
    progress,
    color = '#FFFFFF',
    backgroundColor = 'rgba(255,255,255,0.3)',
  } = props;

  return (
    <View style={styles.container}>
      {Array.from({ length: count }, (_, i) => (
        <ProgressBar
          key={i}
          isActive={i === activeIndex}
          isComplete={i < activeIndex}
          progress={progress}
          color={color}
          backgroundColor={backgroundColor}
        />
      ))}
    </View>
  );
}

interface BarProps {
  isActive: boolean;
  isComplete: boolean;
  progress: SharedValue<number>;
  color: string;
  backgroundColor: string;
}

const ProgressBar = memo(function ProgressBar(props: BarProps) {
  const { isActive, isComplete, progress, color, backgroundColor } = props;

  const fillStyle = useAnimatedStyle(() => {
    if (isComplete) return { transform: [{ scaleX: 1 }] };
    if (isActive) return { transform: [{ scaleX: progress.value }] };
    return { transform: [{ scaleX: 0 }] };
  });

  return (
    <View style={[styles.bar, { backgroundColor }]}>
      <Animated.View
        style={[styles.fill, { backgroundColor: color }, fillStyle]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  bar: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
    transformOrigin: 'left center',
  },
});

export const StoryProgressBars = memo(StoryProgressBarsComponent);
