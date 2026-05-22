import React, { memo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

interface Props {
  onPress: () => void;
  color?: string;
  size?: number;
}

const HIT_SLOP = { top: 12, right: 12, bottom: 12, left: 12 };

/**
 * Default close (X) button. Drawn as two crossed lines using Views so
 * the library doesn't need an icon asset / SVG dependency for this
 * particular glyph. Consumers can replace it entirely via
 * `<Stories renderCloseButton={...}>`.
 */
function StoryCloseButtonComponent({
  onPress,
  color = '#FFFFFF',
  size = 20,
}: Props) {
  const half = size / 2;
  const thickness = 2;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Close"
      hitSlop={HIT_SLOP}
      onPress={onPress}
      testID="storyModalClose">
      <View style={{ width: size, height: size }}>
        <View
          style={[
            styles.bar,
            {
              top: half - thickness / 2,
              width: size,
              height: thickness,
              backgroundColor: color,
              transform: [{ rotate: '45deg' }],
            },
          ]}
        />
        <View
          style={[
            styles.bar,
            {
              top: half - thickness / 2,
              width: size,
              height: thickness,
              backgroundColor: color,
              transform: [{ rotate: '-45deg' }],
            },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    borderRadius: 1,
  },
});

export const StoryCloseButton = memo(StoryCloseButtonComponent);
