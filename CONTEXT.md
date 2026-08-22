# Reference-Preserving UI Generation

This context describes a repeatable system for transforming an existing interface while preserving its visual identity, then producing an interactive counterpart.

## Language

**Reference Screen**:
The source interface image whose composition and visual relationships are authoritative.
_Avoid_: Inspiration image, loose reference

**Edit Brief**:
A structured description of intended changes to a Reference Screen.
_Avoid_: Prompt, request blob

**Preservation Invariant**:
A visual or semantic relationship that must remain unchanged during a Render Pass.
_Avoid_: Preference, suggestion

**Exact Copy**:
Text that must appear verbatim in the approved interface.
_Avoid_: Suggested wording, sample text

**Render Pass**:
One image-model invocation with a fixed Edit Brief, inputs, and seed.
_Avoid_: Attempt, random generation

**Asset Pass**:
A Render Pass that produces one isolated reusable interface element.
_Avoid_: Full-screen generation

**Screen Pass**:
A Render Pass that produces a composed interface view.
_Avoid_: Asset generation

**Assembly**:
The placement of approved assets and Exact Copy into a screen composition.
_Avoid_: Stitching

**Editable Element**:
An independently selectable, movable, replaceable, and stateful interface object whose appearance is not baked into a full-screen raster.
_Avoid_: SVG, crop, transparent hotspot

**Componentized Reconstruction**:
A Figma composition assembled from Editable Elements without using the Reference Screen as a visual underlay in the finished composition.
_Avoid_: Overlay prototype, flattened replica

**Behavior Contract**:
The explicit states, actions, and responses assigned to an interactive Editable Element.
_Avoid_: Looks clickable, assumed interaction

**Theme-Consistent Inference**:
A provisional Behavior Contract used when the Reference Screen cannot reveal an interaction, preserving the source interface's visual and behavioral conventions until review.
_Avoid_: Redesign, modernization, arbitrary behavior

**Clean Plate**:
A source-faithful visual layer in which declared foreground elements have been removed and the newly exposed background has been reconstructed.
_Avoid_: Original screenshot underlay, blank mockup

**Layer Decomposition**:
The separation of a Reference Screen region into a Clean Plate and independently addressable foreground Editable Elements.
_Avoid_: Transparent controls over a screenshot, flattened recreation

**Fidelity Check**:
A comparison of a Render Pass or Interactive Replica against the Reference Screen and Preservation Invariants.
_Avoid_: Vibe check

**Interactive Replica**:
A working software view derived from an approved screen composition.
_Avoid_: Screenshot, mockup

**Executable Prototype**:
A testable working application that realizes the behavior of a Componentized Reconstruction before production-engine integration.
_Avoid_: Click-through mockup, raster-state slideshow

## Relationships

- One **Reference Screen** has one or more **Edit Briefs**.
- An **Edit Brief** declares **Preservation Invariants** and **Exact Copy**.
- An **Edit Brief** produces one or more **Render Passes**.
- **Asset Passes** and **Screen Passes** feed **Assembly**.
- **Assembly** produces a **Componentized Reconstruction** from one or more **Editable Elements**.
- Each interactive **Editable Element** has a **Behavior Contract**.
- A **Theme-Consistent Inference** may provisionally supply a **Behavior Contract** when source evidence is incomplete.
- **Layer Decomposition** produces a **Clean Plate** plus foreground **Editable Elements**.
- An **Executable Prototype** implements the states and behavior of a **Componentized Reconstruction**.
- An **Interactive Replica** is an approved **Executable Prototype** evaluated against its full fidelity and interaction contract.
- **Fidelity Checks** gate both **Assembly** and the **Interactive Replica**.

## Example dialogue

> **Designer:** “Keep the Reference Screen's spacing and visual hierarchy, but make every control independently editable.”
> **Developer:** “I’ll build a Componentized Reconstruction from Editable Elements, then validate its visual fidelity and Interactive Replica separately.”

## Flagged ambiguities

- “Prompt” previously meant both an unstructured sentence and the complete controlled input. Resolved: user intent is an **Edit Brief**; the provider prompt is compiled from it.
- “Stitching” obscured the difference between generating pixels and placing approved elements. Resolved: deterministic placement is **Assembly**.
- “No drift” previously mixed visual similarity with pixel identity. Resolved: strict preservation means a Fidelity Check reports zero changed pixels outside declared edit regions; similarity metrics remain useful for ranking generative donor images.
- “SVG” was previously used to mean an independently editable element. Resolved: editability is an object and behavior property; an Editable Element may use native Figma geometry, text, or an independent Qwen-generated raster asset.
- “Pixel perfect” previously implied one full-screen pixel-identity score. Resolved: a Componentized Reconstruction preserves Exact Copy and geometry while using declared, region-specific Fidelity Checks; native editable rendering may have bounded tolerance without licensing a flattened screenshot underlay.
