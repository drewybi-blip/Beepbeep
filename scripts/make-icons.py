"""Draw the ShopMate home-screen icons."""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1] / "public"


def draw(size: int, maskable: bool = False) -> Image.Image:
    image = Image.new("RGB", (size, size), "#FFF8EE" if maskable else "#FFC20E")
    draw = ImageDraw.Draw(image)
    if maskable:
        inset = int(size * 0.12)
        draw.rounded_rectangle((inset, inset, size - inset, size - inset), radius=int(size * 0.18), fill="#FFC20E")
    bag_top = size * 0.42
    bag_left = size * 0.30
    bag_right = size * 0.70
    bag_bottom = size * 0.74
    draw.polygon(
        [(bag_left, bag_top), (bag_right, bag_top), (bag_right - size * 0.04, bag_bottom), (bag_left + size * 0.04, bag_bottom)],
        fill="#0E3B2E",
    )
    handle = [
        (size * 0.40, bag_top),
        (size * 0.40, size * 0.30),
        (size * 0.60, size * 0.30),
        (size * 0.60, bag_top),
    ]
    draw.arc((handle[0][0], size * 0.26, handle[2][0], bag_top + size * 0.02), 180, 360, fill="#0E3B2E", width=max(3, size // 18))
    dot = size * 0.045
    draw.ellipse((size / 2 - dot, size * 0.55, size / 2 + dot, size * 0.55 + dot * 2), fill="#FFC20E")
    return image


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    draw(192).save(ROOT / "pwa-192.png")
    draw(512).save(ROOT / "pwa-512.png")
    draw(180).save(ROOT / "apple-touch-icon.png")
    draw(512, maskable=True).save(ROOT / "maskable-512.png")


if __name__ == "__main__":
    main()
