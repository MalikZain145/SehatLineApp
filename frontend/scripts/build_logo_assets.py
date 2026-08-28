#!/usr/bin/env python3
"""
Regenerate every logo asset from a single source image.

The assets kept drifting out of sync — the splash was showing the grey
silhouette, the icon still carried the old cyan/navy palette, and the
notification icon had vanished entirely. Deriving all of them here means
there's one place to change and no way for them to disagree.

    python3 scripts/build_logo_assets.py path/to/source.png

Source can be the raw artwork on a white background; it gets trimmed,
recoloured to the brand palette, and made transparent.
"""

import os
import sys
from PIL import Image

# Brand palette — must match src/theme/index.js
TEAL = (11, 170, 157)    # #0BAA9D  — the "S"
SLATE = (31, 41, 55)     # #1F2937  — the "L"

# The mark fills its canvas edge to edge. Padding it here *and* sizing the
# image element in the screens meant two independent knobs for one visual
# result — turn one and the other silently fights it. Screens own the size;
# the asset is just the artwork.
CANVAS_FILL = 0.98


def load_and_clean(path):
    """Trim the white margin, snap to the two brand colours, drop the white."""
    src = Image.open(path).convert('RGBA')
    px = src.load()
    w, h = src.size

    # Bounding box of anything that isn't near-white.
    minx, miny, maxx, maxy = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            if not (r > 240 and g > 240 and b > 240):
                minx, miny = min(minx, x), min(miny, y)
                maxx, maxy = max(maxx, x), max(maxy, y)

    art = src.crop((minx, miny, maxx + 1, maxy + 1))
    apx = art.load()
    aw, ah = art.size

    for y in range(ah):
        for x in range(aw):
            r, g, b, _ = apx[x, y]
            if r > 242 and g > 242 and b > 242:
                apx[x, y] = (255, 255, 255, 0)          # white → transparent
            else:
                # Green-dominant pixels are the "S"; everything else the "L".
                target = TEAL if (g > r + 20 and g > 60) else SLATE
                # Near-white edges get partial alpha so the curve stays smooth.
                alpha = 255 if (r < 225 or g < 225 or b < 225) else 110
                apx[x, y] = (*target, alpha)

    return art


def square(art, side, fill):
    """Centre the artwork on a transparent square, occupying `fill` of it."""
    target = int(side * fill)
    scale = min(target / art.width, target / art.height)
    resized = art.resize(
        (max(1, int(art.width * scale)), max(1, int(art.height * scale))),
        Image.LANCZOS,
    )
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.paste(
        resized,
        ((side - resized.width) // 2, (side - resized.height) // 2),
        resized,
    )
    return canvas


def on_white(img, side, fill):
    """Same, but flattened onto white — for the icon and splash."""
    canvas = Image.new('RGBA', (side, side), (255, 255, 255, 255))
    mark = square(img, side, fill)
    canvas.paste(mark, (0, 0), mark)
    return canvas.convert('RGB')


def silhouette(img, colour=(208, 213, 219)):
    """Flat grey copy — the welcome screen reveals colour over this."""
    out = img.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a > 20:
                px[x, y] = (*colour, a)
    return out


def main():
    if len(sys.argv) < 2:
        sys.exit(f'usage: {sys.argv[0]} <source.png>')

    source = sys.argv[1]
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    art = load_and_clean(source)
    print(f'artwork: {art.width}x{art.height}')

    # The mark every screen imports, plus the copy app.json resolves.
    logo = square(art, 512, CANVAS_FILL)
    for p in ('src/assets/logo.png', 'assets/logo.png'):
        logo.save(os.path.join(root, p), optimize=True)

    # Welcome screen: colour over a grey silhouette, revealed bottom-up.
    # No circular frame here, so it can breathe wider.
    welcome = square(art, 500, 0.94)
    welcome.save(os.path.join(root, 'src/assets/logo-transparent.png'), optimize=True)
    silhouette(welcome).save(os.path.join(root, 'src/assets/logo-empty.png'), optimize=True)

    # App icon — the OS masks the corners, so keep the mark well inside.
    on_white(art, 1024, 0.60).save(os.path.join(root, 'assets/sehatline-icon.png'), optimize=True)

    # Splash — lots of white around a modest mark.
    splash = on_white(art, 1284, 0.32)
    splash.save(os.path.join(root, 'assets/splash-native.png'), optimize=True)
    splash.save(os.path.join(root, 'assets/sehatline-splash.png'), optimize=True)

    # Notification icon — transparent; Android tints the silhouette anyway.
    square(art, 256, 0.86).save(os.path.join(root, 'assets/notification-icon.png'), optimize=True)

    print('\ngenerated:')
    for p in (
        'src/assets/logo.png', 'assets/logo.png',
        'src/assets/logo-transparent.png', 'src/assets/logo-empty.png',
        'assets/sehatline-icon.png', 'assets/splash-native.png',
        'assets/sehatline-splash.png', 'assets/notification-icon.png',
    ):
        full = os.path.join(root, p)
        print(f'  {p:<36} {os.path.getsize(full):>8,} b')


if __name__ == '__main__':
    main()
