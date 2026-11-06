/* Returns the Y positions to visit during a scroll pass, top to bottom */
export function planScrollPass(documentHeight: number, viewportHeight: number): number[] {
  if (viewportHeight <= 0) {
    throw new Error(`viewportHeight must be positive, got ${viewportHeight}`);
  }
  if (documentHeight < 0) {
    throw new Error(`documentHeight must be non-negative, got ${documentHeight}`);
  }

  if (documentHeight <= viewportHeight) {
    return [0];
  }

  const maxScrollY = documentHeight - viewportHeight;
  const positions: number[] = [];

  for (let y = 0; y < maxScrollY; y += viewportHeight) {
    positions.push(y);
  }

  const last = positions[positions.length - 1];
  if (last !== maxScrollY) {
    positions.push(maxScrollY);
  }

  return positions;
}
