from __future__ import annotations

import json
import subprocess
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
CONTRACT = json.loads((ROOT / "web/fidelity-contract.json").read_text())
APPROVED = Image.open(ROOT / "artifacts/runs/golf-club-assembly-v003/image-01.png").convert("RGB")


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


def _capture_page(port: int, screenshot: Path, query: str = "") -> Image.Image:
    subprocess.run(
        [
            "google-chrome",
            "--headless=new",
            "--disable-gpu",
            "--no-sandbox",
            "--hide-scrollbars",
            "--window-size=474,403",
            "--virtual-time-budget=1000",
            f"--screenshot={screenshot}",
            f"http://10.255.255.254:{port}/{query}",
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        timeout=15,
    )
    return Image.open(screenshot).convert("RGB")


def test_address_view_preserves_every_pixel_outside_declared_mutable_regions(tmp_path):
    screenshot = tmp_path / "address.png"
    handler = partial(QuietHandler, directory=ROOT / "web")
    # Headless Chrome runs across the WSL browser boundary on this host. The
    # registered loopback alias is the same one used by ComfyUI and the app.
    host = "10.255.255.254"
    server = ThreadingHTTPServer((host, 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        actual = _capture_page(server.server_port, screenshot)
    finally:
        server.shutdown()
        thread.join(timeout=2)

    assert actual.size == APPROVED.size == (CONTRACT["width"], CONTRACT["height"])
    difference = ImageChops.difference(APPROVED, actual)
    draw = ImageDraw.Draw(difference)
    for region in CONTRACT["mutableRegions"]:
        draw.rectangle(
            (
                region["x"],
                region["y"],
                region["x"] + region["width"] - 1,
                region["y"] + region["height"] - 1,
            ),
            fill=(0, 0, 0),
        )
    assert difference.getbbox() is None


def test_alternate_analysis_views_change_only_the_declared_lower_panel(tmp_path):
    handler = partial(QuietHandler, directory=ROOT / "web")
    server = ThreadingHTTPServer(("10.255.255.254", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        baseline = _capture_page(server.server_port, tmp_path / "swing.png", "?static=1")
        for panel in ("rotation", "parameters", "parts"):
            actual = _capture_page(
                server.server_port,
                tmp_path / f"{panel}.png",
                f"?ui={panel}&static=1",
            )
            difference = ImageChops.difference(baseline, actual)
            assert difference.getbbox() is not None
            difference.paste((0, 0, 0), (163, 253, 470, 400))
            assert difference.getbbox() is None
    finally:
        server.shutdown()
        thread.join(timeout=2)
