"""Draw the BeepBeep home-screen icons: a gold tile with a barcode beep."""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1] / "public"
GOLD = "#FFC20E"
PINE = "#0E3B2E"
CREAM = "#FFF8EE"


def draw(size: int, maskable: bool = False) -> Image.Image:
    image = Image.new("RGB", (size, size), CREAM if maskable else GOLD)
    draw = ImageDraw.Draw(image)
    if maskable:
        inset = int(size * 0.14)
        draw.rounded_rectangle((inset, inset, size - inset, size - inset), radius=int(size * 0.18), fill=GOLD)
    scale = size / 64
    def r(value: float) -> int:
        return int(value * scale)

    draw.rounded_rectangle((r(12), r(26), r(18), r(42)), radius=r(2), fill=PINE)
    draw.rounded_rectangle((r(22), r(16), r(28), r(48)), radius=r(2), fill=PINE)
    draw.arc((r(32), r(20), r(48), r(44)), 280, 80, fill=PINE, width=max(3, size // 18))
    draw.arc((r(36), r(12), r(58), r(52)), 280, 80, fill=PINE, width=max(3, size // 18))
    return image


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    draw(192).save(ROOT / "pwa-192.png")
    draw(512).save(ROOT / "pwa-512.png")
    draw(180).save(ROOT / "apple-touch-icon.png")
    draw(512, maskable=True).save(ROOT / "maskable-512.png")


if __name__ == "__main__":
    main()
