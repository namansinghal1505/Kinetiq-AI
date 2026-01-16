import { Platform, StyleSheet } from 'react-native';
import { colors } from './colors';

export { colors };
export { ThemeProvider, useTheme, lightColors, darkColors } from './ThemeContext';
export type { ThemeColors } from './ThemeContext';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const shadows = StyleSheet.create({
  sm: Platform.select({
    web: {
      boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
    },
    default: {
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
  }) as any,
  md: Platform.select({
    web: {
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    },
    default: {
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
  }) as any,
  lg: Platform.select({
    web: {
      boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.15)',
    },
    default: {
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
    },
  }) as any,
});

export const theme = {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  shadows,
};

export type Theme = typeof theme;
