import React, { memo, useCallback } from 'react';
import {
  FlatList,
  ListRenderItem,
  StyleSheet,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { StoryAvatar } from './StoryAvatar';
import type {
  AvatarImageRenderState,
  SeenProgress,
  StoryUser,
} from '../types';

interface Props {
  users: StoryUser[];
  seen: SeenProgress;
  avatarBorderColors: string[];
  avatarSeenBorderColors: string[];
  avatarSize: number;
  showName: boolean;
  nameTextStyle?: TextStyle;
  containerStyle?: ViewStyle;
  renderAvatarImage?: (state: AvatarImageRenderState) => React.ReactNode;
  onAvatarPress: (userId: string) => void;
}

function StoryAvatarListComponent(props: Props) {
  const {
    users,
    seen,
    avatarBorderColors,
    avatarSeenBorderColors,
    avatarSize,
    showName,
    nameTextStyle,
    containerStyle,
    renderAvatarImage,
    onAvatarPress,
  } = props;

  // A user is "fully seen" only once the last slide has been marked viewed.
  const isUserSeen = useCallback(
    (user: StoryUser) => {
      const lastSlideId = user.stories[user.stories.length - 1]?.id;
      return lastSlideId !== undefined && seen[user.id] === lastSlideId;
    },
    [seen]
  );

  const renderItem: ListRenderItem<StoryUser> = useCallback(
    ({ item }) => {
      const userSeen = isUserSeen(item);
      return (
        <StoryAvatar
          source={item.avatarSource}
          name={item.name}
          seen={userSeen}
          size={avatarSize}
          ringColors={userSeen ? avatarSeenBorderColors : avatarBorderColors}
          showName={showName}
          nameTextStyle={nameTextStyle}
          renderImage={renderAvatarImage}
          onPress={() => onAvatarPress(item.id)}
        />
      );
    },
    [
      isUserSeen,
      avatarSize,
      avatarBorderColors,
      avatarSeenBorderColors,
      showName,
      nameTextStyle,
      renderAvatarImage,
      onAvatarPress,
    ]
  );

  const keyExtractor = useCallback((user: StoryUser) => user.id, []);

  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={users}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={[styles.list, containerStyle]}
      testID="storiesAvatarList"
    />
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
    paddingHorizontal: 16,
  },
});

export const StoryAvatarList = memo(StoryAvatarListComponent);
