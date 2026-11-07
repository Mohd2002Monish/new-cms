import { Platform } from 'react-native';

export const typography = {
  fontSerif: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    default: 'serif',
  }),
  fontSans: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'sans-serif',
  }),
  
  sizes: {
    hero: 28,
    display: 22,
    title: 18,
    headline: 16,
    body: 15,
    callout: 14,
    caption: 12,
    micro: 10,
  },
  
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    heavy: '800',
  },
  
  lineHeights: {
    hero: 34,
    display: 28,
    title: 24,
    headline: 22,
    body: 22,
    callout: 20,
    caption: 16,
    micro: 14,
  },
};

