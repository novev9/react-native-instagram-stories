/* eslint-disable react-hooks/immutability, react-hooks/refs --
   Reanimated shared values are designed to be mutated through their
   `.value` setter. React Compiler's lint plugin doesn't model that as
   separate-from-React state and flags every assignment as a bail-out.
   Silenced file-wide because the worklet style is mathematically pure. */
import React from 'react';
import { Platform } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { CUBE_ANGLE, CUBE_RATIO } from '../modal/constants';

/**
 * Single page of the cube carousel. Computes the cube transform from
 * the shared `translateX` and its slot index. Multiple slots stack at
 * `position: absolute, top: 0, left: 0` — only the transform
 * differentiates their on-screen position.
 *
 * The double-translateX sandwich around `rotateY` simulates an
 * inner-edge pivot without relying on `transformOrigin` (which is
 * unreliable on Reanimated 4 + Fabric). At mid-swipe the two visible
 * faces meet at the inner edge with no gap — a true 3D cube vertex
 * rather than the "scale-0.49 carousel cube" you get when you rotate
 * around the centre.
 *
 *   transform = [
 *     { perspective: width },         // close camera → strong 3D feel
 *     { translateX: tx },             // pre-rotation shift (carousel)
 *     { rotateY: `${rot}rad` },       // rotate around View centre
 *     { translateX: translateX1 },    // post-rotation edge correction
 *   ]
 */

interface Props {
  userIdx: number;
  translateX: SharedValue<number>;
  width: number;
  /** Whether this slot is the active user or one of its immediate
   *  neighbours. Used to gate content mounting — distant slots render
   *  null children. */
  isNear: boolean;
  children: React.ReactNode;
}

function StoryCubeSlotInner(props: Props) {
  const { userIdx, translateX, width, isNear, children } = props;

  const style = useAnimatedStyle(() => {
    const offset = userIdx + translateX.value / width;
    const absOffset = Math.abs(offset);
    if (absOffset > 1.05) {
      return {
        opacity: 0,
        transform: [{ translateX: 99999 }],
      };
    }
    const clamped = Math.max(-1, Math.min(1, offset));
    const tx = (clamped * width) / CUBE_RATIO;
    const rot = clamped * CUBE_ANGLE;
    // Edge-pivot correction via law of sines.
    const alpha = Math.abs(rot);
    const gamma = CUBE_ANGLE - alpha;
    const wEdge =
      (width / 2) * (1 - Math.sin(gamma) / Math.sin(CUBE_ANGLE));
    const translateX1 = rot > 0 ? wEdge : -wEdge;
    const z = Math.round(
      interpolate(absOffset, [0, 1], [100, 0], Extrapolation.CLAMP)
    );
    const op = interpolate(
      absOffset,
      [0, 0.98, 1.02],
      [1, 1, 0],
      Extrapolation.CLAMP
    );
    return {
      opacity: op,
      zIndex: z,
      elevation: Platform.OS === 'android' ? z / 10 : undefined,
      transform: [
        { perspective: width },
        { translateX: tx },
        { rotateY: `${rot}rad` },
        { translateX: translateX1 },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          bottom: 0,
          width,
          backfaceVisibility:
            Platform.OS === 'ios' ? 'hidden' : 'visible',
        },
        style,
      ]}>
      {isNear ? children : null}
    </Animated.View>
  );
}

export const StoryCubeSlot = React.memo(StoryCubeSlotInner);
