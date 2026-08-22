# Separate editable Design authority from the executable WSL runtime

Status: accepted on 2026-08-22. Supersedes ADR 0004 for new screenshot
reconstructions. GolfStudio v002-v004 remains historical evidence for the
reference-underlay approach.

## Context

The existing pipeline preserves exact pixels by placing transparent controls
over a full-screen raster. That proves a narrow interaction can work, but it
does not produce independently selectable interface elements. A button,
slider, label, icon, or panel cannot be moved or reused without carrying the
original screen underneath it.

"Editable" was also incorrectly treated as synonymous with SVG. Native Figma
text and geometry can be editable, while an independently generated raster
asset can still be moved, replaced, layered, and assigned states. Conversely,
an SVG exported as one flattened object may not provide useful editability.

Figma Design is valuable for editable structure and visual review, but a
frame-only prototype is a weak runtime for continuous controls, application
state, conditional behavior, complete user flows, and executable QA. Figma Make
was evaluated as the executable layer, but neither Make-in-local-codebase nor
hosted Make is available. Making an unavailable product a pipeline dependency
would prevent the workflow from running unattended and from WSL.

Primary references:

- <https://developers.figma.com/docs/figma-mcp-server/>
- <https://developers.figma.com/docs/figma-mcp-server/structure-figma-file/>

## Decision

Use separate, explicit authorities:

1. The Reference Screen is the visual authority and is never the visible
   underlay of a completed Componentized Reconstruction.
2. Figma Design owns the editable component hierarchy, names, variants, text,
   layout, shared styles, variables, and source-to-component traceability.
3. Qwen Image 3 Pro produces visual assets when native Figma construction would
   lose source-specific appearance. Each asset remains an independent,
   replaceable object with its Render Pass provenance.
4. The WSL-hosted application owns the Executable Prototype: continuous inputs,
   conditional state, routes, animation, and complete user flows.
5. Figma Design and the WSL runtime share a versioned state and component
   manifest with stable identifiers. Visual similarity alone is not a
   synchronization mechanism.
6. Use the remote Figma MCP from WSL to create, inspect, and verify native Design
   components. Figma Design remains the editable review layer, not a substitute
   runtime verdict.
7. Git owns the machine-readable manifest, prompts, test contracts, fixtures,
   and exported evidence. The later game-engine handoff consumes these
   versioned artifacts rather than scraping an undocumented prototype.
8. Evaluate a Componentized Reconstruction with region-specific Fidelity
   Checks. Exact Copy and geometry remain locked; independent raster assets
   receive strict regional comparisons; native editable text and geometry may
   use narrowly declared rendering tolerances. Do not require full-screen pixel
   identity or reintroduce a screenshot underlay to satisfy a metric.
9. Run the canonical repository, implementation, automated tests, and retained
   evidence in WSL. Use the Mac as the Figma Design and browser-review client.
   Do not include Figma Make in the required toolchain.

## Consequences

- Finished reconstructions can be inspected with the Reference Screen hidden.
- A component may use native geometry, native text, an independent raster
  asset, or a deliberate combination; file format alone does not decide
  editability.
- Continuous slider motion is implemented as stateful behavior, not four
  pre-rendered frames. Discrete generated frames may still be used for a
  genuinely frame-based visual effect, but not as the slider's interaction
  model.
- Fidelity reports identify the failing element and contract instead of hiding
  all rendering differences inside one global similarity score.
- Figma Design and the WSL application require explicit parity checks because
  neither is allowed to silently overwrite the other.
- The application can be fully exercised by WSL automation while Figma retains
  independently editable components for visual inspection and handoff.
- The Godot handoff remains downstream, but its coordinate, state, asset, and
  input requirements must constrain the shared manifest before reconstruction
  begins.
