#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd -- "$SCRIPT_DIR/.." && pwd)
MANIFEST="$REPO_ROOT/benchmarks/japanese-rpg-options-v001/windows.json"
OUTPUT_DIR="$REPO_ROOT/briefs/japanese-rpg-options-v001/windows"
mkdir -p "$OUTPUT_DIR"

while IFS=$'\t' read -r id title width height status; do
  [[ "$status" == "reconstruction" ]] || continue
  scale=4
  if (( width * height * scale * scale < 262144 )); then scale=6; fi
  output_width=$((width * scale))
  output_height=$((height * scale))

  case "$id" in
    card)
      layout="the complete title bar, large bordered illustration cell, right description panel, vertical scrollbar lane, and separate lower item strip"
      foreground="title icon and glyphs, window buttons, card illustration, all Japanese text and numbers, scrollbar arrows track and thumb, and the lower item icon"
      ;;
    skills)
      layout="the title bar, left gutter, four stacked skill rows, right scrollbar lane, footer band, and two bottom action-button wells"
      foreground="title icon and glyphs, window button, every skill icon, label, level and SP value, every LV UP button, selected-row tint, scrollbar foreground, skill-point text, and use and close buttons"
      ;;
    status)
      layout="the title bar, two vertical side tabs, six-row stat grid, derived-stat columns, one-pixel row separators, and lower status rows"
      foreground="title icon and glyphs, window buttons, side-tab glyphs, all labels values plus signs numbers and arrow buttons"
      ;;
    inventory)
      layout="the title bar, three vertical category-tab wells, four-row item grid, right scrollbar lane, and bottom resize grip"
      foreground="title icon and glyphs, window buttons, category-tab glyphs, every item icon and count, selected-cell tint, scrollbar foreground, and resize marks"
      ;;
    equipment)
      layout="the title bar, left equipment list, narrow central character panel, right equipment list, row separators, and footer edge"
      foreground="title icon and glyphs, window buttons, all equipment icons and Japanese labels, faded slot labels, the character sprite, and the floating Items badge"
      ;;
    chat)
      layout="a complete 280 by 102 chat-room window with title bar, form rows, input wells, people and room dropdown wells, security radio row, password field, and bottom OK and cancel wells"
      foreground="the overlapping Options window and every fragment of it, title icon and glyphs, all form labels values arrows radios and action buttons"
      ;;
    exchange)
      layout="the title bar, two six-slot item grids, central division, two summary bands, and three bottom action-button wells"
      foreground="title icon and glyphs, window buttons, every item icon count and selection tint, send and get labels, all Zeny values, and OK trade and cancel buttons"
      ;;
    game-menu)
      layout="a complete 222 by 133 window with reconstructed title bar, white body panel, four evenly spaced horizontal button wells, and complete bottom chrome"
      foreground="the overlapping Skill List fragment at the top, magenta donor edge, title icon and glyphs, window buttons, all four dark button faces, and every English button label"
      ;;
    party)
      layout="the title bar, member-list panel, five member rows, toolbar band, two bottom category-tab wells, resize grip, and complete bottom edge"
      foreground="the separate Basic Info fragment above, magenta donor background below, title icon and glyphs, window button, every member icon and name, selected-row tint, toolbar icons, and bottom tab glyphs"
      ;;
    quickbar)
      layout="a complete 112 by 94 quick-slot window with title bar, two-column slot grid, white slot wells, one lower progress well, and complete right and bottom chrome"
      foreground="all surrounding magenta donor background, title icon and glyphs, window buttons, blue skill icon, UP label, and blue progress fill"
      ;;
    *)
      printf 'Unknown reconstruction window: %s\n' "$id" >&2
      exit 1
      ;;
  esac

  jq -n \
    --arg id "$id" \
    --arg title "$title" \
    --argjson width "$width" \
    --argjson height "$height" \
    --argjson scale "$scale" \
    --arg layout "$layout" \
    --arg foreground "$foreground" \
    --arg size "${output_width}*${output_height}" \
    --argjson seed "$((22083000 + width + height))" \
    '{
      model: "qwen/qwen-image-3-pro",
      provider: "alibaba",
      objective: ("Create an empty source-geometry clean plate for the exact Japanese RPG " + $id + " window crop. Remove all semantic foreground while reconstructing only the surfaces exposed beneath it. This is component isolation, not redesign."),
      reference_role: ("Reference image 1 is the authoritative " + ($width|tostring) + " by " + ($height|tostring) + " Japanese window crop titled " + $title + ". It fixes canvas, chrome, pixel density, palette, one-pixel rules, and every visible coordinate."),
      preservation_invariants: [
        ("Keep the exact " + ($width|tostring) + " by " + ($height|tostring) + " source composition and outer silhouette."),
        ("Preserve " + $layout + "."),
        "Keep the authentic late-1990s Japanese PC-game raster style, hard pixel-scale edges, limited blue-grey palette, one-pixel highlights and shadows, and source-scale line weights.",
        "Do not move, scale, crop, warp, modernize, smooth, relight, or invent any surviving surface."
      ],
      canvas: [
        "Return only this window crop with no surrounding magenta desktop and no neighboring-window fragments.",
        ("Render at exactly " + $size + " pixels, " + ($scale|tostring) + " times source scale, for deterministic point reduction back to source dimensions."),
        "Fill each removal from the nearest continuous title gradient, white body surface, pale panel, row background, border, or footer surface."
      ],
      regions: [{
        name: "all semantic foreground and foreign overlap",
        change: ("Remove " + $foreground + ". Reconstruct the declared empty local panels and chrome beneath them without ghost text or pseudo-controls."),
        preserve: [$layout, "outer window geometry", "panel boundaries", "one-pixel bevel hierarchy"]
      }],
      exact_copy: [],
      style: [
        "Authentic source-matched late-1990s Japanese desktop RPG raster UI.",
        "Crisp source-scale pale blue-grey chrome, hard aliased rules, restrained dithering, and no contemporary styling.",
        "An empty background plate only."
      ],
      asset_rules: [
        "Exactly one empty window plate and no surrounding application screenshot.",
        "No readable or pseudo-readable text, numbers, foreground icons, item art, sprite art, meter fills, scrollbar thumbs, button faces, or labels may remain.",
        "Do not add replacement content, decoration, characters, logos, or controls."
      ],
      negative_constraints: [
        "No magenta background, neighboring-window fragments, modern cards, rounded corners, glass, soft shadows, antialiased redesign, gibberish text, ghost glyphs, duplicated controls, or new icons.",
        "No full game screenshot and no crop border borrowed from the magenta desktop."
      ],
      quality_checks: [
        "At source size the outer silhouette, title geometry, body partitions, row spacing, and palette align with the reference.",
        "All foreground semantics are absent and newly exposed surfaces remain locally plausible.",
        "The clean plate can sit beneath independent source-locked components without revealing a duplicate or occluder."
      ],
      output: { size: $size, aspect_ratio: "source", resolution: "1K", count: 1, seed: $seed }
    }' > "$OUTPUT_DIR/$id-clean-plate-v001.json"
done < <(jq -r '.windows[] | [.id, .title, .bounds[2], .bounds[3], .status] | @tsv' "$MANIFEST")

for brief in "$OUTPUT_DIR"/*.json; do
  uv run qwen-ui-pipeline compile "$brief" >/dev/null
  printf '%s\n' "$brief"
done
