from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
source = root / "screenshots"
files = [
    source / "01-cadastro-mobile.png",
    source / "02-tarefas-mobile.png",
    source / "03-jogos-mobile.png",
    source / "04-caca-estrelas-mobile.png",
    source / "05-memoria-mobile.png",
    source / "06-padroes-mobile.png",
    source / "07-recompensas-mobile.png",
    source / "08-painel-responsavel-mobile.png",
    source / "09-nova-tarefa-mobile.png",
    source / "10-jogos-tablet.png",
    source / "11-padroes-tablet.png",
]
thumbs = []
for file in files:
    image = Image.open(file).convert("RGB")
    image.thumbnail((360, 700), Image.Resampling.LANCZOS)
    thumbs.append((file.name, image.copy()))

columns = 4
cell_w, cell_h = 390, 760
rows = (len(thumbs) + columns - 1) // columns
sheet = Image.new("RGB", (columns * cell_w, rows * cell_h), "#e9eee9")
draw = ImageDraw.Draw(sheet)
font = ImageFont.load_default(size=18)
for index, (name, image) in enumerate(thumbs):
    col, row = index % columns, index // columns
    x = col * cell_w + (cell_w - image.width) // 2
    y = row * cell_h + 40
    draw.text((col * cell_w + 15, row * cell_h + 12), name, fill="#19352e", font=font)
    sheet.paste(image, (x, y))

output = source / "contact-sheet.png"
sheet.save(output, optimize=True)
print(output)
