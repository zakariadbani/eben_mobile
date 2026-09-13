import {
  getSplashLogoLayout,
  SPLASH_LOGO_ASPECT_RATIO,
  SPLASH_LOGO_MAX_WIDTH,
  SPLASH_LOGO_MIN_SIDE_MARGIN,
} from '../splashLogo';

describe('getSplashLogoLayout', () => {
  it.each([
    // [window width, window height, logo width, logo height]
    [360, 800, 169, 52],
    [412, 915, 194, 59],
    // 1344 × 2992 px emulator at 3× density
    [448, 997, 211, 65],
  ])('fits the whole logotype, centred with margins, on a %d dp wide phone', (width, height, logoWidth, logoHeight) => {
    const layout = getSplashLogoLayout(width, height);

    expect(layout.width).toBe(logoWidth);
    expect(layout.height).toBe(logoHeight);
    expect(Math.abs(layout.width / layout.height - SPLASH_LOGO_ASPECT_RATIO)).toBeLessThan(0.05);
    expect((width - layout.width) / 2).toBeGreaterThanOrEqual(SPLASH_LOGO_MIN_SIDE_MARGIN);
    // Figma: logotype centre at ~52 % of the height.
    expect((height + layout.offsetTop) / 2 / height).toBeCloseTo(0.5225, 2);
  });

  it('caps the logotype on tablets and keeps side margins on very narrow windows', () => {
    expect(getSplashLogoLayout(1024, 1366).width).toBe(SPLASH_LOGO_MAX_WIDTH);
    expect(getSplashLogoLayout(60, 200).width).toBe(12);
    expect(getSplashLogoLayout(0, 0)).toEqual({ width: 0, height: 0, scale: 0, offsetTop: 0 });
  });

  it('scales from the 360 dp Figma frame', () => {
    expect(getSplashLogoLayout(360, 800).scale).toBeCloseTo(1, 1);
    expect(getSplashLogoLayout(448, 997).scale).toBeGreaterThan(1.2);
  });
});
