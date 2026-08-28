// BrandLogo — the SehatLine "SL" monogram. In dark mode the dark-slate "L"
// would vanish on a dark surface, so we swap to a variant whose L is white
// (the teal S is unchanged). Use this everywhere instead of requiring the
// logo image directly, so the logo stays visible in both themes.

import React from 'react';
import { Image } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

const LIGHT = require('../../assets/logo.png');
const DARK = require('../../assets/logo-dark.png');

// `light` forces the original teal + dark-slate logo regardless of the global
// theme — used on surfaces that are always light (e.g. the admin portal, which
// renders on a fixed light palette), so the logo can't go white-on-light.
export default function BrandLogo({ style, resizeMode = 'contain', light = false, ...rest }) {
  const { isDark } = useTheme();
  const useDark = isDark && !light;
  return <Image source={useDark ? DARK : LIGHT} style={style} resizeMode={resizeMode} {...rest} />;
}
