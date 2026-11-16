"""Regenerate SoulSpace iOS app icons + launch splash from www/assets/soulspace-icon.svg.
Requires: cairosvg, Pillow. Run from the SoulSpace project root:
  python3 tools/generate-ios-icons.py
Icons are rendered opaque (iOS rejects alpha in app icons): the SVG is
composited onto its own background colour so the rounded corners blend.
"""
import io, os, json
from PIL import Image
import cairosvg

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SVG = open(os.path.join(ROOT, "www/assets/soulspace-icon.svg")).read()
BG = (232, 238, 229)      # #E8EEE5, the icon tile colour
SHELL = (245, 243, 239)   # #F5F3EF, the app shell / launch colour

def render(svg, size):
    png = cairosvg.svg2png(bytestring=svg.encode(), output_width=size, output_height=size)
    rgba = Image.open(io.BytesIO(png)).convert("RGBA")
    out = Image.new("RGB", (size, size), BG)
    out.paste(rgba, (0, 0), rgba)
    return out

ICONSET = os.path.join(ROOT, "ios/App/App/Assets.xcassets/AppIcon.appiconset")
# (idiom, size_points, scale, filename suffix)
ENTRIES = [
    ("iphone", "20x20", "2x", 40, "AppIcon-20@2x.png"),
    ("iphone", "20x20", "3x", 60, "AppIcon-20@3x.png"),
    ("iphone", "29x29", "2x", 58, "AppIcon-29@2x.png"),
    ("iphone", "29x29", "3x", 87, "AppIcon-29@3x.png"),
    ("iphone", "40x40", "2x", 80, "AppIcon-40@2x.png"),
    ("iphone", "40x40", "3x", 120, "AppIcon-40@3x.png"),
    ("iphone", "60x60", "2x", 120, "AppIcon-60@2x.png"),
    ("iphone", "60x60", "3x", 180, "AppIcon-60@3x.png"),
    ("ipad", "20x20", "1x", 20, "AppIcon-20-ipad.png"),
    ("ipad", "20x20", "2x", 40, "AppIcon-20@2x-ipad.png"),
    ("ipad", "29x29", "1x", 29, "AppIcon-29-ipad.png"),
    ("ipad", "29x29", "2x", 58, "AppIcon-29@2x-ipad.png"),
    ("ipad", "40x40", "1x", 40, "AppIcon-40-ipad.png"),
    ("ipad", "40x40", "2x", 80, "AppIcon-40@2x-ipad.png"),
    ("ipad", "76x76", "1x", 76, "AppIcon-76-ipad.png"),
    ("ipad", "76x76", "2x", 152, "AppIcon-76@2x-ipad.png"),
    ("ipad", "83.5x83.5", "2x", 167, "AppIcon-83.5@2x-ipad.png"),
    ("ios-marketing", "1024x1024", "1x", 1024, "AppIcon-1024.png"),
]
images = []
for idiom, size, scale, px, fn in ENTRIES:
    render(SVG, px).save(os.path.join(ICONSET, fn))
    images.append({"filename": fn, "idiom": idiom, "scale": scale, "size": size})
    print(fn, px)
old = os.path.join(ICONSET, "AppIcon-512@2x.png")
if os.path.exists(old):
    os.remove(old)
contents = {"images": images, "info": {"author": "xcode", "version": 1}}
with open(os.path.join(ICONSET, "Contents.json"), "w") as f:
    json.dump(contents, f, indent=2)
    f.write("\n")

# Launch splash: SoulSpace tile centred on the shell colour, 2732x2732.
SPLASH = os.path.join(ROOT, "ios/App/App/Assets.xcassets/Splash.imageset")
tile = render(SVG, 1100)
canvas = Image.new("RGB", (2732, 2732), SHELL)
canvas.paste(tile, ((2732 - 1100) // 2, (2732 - 1100) // 2))
for fn in ("splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"):
    canvas.save(os.path.join(SPLASH, fn))
    print(fn)
print("done")
