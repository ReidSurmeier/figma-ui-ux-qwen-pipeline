import { describe, expect, it } from "vitest";

import { rangeGesturePoint } from "../scripts/range-gesture-geometry.mjs";

describe("real range gesture geometry", () => {
  const box = { x: 100, y: 20, width: 40, height: 200 };

  it("samples horizontal sliders along x", () => {
    expect(rangeGesturePoint(box, "horizontal-tb", 0.25)).toEqual({ x: 110, y: 120 });
  });

  it("samples vertical sliders along y", () => {
    expect(rangeGesturePoint(box, "vertical-lr", 0.25)).toEqual({ x: 120, y: 70 });
  });
});
