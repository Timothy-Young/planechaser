#!/usr/bin/env python3
"""Rasterise public/logo.svg into the PNG icons the web app manifest needs.

Run from the planechaser/ directory:

    python3 scripts/generate-icons.py

Outputs public/icons/*.png. Committed to the repo so builds never depend on
this script; re-run it only when logo.svg changes.

Deliberately dependency-free (no Pillow/cairosvg) — the logo is a handful of
circles and triangles, so a small supersampling rasteriser is cheaper than
adding an image toolchain to the project.
"""

import os
import struct
import zlib

# --- Shape definitions, mirroring public/logo.svg on its 512x512 viewBox ----

BG = (0x0A, 0x08, 0x13)  # --bg, Blind Eternities theme

ACCENT = (0xC0, 0x84, 0xFC)
DEEP = (0x7C, 0x3A, 0xED)
WHITE = (0xFF, 0xFF, 0xFF)

# (kind, params..., colour, alpha)
SHAPES = [
    ("ring", 256, 256, 240, 12, ACCENT, 0.30),
    ("ring", 256, 256, 200, 6, ACCENT, 0.15),
    ("poly", [(256, 80), (320, 256), (256, 432), (192, 256)], ACCENT, 0.90),
    ("poly", [(80, 256), (192, 220), (192, 292)], DEEP, 0.80),
    ("poly", [(432, 256), (320, 220), (320, 292)], DEEP, 0.80),
    ("disc", 256, 256, 52, ACCENT, 0.25),
    ("disc", 256, 256, 32, ACCENT, 0.50),
    ("disc", 256, 256, 14, WHITE, 0.90),
    ("disc", 256, 60, 8, ACCENT, 0.60),
    ("disc", 256, 452, 8, ACCENT, 0.60),
    ("disc", 60, 256, 8, DEEP, 0.60),
    ("disc", 452, 256, 8, DEEP, 0.60),
]

VIEWBOX = 512.0


def render(size, content_scale=1.0):
    """Render the logo into a `size` x `size` RGB buffer of floats.

    content_scale < 1 shrinks the artwork toward the centre, leaving padding —
    used for the maskable icon, whose safe zone is the middle 80%.
    """
    buf = [[float(c) for c in BG] for _ in range(size * size)]
    k = size / VIEWBOX * content_scale
    off = size * (1 - content_scale) / 2.0

    def to_px(v):
        return v * k + off

    def blend(idx, colour, alpha):
        px = buf[idx]
        for ch in range(3):
            px[ch] = px[ch] * (1 - alpha) + colour[ch] * alpha

    for shape in SHAPES:
        kind = shape[0]

        if kind in ("disc", "ring"):
            if kind == "disc":
                _, cx, cy, r, colour, alpha = shape
                r_out, r_in = r, 0.0
            else:
                _, cx, cy, r, sw, colour, alpha = shape
                r_out, r_in = r + sw / 2.0, r - sw / 2.0

            pcx, pcy = to_px(cx), to_px(cy)
            pr_out, pr_in = r_out * k, r_in * k
            x0 = max(0, int(pcx - pr_out) - 1)
            x1 = min(size - 1, int(pcx + pr_out) + 1)
            y0 = max(0, int(pcy - pr_out) - 1)
            y1 = min(size - 1, int(pcy + pr_out) + 1)
            out_sq, in_sq = pr_out * pr_out, pr_in * pr_in

            for y in range(y0, y1 + 1):
                dy = y + 0.5 - pcy
                dy_sq = dy * dy
                row = y * size
                for x in range(x0, x1 + 1):
                    dx = x + 0.5 - pcx
                    d_sq = dx * dx + dy_sq
                    if d_sq <= out_sq and d_sq >= in_sq:
                        blend(row + x, colour, alpha)

        elif kind == "poly":
            _, pts, colour, alpha = shape
            ppts = [(to_px(px), to_px(py)) for px, py in pts]
            xs = [p[0] for p in ppts]
            ys = [p[1] for p in ppts]
            x0 = max(0, int(min(xs)) - 1)
            x1 = min(size - 1, int(max(xs)) + 1)
            y0 = max(0, int(min(ys)) - 1)
            y1 = min(size - 1, int(max(ys)) + 1)
            n = len(ppts)

            for y in range(y0, y1 + 1):
                py = y + 0.5
                # Collect crossings of the scanline with each edge.
                spans = []
                for i in range(n):
                    ax, ay = ppts[i]
                    bx, by = ppts[(i + 1) % n]
                    if (ay > py) != (by > py):
                        t = (py - ay) / (by - ay)
                        spans.append(ax + t * (bx - ax))
                spans.sort()
                row = y * size
                for i in range(0, len(spans) - 1, 2):
                    sx = max(x0, int(spans[i] + 0.5))
                    ex = min(x1, int(spans[i + 1] - 0.5))
                    for x in range(sx, ex + 1):
                        blend(row + x, colour, alpha)

    return buf


def resample(src, src_size, dst_size):
    """Box/area-average downsample. src_size must be >= dst_size."""
    dst = [[0.0, 0.0, 0.0] for _ in range(dst_size * dst_size)]
    ratio = src_size / dst_size

    for dy in range(dst_size):
        sy0 = int(dy * ratio)
        sy1 = max(sy0 + 1, int((dy + 1) * ratio))
        for dx in range(dst_size):
            sx0 = int(dx * ratio)
            sx1 = max(sx0 + 1, int((dx + 1) * ratio))
            acc = [0.0, 0.0, 0.0]
            count = 0
            for sy in range(sy0, min(sy1, src_size)):
                row = sy * src_size
                for sx in range(sx0, min(sx1, src_size)):
                    px = src[row + sx]
                    acc[0] += px[0]
                    acc[1] += px[1]
                    acc[2] += px[2]
                    count += 1
            out = dst[dy * dst_size + dx]
            for ch in range(3):
                out[ch] = acc[ch] / count

    return dst


def write_png(path, buf, size):
    raw = bytearray()
    for y in range(size):
        raw.append(0)  # filter type 0 (None)
        row = y * size
        for x in range(size):
            px = buf[row + x]
            for ch in range(3):
                v = int(px[ch] + 0.5)
                raw.append(0 if v < 0 else (255 if v > 255 else v))

    def chunk(tag, data):
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")

    with open(path, "wb") as fh:
        fh.write(png)
    print(f"  wrote {path} ({size}x{size}, {len(png):,} bytes)")


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out_dir = os.path.join(here, "..", "public", "icons")
    os.makedirs(out_dir, exist_ok=True)

    # Supersample once at 3x the largest target, then area-average down.
    ss = 1536
    print("rendering standard icon...")
    hi = render(ss)
    for target in (512, 192):
        write_png(os.path.join(out_dir, f"icon-{target}.png"), resample(hi, ss, target), target)
    write_png(os.path.join(out_dir, "apple-touch-icon.png"), resample(hi, ss, 180), 180)

    # Maskable: artwork shrunk into the middle 80% safe zone, full-bleed bg.
    print("rendering maskable icon...")
    hi_mask = render(ss, content_scale=0.72)
    write_png(
        os.path.join(out_dir, "icon-maskable-512.png"),
        resample(hi_mask, ss, 512),
        512,
    )


if __name__ == "__main__":
    main()
