/**
 * Layout of the EBEN logotype on the welcome splashes (`(auth)/loading.tsx`
 * and `(auth)/prestataire/loading.tsx`).
 *
 * Figma Loading-page_2 / _3 (360 × 800 dp frame): the `logo-white.png` bitmap
 * is ~47 % of the frame width, horizontally centred, with its centre at
 * ~52 % of the frame height; the "Bienvenue {name}" line sits above it.
 *
 * Sizes are explicit dp computed from the window: a percentage width plus
 * `aspectRatio` on the Image rendered the bitmap at its native size on device,
 * clipping the logotype to "EB".
 */

/** `assets/images/others/logo-white.png` is 614 × 188 px. */
export const SPLASH_LOGO_ASPECT_RATIO = 614 / 188;
/** Share of the window width taken by the logotype bitmap (Figma ≈ 339.6 / 720). */
export const SPLASH_LOGO_WIDTH_RATIO = 0.47;
/** Tablets / landscape: the logotype never grows past this width. */
export const SPLASH_LOGO_MAX_WIDTH = 280;
/** Smallest free margin kept on each side of the logotype. */
export const SPLASH_LOGO_MIN_SIDE_MARGIN = 24;
/** Logotype width in the 360 dp Figma frame — the PARTNERS label scales from it. */
export const SPLASH_LOGO_FIGMA_WIDTH = 360 * SPLASH_LOGO_WIDTH_RATIO;
/** Figma: centre of the logotype at 836 / 1600 of the frame height. */
export const SPLASH_LOGO_CENTER_RATIO = 836 / 1600;

export interface SplashLogoLayout {
  width: number;
  height: number;
  /** `width / SPLASH_LOGO_FIGMA_WIDTH` — 1 on a 360 dp phone. */
  scale: number;
  /**
   * Top margin that moves a vertically centred block holding only the
   * logotype down to the Figma centre line.
   */
  offsetTop: number;
}

export function getSplashLogoLayout(windowWidth: number, windowHeight: number): SplashLogoLayout {
  const safeWidth = Math.max(0, windowWidth);
  const fitWidth = Math.max(0, safeWidth - 2 * SPLASH_LOGO_MIN_SIDE_MARGIN);
  const width = Math.round(Math.min(safeWidth * SPLASH_LOGO_WIDTH_RATIO, SPLASH_LOGO_MAX_WIDTH, fitWidth));
  const height = Math.round(width / SPLASH_LOGO_ASPECT_RATIO);
  const offsetTop = Math.max(0, Math.round(2 * (SPLASH_LOGO_CENTER_RATIO - 0.5) * windowHeight));
  return { width, height, scale: width / SPLASH_LOGO_FIGMA_WIDTH, offsetTop };
}
