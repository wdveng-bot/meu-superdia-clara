from pathlib import Path
from PIL import Image, ImageDraw
import math

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "icons"
OUT.mkdir(exist_ok=True)


def star_points(cx, cy, outer, inner, count=5):
    points = []
    for index in range(count * 2):
        radius = outer if index % 2 == 0 else inner
        angle = -math.pi / 2 + index * math.pi / count
        points.append((cx + math.cos(angle) * radius, cy + math.sin(angle) * radius))
    return points


def make_icon(size):
    scale = 4
    canvas = size * scale
    image = Image.new("RGB", (canvas, canvas), "#0f6b57")
    draw = ImageDraw.Draw(image)
    margin = int(canvas * 0.12)
    draw.rounded_rectangle(
        (margin, margin, canvas - margin, canvas - margin),
        radius=int(canvas * 0.22),
        fill="#fffaf0",
        outline="#19352e",
        width=max(4, int(canvas * 0.025)),
    )
    cx = canvas / 2
    cy = canvas / 2
    outer = canvas * 0.25
    inner = outer * 0.46
    offset = canvas * 0.035
    draw.polygon(star_points(cx + offset, cy + offset, outer, inner), fill="#19352e")
    draw.polygon(star_points(cx, cy, outer, inner), fill="#f5b642", outline="#19352e")
    image.resize((size, size), Image.Resampling.LANCZOS).save(OUT / f"icon-{size}.png", optimize=True)


for icon_size in (192, 512):
    make_icon(icon_size)
    print(OUT / f"icon-{icon_size}.png")
