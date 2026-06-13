import manifestRaw from '../../public/manifest.webmanifest?raw';

describe('web manifest', () => {
  const manifest = JSON.parse(manifestRaw);

  it('declares the installability fields', () => {
    expect(manifest.name).toBe('Math Quizz');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('./');
    expect(manifest.theme_color).toBe('#3b82f6');
  });

  it('lists 192 + 512 PNG icons and a maskable icon', () => {
    const sizes = manifest.icons
      .filter((icon: { type: string }) => icon.type === 'image/png')
      .map((icon: { sizes: string }) => icon.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect(
      manifest.icons.some((icon: { purpose?: string }) => icon.purpose === 'maskable'),
    ).toBe(true);
  });
});
