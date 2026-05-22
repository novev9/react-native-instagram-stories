import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StoryCloseButton } from './StoryCloseButton';
import type { StoryHeaderRenderState } from '../types';

interface Props extends StoryHeaderRenderState {
  /** Override the close button. Receives `close` so the consumer can
   *  wire any control they want. */
  renderCloseButton?: (state: StoryHeaderRenderState) => React.ReactNode;
}

/**
 * Default story header: user name (left) + close button (right).
 * Replaceable as a whole via `<Stories renderHeader>` or partially via
 * `<Stories renderCloseButton>`.
 */
function StoryHeaderComponent(props: Props) {
  const { user, close, renderCloseButton, activeSlideIndex } = props;
  return (
    <View style={styles.row} pointerEvents="box-none">
      <Text
        allowFontScaling={false}
        numberOfLines={1}
        style={styles.title}
        testID="storyHeaderTitle">
        {user.name ?? ''}
      </Text>
      {renderCloseButton ? (
        renderCloseButton({ user, activeSlideIndex, close })
      ) : (
        <StoryCloseButton onPress={close} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 12,
  },
});

export const StoryHeader = memo(StoryHeaderComponent);
