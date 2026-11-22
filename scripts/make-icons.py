"""Draw BeepBeep icons. The applied mark is the gold barcode tile."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1] / "public"
ART = Path("/opt/cursor/artifacts")
GREEN = "#00843D"
DEEP = "#00573F"
GOLD = "#FFCD00"
WARM = "#FFB81C"
CREAM = "#FFFDF8"


def rounded(draw: ImageDraw.ImageDraw, box, radius: int, fill: str) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def bubble(draw: ImageDraw.ImageDraw, size: int) -> None:
    """Green tile, gold speech bubble, two bars for beep-beep."""
    scale = size / 64
    def r(value: float) -> int:
        return int(round(value * scale))
    rounded(draw, (0, 0, size - 1, size - 1), r(18), GREEN)
    rounded(draw, (r(10), r(12), r(54), r(44)), r(12), GOLD)
    rounded(draw, (r(18), r(38), r(30), r(50)), r(3), GOLD)
    rounded(draw, (r(22), r(20), r(28), r(36)), r(3), GREEN)
    rounded(draw, (r(34), r(20), r(40), r(36)), r(3), DEEP)


def barcode(draw: ImageDraw.ImageDraw, size: int) -> None:
    """Gold tile, four chunky green bars."""
    scale = size / 64
    def r(value: float) -> int:
        return int(round(value * scale))
    rounded(draw, (0, 0, size - 1, size - 1), r(18), GOLD)
    bars = [(14, 18, 6, 28), (24, 12, 8, 40), (36, 20, 5, 24), (45, 16, 6, 32)]
    for index, (x, y, w, h) in enumerate(bars):
        rounded(draw, (r(x), r(y), r(x + w), r(y + h)), r(3), DEEP if index % 2 else GREEN)


def double_bubble(draw: ImageDraw.ImageDraw, size: int) -> None:
    """Two speech bubbles, green then gold, side by side."""
    scale = size / 64
    def r(value: float) -> int:
        return int(round(value * scale))
    rounded(draw, (0, 0, size - 1, size - 1), r(18), CREAM)
    rounded(draw, (r(2), r(2), size - r(2), size - r(2)), r(16), GOLD)
    rounded(draw, (r(6), r(10), r(30), r(30)), r(8), GREEN)
    rounded(draw, (r(10), r(26), r(18), r(36)), r(2), GREEN)
    rounded(draw, (r(28), r(22), r(56), r(46)), r(8), DEEP)
    rounded(draw, (r(34), r(42), r(44), r(52)), r(2), DEEP)


def canvas(draw_fn, size: int) -> Image.Image:
    image = Image.new("RGB", (size, size), CREAM)
    draw_fn(ImageDraw.Draw(image), size)
    return image


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    ART.mkdir(parents=True, exist_ok=True)
    canvas(barcode, 192).save(ROOT / "pwa-192.png")
    canvas(barcode, 512).save(ROOT / "pwa-512.png")
    canvas(barcode, 180).save(ROOT / "apple-touch-icon.png")
    mask = Image.new("RGB", (512, 512), GOLD)
    draw = ImageDraw.Draw(mask)
    def placed(value: float) -> int:
        return int(round(80 + (value / 64) * 352))
    bars = [(14, 18, 6, 28), (24, 12, 8, 40), (36, 20, 5, 24), (45, 16, 6, 32)]
    for index, (x, y, bw, bh) in enumerate(bars):
        rounded(draw, (placed(x), placed(y), placed(x + bw), placed(y + bh)), placed(3) - placed(0), DEEP if index % 2 else GREEN)
    mask.save(ROOT / "maskable-512.png")

    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 28)
    sheet = Image.new("RGB", (1080, 460), CREAM)
    sheet_draw = ImageDraw.Draw(sheet)
    options = [
        (barcode, "Barcode"),
        (bubble, "Beep bubble"),
        (double_bubble, "Two bubbles"),
    ]
    for index, (fn, label) in enumerate(options):
        tile = canvas(fn, 256)
        x = 70 + index * 350
        sheet.paste(tile, (x, 60))
        sheet_draw.text((x, 340), label, fill=DEEP, font=font)
        tile.resize((192, 192), Image.Resampling.LANCZOS).save(ART / f"icon-option-{index + 1}.png")
    sheet.save(ART / "icon-options.png")


if __name__ == "__main__":
    main()
