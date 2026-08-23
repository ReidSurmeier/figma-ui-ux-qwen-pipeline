#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROTOTYPE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_DIR="$(cd "${PROTOTYPE_DIR}/.." && pwd)"
REFERENCE="${REPO_DIR}/benchmarks/japanese-rpg-options-v001/regions/options-window/reference.png"
CHECK_DIR="$(mktemp -d)"
SERVER_LOG="${CHECK_DIR}/vite-preview.log"
SERVER_PID=""

cleanup() {
  if [[ -n "${SERVER_PID}" ]] && kill -0 "${SERVER_PID}" 2>/dev/null; then
    kill "${SERVER_PID}" 2>/dev/null || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
  rm -rf -- "${CHECK_DIR}"
}
trap cleanup EXIT

cd "${PROTOTYPE_DIR}"
npm run build >/dev/null
./node_modules/.bin/vite preview --host 10.255.255.254 --port 4184 --strictPort >"${SERVER_LOG}" 2>&1 &
SERVER_PID=$!

for _ in $(seq 1 50); do
  if curl -fsS --max-time 1 http://10.255.255.254:4184/?view=options >/dev/null 2>&1; then
    break
  fi
  sleep 0.1
done
curl -fsS --max-time 2 http://10.255.255.254:4184/?view=options >/dev/null

timeout 15s /usr/bin/google-chrome \
  --headless=new \
  --no-sandbox \
  --disable-gpu \
  --hide-scrollbars \
  --force-device-scale-factor=1 \
  --user-data-dir="${CHECK_DIR}/chrome-profile" \
  --window-size=320,180 \
  --screenshot="${CHECK_DIR}/full.png" \
  http://10.255.255.254:4184/?view=options >/dev/null 2>&1 || true

if [[ ! -s "${CHECK_DIR}/full.png" ]]; then
  printf 'visual-check: Chrome did not produce a screenshot\n' >&2
  exit 1
fi

# With the locked 320x180 viewport, the 280x122 options window begins at y=29.
# This captures the executable window only; the full reference is never used as
# a runtime underlay.
convert "${CHECK_DIR}/full.png" -crop 280x122+0+29 +repage "${CHECK_DIR}/window.png"

# The source screenshot contains a three-pixel magenta donor perimeter that the
# executable derivative intentionally removes. Compare the source-authoritative
# interior, then test the replacement perimeter independently below.
METRIC="$(compare -metric MAE \
  "${REFERENCE}[274x116+3+3]" \
  "${CHECK_DIR}/window.png[274x116+3+3]" \
  null: 2>&1 || true)"
NORMALIZED="$(printf '%s\n' "${METRIC}" | sed -n 's/.*(\([^)]*\)).*/\1/p')"

if [[ -z "${NORMALIZED}" ]]; then
  printf 'visual-check: could not parse ImageMagick MAE output: %s\n' "${METRIC}" >&2
  exit 1
fi

if ! awk -v actual="${NORMALIZED}" 'BEGIN { exit !(actual <= 0.030000) }'; then
  printf 'visual-check: FAIL normalized MAE=%s exceeds 0.030000\n' "${NORMALIZED}" >&2
  exit 1
fi

# The title remains Exact Copy as an editable transparent layer. Include its
# one-pixel perimeter so an opaque screenshot crop cannot hide a boxed seam.
TITLE_METRIC="$(compare -metric MAE \
  "${REFERENCE}[56x13+15+3]" \
  "${CHECK_DIR}/window.png[56x13+15+3]" \
  null: 2>&1 || true)"
TITLE_NORMALIZED="$(printf '%s\n' "${TITLE_METRIC}" | sed -n 's/.*(\([^)]*\)).*/\1/p')"
if [[ -z "${TITLE_NORMALIZED}" ]] || ! awk -v actual="${TITLE_NORMALIZED}" 'BEGIN { exit !(actual <= 0.015000) }'; then
  printf 'visual-check: FAIL title boundary MAE=%s exceeds 0.015000\n' "${TITLE_NORMALIZED:-unavailable}" >&2
  exit 1
fi

for asset in checkbox-off checkbox-on footer-checkbox-off footer-checkbox-on slider-thumb title-text; do
  opacity="$(identify -format '%[opaque]' "${PROTOTYPE_DIR}/public/assets/japanese-options-v001/components/${asset}.png")"
  if [[ "${opacity,,}" != "false" ]]; then
    printf 'visual-check: FAIL %s must be a transparent independent asset\n' "${asset}" >&2
    exit 1
  fi
done

RUNTIME_PLATE="${PROTOTYPE_DIR}/public/assets/japanese-options-v001/clean-plate-alpha-edge.png"
RUNTIME_PLATE_OPAQUE="$(identify -format '%[opaque]' "${RUNTIME_PLATE}")"
if [[ "${RUNTIME_PLATE_OPAQUE,,}" != "false" ]]; then
  printf 'visual-check: FAIL runtime clean plate must have a transparent donor perimeter\n' >&2
  exit 1
fi

MINIMIZED="${PROTOTYPE_DIR}/public/assets/japanese-options-v001/components/minimized-plate.png"
MINIMIZED_CHANGED_PIXELS="$(compare -metric AE "${REFERENCE}[180x18+0+0]" "${MINIMIZED}" null: 2>&1 || true)"
if ! awk -v actual="${MINIMIZED_CHANGED_PIXELS}" 'BEGIN { exit !(actual > 10) }'; then
  printf 'visual-check: FAIL minimized state is indistinguishable from a reference crop\n' >&2
  exit 1
fi

printf 'visual-check: PASS normalized MAE=%s (limit 0.030000), title boundary MAE=%s, transparent editable assets, generated minimized delta=%s pixels\n' \
  "${NORMALIZED}" "${TITLE_NORMALIZED}" "${MINIMIZED_CHANGED_PIXELS}"
