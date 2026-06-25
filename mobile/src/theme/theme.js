import { DefaultTheme, DarkTheme } from '@react-navigation/native';
import { colors, darkColors } from '../utils/colors';

export const lightTheme = {
  dark: false,
  colors: colors,
  navigation: {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.secondary,
    },
  },
  paper: {
    roundness: 12,
    colors: {
      primary: colors.primary,
      secondary: colors.secondary,
      background: colors.background,
      surface: colors.card,
      onSurface: colors.text,
      outline: colors.border,
    },
  },
};

export const darkTheme = {
  dark: true,
  colors: darkColors,
  navigation: {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: darkColors.primary,
      background: darkColors.background,
      card: darkColors.card,
      text: darkColors.text,
      border: darkColors.border,
      notification: darkColors.secondary,
    },
  },
  paper: {
    roundness: 12,
    colors: {
      primary: darkColors.primary,
      secondary: darkColors.secondary,
      background: darkColors.background,
      surface: darkColors.card,
      onSurface: darkColors.text,
      outline: darkColors.border,
    },
  },
};
