import json
import subprocess
import sys
import tempfile
import unittest
from types import SimpleNamespace
from pathlib import Path
from unittest.mock import patch

from qwen_ui_pipeline.cli import main


class RecordComfyRunTests(unittest.TestCase):
    def test_module_invocation_executes_the_cli(self):
        with tempfile.TemporaryDirectory() as directory:
            brief_path = Path(directory) / "brief.json"
            brief_path.write_text(json.dumps({"objective": "Remove the foreground."}), encoding="utf-8")

            result = subprocess.run(
                [sys.executable, "-m", "qwen_ui_pipeline.cli", "compile", str(brief_path)],
                check=True,
                capture_output=True,
                text=True,
            )

            self.assertIn("[TASK]", result.stdout)
            self.assertIn("Remove the foreground.", result.stdout)

    def test_writes_an_exact_component_extraction_workflow(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            components = root / "components.json"
            components.write_text(json.dumps({"toolbar": [10, 44, 101, 25]}), encoding="utf-8")
            output = root / "workflow.json"

            status = main(
                [
                    "component-workflow",
                    "--reference-filename",
                    "golfstudio-approved-baseline.png",
                    "--components",
                    str(components),
                    "--filename-prefix",
                    "golf-ui/reference-components/v001",
                    "--output",
                    str(output),
                ]
            )

            self.assertEqual(status, 0)
            workflow = json.loads(output.read_text())
            self.assertEqual(workflow["2"]["class_type"], "ImageCrop")
            self.assertEqual(workflow["3"]["inputs"]["filename_prefix"], "golf-ui/reference-components/v001/toolbar")

    def test_records_existing_comfy_outputs_with_provider_provenance(self):
        brief = {
            "objective": "Replace the flower with a golf club.",
            "output": {
                "resolution": "1K",
                "aspect_ratio": "source",
                "size": "948*806",
                "count": 1,
            },
        }

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            brief_path = root / "brief.json"
            brief_path.write_text(json.dumps(brief), encoding="utf-8")
            reference = root / "reference.png"
            reference.write_bytes(b"reference")
            image = root / "result.png"
            image.write_bytes(b"result")
            output = root / "run"

            status = main(
                [
                    "record-comfy",
                    str(brief_path),
                    "--provider",
                    "alibaba",
                    "--reference",
                    str(reference),
                    "--image",
                    str(image),
                    "--output-dir",
                    str(output),
                    "--prompt-id",
                    "prompt-123",
                    "--source-url",
                    "https://example.com/reference.png",
                    "--figma-file-key",
                    "figma-key",
                ]
            )

            self.assertEqual(status, 0)
            self.assertEqual((output / "image-01.png").read_bytes(), b"result")
            run = json.loads((output / "run.json").read_text())
            self.assertEqual(run["provenance"]["provider"], "alibaba")
            self.assertEqual(run["provenance"]["prompt_id"], "prompt-123")
            self.assertEqual(run["provenance"]["figma_file_key"], "figma-key")
            self.assertEqual(len(run["provenance"]["reference_sha256"]), 64)

    @patch("qwen_ui_pipeline.cli.generate_with_provider")
    def test_generated_run_records_the_exact_reference_hash(self, generate_with_provider):
        generate_with_provider.return_value = SimpleNamespace(
            provider="openrouter",
            request={"model": "qwen/qwen-image-3-pro", "prompt": "remove title"},
            response={"data": [{"b64_json": "aW1hZ2U=", "media_type": "image/png"}]},
        )
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            brief_path = root / "brief.json"
            brief_path.write_text(json.dumps({"objective": "Remove the title."}), encoding="utf-8")
            reference = root / "reference.png"
            reference.write_bytes(b"source-authority")
            output = root / "run"

            status = main([
                "generate",
                str(brief_path),
                "--reference",
                str(reference),
                "--output-dir",
                str(output),
            ])

            self.assertEqual(status, 0)
            run = json.loads((output / "run.json").read_text())
            self.assertEqual(
                run["provenance"]["reference_sha256"],
                "ef6642f69b15f43be9796e2f1257356b8fc6c5b9c4b783e90e19d4992b3f543b",
            )


if __name__ == "__main__":
    unittest.main()
