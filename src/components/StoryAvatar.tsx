import React, { memo, useId } from 'react';
import { Image, StyleSheet, Text, TextStyle, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import type {
  AvatarImageRenderState,
  StoryUser,
} from '../types';

interface Props {
  source: StoryUser['avatarSource'];
  name?: string;
  seen?: boolean;
  size: number;
  ringColors: string[];
  /** Padding between ring stroke and the inner image, in px. Default 3. */
  ringPadding?: number;
  /** Stroke width of the ring. Default 2. */
  ringStrokeWidth?: number;
  showName?: boolean;
  nameTextStyle?: TextStyle;
  /** Optional override for the inner image — useful for FastImage. */
  renderImage?: (state: AvatarImageRenderState) => React.ReactNode;
  onPress: () => void;
}

const NAME_GAP = 6;
const NAME_LABEL_MAX_WIDTH = 80;

function StoryAvatarComponent(props: Props) {
  const {
    source,
    name,
    seen = false,
    size,
    ringColors,
    ringPadding = 3,
    ringStrokeWidth = 2,
    showName = false,
    nameTextStyle,
    renderImage,
    onPress,
  } = props;

  const imageDiameter = size - 2 * ringStrokeWidth - 2 * ringPadding;
  const ringRadius = (size - ringStrokeWidth) / 2;
  const hasGradient = ringColors.length > 1;
  const gradientId = `story-ring-${useId()}`;

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      <View style={[styles.wrapper, { width: size }]}>
        <Svg width={size} height={size} style={styles.svgAbsolute}>
          {hasGradient && (
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                {ringColors.map((c, i) => (
                  <Stop
                    key={i}
                    offset={String(i / (ringColors.length - 1))}
                    stopColor={c}
                  />
                ))}
              </LinearGradient>
            </Defs>
          )}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={ringRadius}
            stroke={hasGradient ? `url(#${gradientId})` : ringColors[0]}
            strokeWidth={ringStrokeWidth}
            fill="none"
            opacity={seen ? 0.4 : 1}
          />
        </Svg>
        <View
          style={[
            styles.imageContainer,
            {
              width: imageDiameter,
              height: imageDiameter,
              borderRadius: imageDiameter / 2,
              margin: ringStrokeWidth + ringPadding,
            },
          ]}>
          {renderImage ? (
            renderImage({ source, size: imageDiameter })
          ) : (
            <Image source={source} style={styles.image} />
          )}
        </View>
        {showName && name ? (
          <Text
            allowFontScaling={false}
            numberOfLines={2}
            ellipsizeMode="tail"
            style={[styles.name, nameTextStyle]}>
            {name}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  svgAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  imageContainer: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  name: {
    marginTop: NAME_GAP,
    maxWidth: NAME_LABEL_MAX_WIDTH,
    textAlign: 'center',
  },
});

export const StoryAvatar = memo(StoryAvatarComponent);
