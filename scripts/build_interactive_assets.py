"""Build deterministic animation assets from the approved golf Assembly."""

from __future__ import annotations

from pathlib import Path
from shutil import copyfile

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
APPROVED = ROOT / "artifacts/runs/golf-club-assembly-v003/image-01.png"
ASSET_DIRECTORY = ROOT / "web/assets"
BASELINE = ASSET_DIRECTORY / "golfstudio-approved-baseline.png"
CLEAN_PLATE = ASSET_DIRECTORY / "golfstudio-club-clean-plate.png"
CLUB_SPRITE = ASSET_DIRECTORY / "golfstudio-club-sprite.png"

# The immutable v003 Assembly contract uses this exact rectangle.
OBJECT_REGION = (182, 78, 219, 243)


def build() -> None:
    ASSET_DIRECTORY.mkdir(parents=True, exist_ok=True)
    approved = Image.open(APPROVED).convert("RGB")
    copyfile(APPROVED, BASELINE)

    clean_plate = approved.copy()
    draw = ImageDraw.Draw(clean_plate)
    # Retain the one-pixel red selection outline and clear only its interior.
    draw.rectangle((184, 81, 218, 240), fill=(255, 255, 255))
    clean_plate.save(CLEAN_PLATE, optimize=False)

    crop = approved.crop(OBJECT_REGION).convert("RGBA")
    pixels = crop.load()
    for y in range(crop.height):
        for x in range(crop.width):
            red, green, blue, _ = pixels[x, y]
            saturation = max(red, green, blue) - min(red, green, blue)
            luminance = (red + green + blue) / 3
            alpha = 255 if saturation <= 22 and luminance < 242 else 0
            pixels[x, y] = (red, green, blue, alpha)
    crop.save(CLUB_SPRITE, optimize=False)


if __name__ == "__main__":
    build()
