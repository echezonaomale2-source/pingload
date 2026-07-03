import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { dialog } from './dialog';

const MAX_BASE64_LENGTH = 350000;
const AVATAR_SIZE = 512;
const COMPRESS_STEPS = [0.72, 0.55, 0.4, 0.28];

/**
 * Cache-bust only remote URLs. Appending ?t= to data: URIs corrupts the image.
 */
export const withAvatarCacheBust = (uri) => {
  if (!uri || typeof uri !== 'string') return uri;
  if (uri.startsWith('data:')) return uri;
  const base = uri.split('?')[0];
  return `${base}?t=${Date.now()}`;
};

const processAsset = async (asset) => {
  let lastError = null;

  for (const compress of COMPRESS_STEPS) {
    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: AVATAR_SIZE, height: AVATAR_SIZE } }],
        { compress, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      if (!manipulated.base64) {
        lastError = new Error('Could not process the selected image.');
        continue;
      }

      const dataUri = `data:image/jpeg;base64,${manipulated.base64}`;
      if (dataUri.length <= MAX_BASE64_LENGTH) {
        return dataUri;
      }
      lastError = new Error('Image is too large after compression.');
    } catch (err) {
      lastError = err;
    }
  }

  dialog.error(
    'Image too large',
    lastError?.message || 'Please choose a smaller image and try again.'
  );
  return null;
};

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
    quality: 1,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  return processAsset(result.assets[0]);
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
    quality: 1,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  return processAsset(result.assets[0]);
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
