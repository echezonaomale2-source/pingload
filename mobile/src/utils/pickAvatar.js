import * as ImagePicker from 'expo-image-picker';
import { dialog } from './dialog';

const MAX_BASE64_LENGTH = 400000;

export const pickAvatarImage = async () => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    dialog.error('Permission needed', 'Please allow access to your photo library to upload an avatar.');
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.5,
    base64: true,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];
  const mime = asset.mimeType || 'image/jpeg';
  const base64 = asset.base64;

  if (!base64) {
    dialog.error('Error', 'Could not process the selected image.');
    return null;
  }

  const dataUri = `data:${mime};base64,${base64}`;

  if (dataUri.length > MAX_BASE64_LENGTH) {
    dialog.error('Image too large', 'Please choose a smaller image.');
    return null;
  }

  return dataUri;
};

export const takeAvatarPhoto = async () => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    dialog.error('Permission needed', 'Please allow camera access to take a profile photo.');
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.5,
    base64: true,
  });

  if (result.canceled || !result.assets?.[0]?.base64) {
    return null;
  }

  const asset = result.assets[0];
  const mime = asset.mimeType || 'image/jpeg';
  const dataUri = `data:${mime};base64,${asset.base64}`;

  if (dataUri.length > MAX_BASE64_LENGTH) {
    dialog.error('Image too large', 'Please try again with lower resolution.');
    return null;
  }

  return dataUri;
};

export const showAvatarPicker = async () => {
  const choice = await dialog.actionSheet({
    title: 'Profile Photo',
    options: [
      { label: 'Photo Library', onPress: () => {} },
      { label: 'Camera', onPress: () => {} },
    ],
  });
  if (!choice) return null;
  if (choice.label === 'Photo Library') return pickAvatarImage();
  if (choice.label === 'Camera') return takeAvatarPhoto();
  return null;
};
