"""Regenerate SoulSpace Android launcher + splash icons from www/assets/soulspace-icon.svg.
Requires: cairosvg, Pillow. Run from the SoulSpace project root:
  python3 tools/generate-icons.py
"""
import io, os
from PIL import Image, ImageDraw
import cairosvg

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SVG = open(os.path.join(ROOT, "www/assets/soulspace-icon.svg")).read()
# Foreground variant: transparent background, artwork scaled into the
# adaptive-icon safe zone (centre 66dp of 108dp).
FG_SVG = SVG.replace('<rect width="512" height="512" rx="124" fill="#e8eee5"/>\n', '')
FG_SVG = FG_SVG.replace('<circle', '<g transform="translate(256 256) scale(0.72) translate(-256 -256)"><circle', 1)
FG_SVG = FG_SVG.replace('</svg>', '</g></svg>')

def render(svg, size):
    png = cairosvg.svg2png(bytestring=svg.encode(), output_width=size, output_height=size)
    return Image.open(io.BytesIO(png)).convert("RGBA")

def circle_mask(size):
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).ellipse((0, 0, size - 1, size - 1), fill=255)
    return m

RES = os.path.join(ROOT, "android/app/src/main/res")
DENS = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
for dens, px in DENS.items():
    d = os.path.join(RES, "mipmap-" + dens)
    render(SVG, px).save(os.path.join(d, "ic_launcher.png"))
    rnd = render(SVG, px)
    rnd.putalpha(circle_mask(px))
    rnd.save(os.path.join(d, "ic_launcher_round.png"))
    fg_px = int(px * 2.25)  # 108dp foreground
    render(FG_SVG, fg_px).save(os.path.join(d, "ic_launcher_foreground.png"))
    print(dens, px, fg_px)

render(FG_SVG, 288).save(os.path.join(RES, "drawable/splash_icon.png"))
os.makedirs(os.path.join(ROOT, "assets"), exist_ok=True)
render(SVG, 512).save(os.path.join(ROOT, "assets/play-store-icon-512.png"))
print("done")
