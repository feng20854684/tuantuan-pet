export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function exceedsDragThreshold(start: Point, current: Point, threshold = 5): boolean {
  const dx = current.x - start.x;
  const dy = current.y - start.y;
  return Math.hypot(dx, dy) >= threshold;
}

export function draggedBounds(startBounds: Rect, startCursor: Point, currentCursor: Point): Rect {
  const dx = currentCursor.x - startCursor.x;
  const dy = currentCursor.y - startCursor.y;
  return {
    x: Math.round(startBounds.x + dx),
    y: Math.round(startBounds.y + dy),
    width: startBounds.width,
    height: startBounds.height,
  };
}

export function snapBounds(bounds: Rect, workArea: Rect): Rect {
  const snapThreshold = 20;
  let { x, y } = bounds;

  // 左边贴边
  if (Math.abs(bounds.x - workArea.x) < snapThreshold) {
    x = workArea.x;
  }
  // 右边贴边
  if (Math.abs(bounds.x + bounds.width - (workArea.x + workArea.width)) < snapThreshold) {
    x = workArea.x + workArea.width - bounds.width;
  }
  // 上边贴边
  if (Math.abs(bounds.y - workArea.y) < snapThreshold) {
    y = workArea.y;
  }
  // 下边贴边
  if (Math.abs(bounds.y + bounds.height - (workArea.y + workArea.height)) < snapThreshold) {
    y = workArea.y + workArea.height - bounds.height;
  }

  return { x: Math.round(x), y: Math.round(y), width: bounds.width, height: bounds.height };
}

export type EdgeSide = 'left' | 'right' | 'top' | 'bottom' | null;

export const EDGE_PEEK_SIZE = 16; // 贴边后露出的像素宽度
export const EDGE_SNAP_THRESHOLD = 24;

export function detectEdge(bounds: Rect, workArea: Rect): EdgeSide {
  const distLeft = Math.abs(bounds.x - workArea.x);
  const distRight = Math.abs(bounds.x + bounds.width - (workArea.x + workArea.width));
  const distTop = Math.abs(bounds.y - workArea.y);
  const distBottom = Math.abs(bounds.y + bounds.height - (workArea.y + workArea.height));
  const minDist = Math.min(distLeft, distRight, distTop, distBottom);
  if (minDist > EDGE_SNAP_THRESHOLD) return null;
  if (minDist === distLeft) return 'left';
  if (minDist === distRight) return 'right';
  if (minDist === distTop) return 'top';
  return 'bottom';
}

export function hiddenBounds(side: EdgeSide, bounds: Rect, workArea: Rect): Rect {
  const { width, height } = bounds;
  switch (side) {
    case 'left':
      return { x: workArea.x - width + EDGE_PEEK_SIZE, y: bounds.y, width, height };
    case 'right':
      return { x: workArea.x + workArea.width - EDGE_PEEK_SIZE, y: bounds.y, width, height };
    case 'top':
      return { x: bounds.x, y: workArea.y - height + EDGE_PEEK_SIZE, width, height };
    case 'bottom':
      return { x: bounds.x, y: workArea.y + workArea.height - EDGE_PEEK_SIZE, width, height };
    default:
      return bounds;
  }
}

export function poppedBounds(side: EdgeSide, bounds: Rect, workArea: Rect): Rect {
  const { width, height } = bounds;
  switch (side) {
    case 'left':
      return { x: workArea.x, y: bounds.y, width, height };
    case 'right':
      return { x: workArea.x + workArea.width - width, y: bounds.y, width, height };
    case 'top':
      return { x: bounds.x, y: workArea.y, width, height };
    case 'bottom':
      return { x: bounds.x, y: workArea.y + workArea.height - height, width, height };
    default:
      return bounds;
  }
}
