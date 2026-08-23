export interface RangeBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function rangeGesturePoint(
  box: RangeBox,
  writingMode: string,
  ratio: number,
): { x: number; y: number };
