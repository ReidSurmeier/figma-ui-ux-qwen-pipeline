# Source register

Checked 2026-08-22.

| Source | Authority | Pipeline fact used |
| --- | --- | --- |
| [Qwen Image 3.0 announcement](https://qwen.ai/blog?id=qwen-image-3.0) | Qwen official | About 4.5K accepted instruction tokens; 3.7K-token 3×3 example; 10 px detail claim; editing and rich spatial content |
| [Alibaba Qwen image API reference](https://help.aliyun.com/en/model-studio/qwen-image-generation-and-editing-api-reference) | Provider official | Pro/standard model IDs, image-edit request shape, one to three direct references, pixel limits, prompt enhancement modes, seed/count, 24-hour URL retention |
| [OpenRouter image generation](https://openrouter.ai/docs/guides/overview/multimodal/image-generation) | Provider official | Dedicated `/api/v1/images` API, base64 response, reference image shape, discovery and endpoint capability records |
| [OpenRouter live image-model API](https://openrouter.ai/api/v1/images/models) | Provider official | Current Qwen Image 3 availability and model slugs |
| [OpenRouter guardrails](https://openrouter.ai/docs/guides/features/guardrails/overview) | Provider official | Account-level privacy and data-policy restrictions can exclude an otherwise available provider endpoint |
| [ComfyUI Qwen-Image workflow](https://docs.comfy.org/tutorials/image/qwen/qwen-image) | ComfyUI official | Native open-weight Qwen-Image workflow and 24 GB reference measurements; distinct from Image 3 API service |
| [ComfyUI manual installation](https://docs.comfy.org/installation/manual_install) | ComfyUI official | Isolated Python environment and Linux installation sequence |
| [PlantStudio main window](https://www.kurtz-fernhout.com/PlantStudio/screenMainWindow.gif) | Original software publisher | Stable source reference recovered after the prior FigJam node disappeared |
| [comfyui-mcp](https://github.com/artokun/comfyui-mcp) | Community integration | Local MCP control plane used to expose ComfyUI workflows to Codex |
| [Qwen Image Pro test board](https://www.figma.com/board/v6Rah44MTgZcEE4oSJro1v/Quen-Image-Pro) | User-designated FigJam board | Contains the two current componentized-reconstruction test projects at nodes `1:2` and `1:6` |

## Registered benchmark exports

These hashes describe the focused PNG exports observed through Figma MCP and
frozen under `benchmarks/` on 2026-08-22.

| Screen ID | FigJam source | Export | Observed SHA-256 | Primary test pressure |
| --- | --- | --- | --- | --- |
| `japanese-rpg-options-v001` | [`1:2`, Step 1 v2 / Option window dragged](https://www.figma.com/board/v6Rah44MTgZcEE4oSJro1v/Quen-Image-Pro?node-id=1-2) | [`reference.png`](../../benchmarks/japanese-rpg-options-v001/reference.png), 849×564 RGBA | `e23fe523a8652a0acc721b947100aeccf7ee69c33021d77498bf074ec38b3308` | Dense overlapping windows, exact Japanese copy, small icons, inventory grids, progress meters, two audio sliders, a skin selector, checkboxes, buttons, scrolling, and z-order |
| `korean-gallery-v001` | [`1:6`, Korean white-chrome gallery](https://www.figma.com/board/v6Rah44MTgZcEE4oSJro1v/Quen-Image-Pro?node-id=1-6) | [`reference.png`](../../benchmarks/korean-gallery-v001/reference.png), 672×484 RGBA | `6ed33ff9b3cbe3f50ea1773bbb4d45a7cde1f655774d0a75d17a066aa5384f34` | Korean Exact Copy, application chrome, category buttons, gallery cells, photographic-content isolation, scrolling, and decorative background separation |
