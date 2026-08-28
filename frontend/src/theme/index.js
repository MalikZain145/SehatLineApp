// src/theme/index.js

export const COLORS = {
  // ---- Brand palette ----
  // TEAL is the primary: brand identity, buttons, active states, key highlights.
  // MINT is the secondary: backgrounds, icon containers, subtle accents.
  // DARK SLATE carries headings and body text for strong contrast on white.
  primary: '#0BAA9D',        // TEAL
  secondary: '#0BAA9D',      // TEAL (kept equal so gradients read as one hue)
  accent: '#C8F3E7',         // MINT

  // Tints of the primary, light → dark.
  tealDark: '#089082',
  teal: '#0BAA9D',
  // Dark slate used by the doctor portal notification button + dark accents.
  dark: '#1F2937',
  tealLight: '#5FC9BF',
  mint: '#C8F3E7',
  mintLight: '#E4F9F3',
  mintLightest: '#F2FCF9',

  // Legacy aliases — older screens still import these names.
  navy: '#1F2937',
  navyDark: '#1F2937',
  cyan: '#0BAA9D',
  cyanLight: '#5FC9BF',
  cyanLighter: '#C8F3E7',
  cyanLightest: '#E4F9F3',

  // ---- Backgrounds ----
  // The PAGE is a soft mint tint (not stark white) so white cards sit on it with
  // gentle depth and headers (transparent) blend into it. Cards stay pure white.
  background: '#EEF6F3',
  backgroundSecondary: '#E6F2EE',
  card: '#FFFFFF',
  surface: '#F2FCF9',

  // ---- Text ----
  text: '#1F2937',           // DARK SLATE
  textSecondary: '#4B5563',
  textLight: '#6B7280',
  white: '#FFFFFF',

  // Status Colors
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#0BAA9D',

  // Borders
  border: '#E2E8F0',
  borderLight: '#F0F4F8',

  // Healthcare Gradients
  gradientStart: '#0BAA9D',
  gradientEnd: '#089082',

  // Emergency
  emergency: '#EF4444',
  emergencyLight: '#FEE2E2',

  // Queue
  queue: '#3B82F6',
  queueLight: '#DBEAFE',

  // Appointment
  appointment: '#8B5CF6',
  appointmentLight: '#EDE9FE',

  // Pharmacy
  pharmacy: '#10B981',
  pharmacyLight: '#DCFCE7',

  // AI
  ai: '#0BAA9D',
  aiLight: '#CAF0F8',

  // Reports
  reports: '#F59E0B',
  reportsLight: '#FEF3C7',

  // Shadows
  shadow: 'rgba(0,0,0,0.08)',

  // Category Colors
  care: '#FF6B6B',
  careLight: '#FFE8E8',
  kids: '#4ECDC4',
  kidsLight: '#E0F7F5',
  skin: '#FFB347',
  skinLight: '#FFF0E0',
  mind: '#A29BFE',
  mindLight: '#EDE9FE',

  // Doctor Card Colors
  doctorCardBg: '#FFFFFF',
  doctorCardBorder: '#E2E8F0',

  // Appointment Status
  upcoming: '#0BAA9D',
  upcomingLight: '#CAF0F8',
  completed: '#10B981',
  completedLight: '#DCFCE7',
  cancelled: '#EF4444',
  cancelledLight: '#FEE2E2',

  // Price Tag
  priceBg: '#F0F4F8',
  priceText: '#1F2937',

  // Button Colors
  changeBg: '#0BAA9D',
  changeText: '#FFFFFF',
  bookBg: '#0BAA9D',
  bookText: '#FFFFFF',
  rescheduleBg: '#0BAA9D',
  rescheduleText: '#FFFFFF',
  viewProfileBg: 'transparent',
  viewProfileText: '#0BAA9D',

  // See All
  seeAll: '#0BAA9D',

  // View Details
  viewDetails: '#0BAA9D',

  // Notification Badge
  badge: '#EF4444',

  // Lab Result Banner
  labResultBg: '#0BAA9D',
  labResultText: '#FFFFFF',

  // Avatar Colors
  avatar1: '#0BAA9D',
  avatar2: '#089082',
  avatar3: '#1F2937',
  avatar4: '#1F2937',
  avatar5: '#48CAE4',
  avatar6: '#90E0EF',

  // Shadow Colors
  shadowLight: 'rgba(0,0,0,0.04)',
  shadowMedium: 'rgba(0,0,0,0.08)',
  shadowDark: 'rgba(0,0,0,0.12)',
};

export const SIZES = {
  // Spacing
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,

  // Border Radius
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 16,
  radiusXl: 24,
  radiusFull: 999,

  // Font Sizes
  h1: 28,
  h2: 24,
  h3: 20,
  h4: 18,
  h5: 16,

  body: 14,
  bodySmall: 13,

  small: 12,
  xSmall: 10,

  // Icon Sizes
  iconSmall: 16,
  iconMedium: 20,
  iconLarge: 24,
  iconXLarge: 28,

  // Component Sizes
  avatarSmall: 32,
  avatarMedium: 40,
  avatarLarge: 48,
  avatarXLarge: 56,

  buttonHeight: 48,
  inputHeight: 44,
  tabHeight: 56,
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  medium: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },

  large: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },

  card: {
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },

  button: {
    shadowColor: '#0BAA9D',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },

  none: {
    shadowColor: 'transparent',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
};

export const FONTS = {
  // Font Families
  regular: 'System',
  medium: 'System',
  semibold: 'System',
  bold: 'System',

  // Font Styles
  h1: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  small: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  smallMedium: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  caption: {
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 14,
    letterSpacing: 0.3,
  },
};

export const SPACING = {
  // Padding
  p0: 0,
  p1: 4,
  p2: 8,
  p3: 12,
  p4: 16,
  p5: 20,
  p6: 24,
  p7: 32,
  p8: 40,

  // Margin
  m0: 0,
  m1: 4,
  m2: 8,
  m3: 12,
  m4: 16,
  m5: 20,
  m6: 24,
  m7: 32,
  m8: 40,

  // Gap
  gap1: 4,
  gap2: 8,
  gap3: 12,
  gap4: 16,
  gap5: 20,
  gap6: 24,
};

export default {
  COLORS,
  SIZES,
  SHADOWS,
  FONTS,
  SPACING,
};
