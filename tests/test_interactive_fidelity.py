from __future__ import annotations

import hashlib
from pathlib import Path

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[1]
APPROVED_ASSEMBLY = ROOT / "artifacts/runs/golf-club-assembly-v003/image-01.png"
INTERACTIVE_BASELINE = ROOT / "web/assets/golfstudio-approved-baseline.png"
CLEAN_PLATE = ROOT / "web/assets/golfstudio-club-clean-plate.png"
OBJECT_REGION = (182, 78, 219, 243)
COMPONENT_RUN = ROOT / "artifacts/runs/golfstudio-reference-components-v001/components"


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def test_interactive_replica_uses_the_approved_assembly_without_redrawing_it():
    assert INTERACTIVE_BASELINE.exists()
    assert _sha256(INTERACTIVE_BASELINE) == _sha256(APPROVED_ASSEMBLY)


def test_animation_clean_plate_preserves_every_pixel_outside_the_object_region():
    reference = Image.open(APPROVED_ASSEMBLY).convert("RGB")
    clean_plate = Image.open(CLEAN_PLATE).convert("RGB")
    assert clean_plate.size == reference.size == (474, 403)

    difference = ImageChops.difference(reference, clean_plate)
    difference.paste((0, 0, 0), OBJECT_REGION)
    assert difference.getbbox() is None


def test_comfyui_reference_components_are_exact_source_crops():
    approved = Image.open(APPROVED_ASSEMBLY).convert("RGB")
    components = {
        "toolbar-transport_00001_.png": (10, 44, 111, 69),
        "animate-button_00001_.png": (393, 350, 470, 376),
        "bottom-tabs_00001_.png": (174, 378, 398, 399),
    }
    for filename, rectangle in components.items():
        expected = approved.crop(rectangle)
        actual = Image.open(COMPONENT_RUN / filename).convert("RGB")
        assert ImageChops.difference(expected, actual).getbbox() is None
