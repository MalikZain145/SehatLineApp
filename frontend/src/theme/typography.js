// Typography scale.
//
// Auth screens were drifting (10, 12, 13, 13.5, 14, 14.5, 15, 16, 18, 22, 24…),
// which reads as sloppy. This is the single ladder every screen pulls from —
// each step is a clear jump, and the whole set is one notch smaller than the
// old values so forms fit without scrolling.
//
//   ...  fontSize: FONT.body

export const FONT = {
  tiny: 10,      // badges, superscript labels
  caption: 11,   // helper text under inputs, errors
  small: 12,     // secondary text, hints
  label: 12.5,   // field labels
  body: 14,      // inputs, body copy, buttons
  subtitle: 15,  // section subheads
  title: 17,     // screen/step titles
  display: 20,   // hero numbers (OTP digits, big headings)
};

// Matching weights, so "bold" means the same thing everywhere.
export const WEIGHT = {
  regular: '500',
  medium: '600',
  bold: '700',
  heavy: '800',
  black: '900',
};

export default { FONT, WEIGHT };
