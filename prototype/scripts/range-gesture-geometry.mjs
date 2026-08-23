export function rangeGesturePoint(box, writingMode, ratio) {
  const vertical = /vertical|sideways/i.test(writingMode);
  return vertical
    ? { x: box.x + box.width / 2, y: box.y + box.height * ratio }
    : { x: box.x + box.width * ratio, y: box.y + box.height / 2 };
}
