class ViewportCroppedDOMRect {
  constructor(top, bottom, left, right) {
    this.top = top;
    this.bottom = bottom;
    this.left = left;
    this.right = right;
  }
}

/**
 * Get a viewport-cropped DOM rectangle for a DOM element
 * @param {Element} element - The DOM element
 * @returns {ViewportCroppedDOMRect}
 */
function getViewportCroppedRect(element) {
  class CroppedRange {
    constructor(min, max) {
      this.min = min;
      this.max = max;
    }
  }

  function cropRange(lowerBound, upperBound, rMin, rMax) {
    if (rMin < lowerBound && rMax < lowerBound) {
      return null;
    } else if (rMin > upperBound && rMax > upperBound) {
      return null;
    } else if (rMin < lowerBound && rMax > upperBound) {
      return new CroppedRange(lowerBound, upperBound);
    } else if (rMin < lowerBound && rMax >= lowerBound) {
      return new CroppedRange(lowerBound, rMax);
    } else if (rMin >= lowerBound && rMax > upperBound) {
      return new CroppedRange(rMin, upperBound);
    } else if (rMin >= lowerBound && rMax <= upperBound) {
      return new CroppedRange(rMin, rMax);
    }
  }

  const elementRect = element.getBoundingClientRect();
  const viewportHeight = document.documentElement.clientHeight - 1;
  const viewportWidth = document.documentElement.clientWidth - 1;

  const croppedXRange = cropRange(
    0,
    viewportWidth,
    elementRect.left,
    elementRect.right
  );
  if (!croppedXRange) return null;

  const croppedYRange = cropRange(
    0,
    viewportHeight,
    elementRect.top,
    elementRect.bottom
  );
  if (!croppedYRange) return null;

  return new ViewportCroppedDOMRect(
    croppedYRange.min,
    croppedYRange.max,
    croppedXRange.min,
    croppedXRange.max
  );
}

class VisiblePoint {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

/**
 * Search for a visible point in a DOM element
 * @param {Element} element - The DOM element
 * @param {number} [minStep=16] - The minimum step in pixels to search the element for a visible point
 * @param {ViewportCroppedDOMRect} [viewportCroppedRect] - The ViewportCroppedDOMRect of `element`. If not provided, it will be computed.
 * @returns
 */
function getVisiblePoint(
  element,
  minStep = 16,
  viewportCroppedRect = getViewportCroppedRect(element)
) {
  function searchRect(top, left, bottom, right, predicate, minStep) {
    let previousYStep = bottom - top;
    if (previousYStep <= 0) return null;
    let previousXStep = right - left;
    if (previousXStep <= 0) return null;

    while (previousYStep > minStep || previousXStep > minStep) {
      let currentYStep = previousYStep / 2;
      let currentXStep = previousXStep / 2;

      for (let y = top; y <= bottom; y += currentYStep) {
        if (y % previousYStep === 0) continue;
        for (let x = left; x <= right; x += currentXStep) {
          if (predicate(x, y)) return new VisiblePoint(x, y);
        }
      }

      for (let x = left; x <= right; x += currentXStep) {
        if (x % previousXStep === 0) continue;
        for (let y = top; y <= bottom; y += currentYStep) {
          if (y % previousYStep !== 0) continue;
          if (predicate(x, y)) return new VisiblePoint(x, y);
        }
      }

      previousYStep = currentYStep;
      previousXStep = currentXStep;
    }

    if (predicate(left, top)) return new VisiblePoint(left, top);
    if (predicate(right, top)) return new VisiblePoint(right, top);
    if (predicate(left, bottom)) return new VisiblePoint(left, bottom);
    if (predicate(right, bottom)) return new VisiblePoint(right, bottom);

    return null;
  }

  return searchRect(
    viewportCroppedRect.top,
    viewportCroppedRect.left,
    viewportCroppedRect.bottom,
    viewportCroppedRect.right,
    function (x, y) {
      const elementFromPoint = document.elementFromPoint(x, y);
      return elementFromPoint === element || element.contains(elementFromPoint);
    },
    Math.max(minStep, 1)
  );
}

/**
 * Determine the visible edge of an element by recursively checking the points along an axis.
 * @param {Element} element - The DOM element for which the visible edge is being determined.
 * @param {number} startOffset - The initial offset where the search begins (e.g., 0 for top/left, max for bottom/right).
 * @param {function(number): number} incrementOffset - A function to increment or decrement the offset during the search.
 * @param {function(number): Element} getOffsetElement - A function that returns the element at the specified offset.
 * @param {function(DOMRect): number} getPreviousElementEdge - A function that returns the relevant edge (e.g., top, bottom) of the previous offset element's rectangle.
 * @param {function(DOMRect): number} getElementEdge - A function that returns the relevant edge of the main element's rectangle.
 * @param {function(number): number} adjustOffset - A function to adjust the offset when a match is found (e.g., return offset, offset + 1).
 * @param {ViewportCroppedDOMRect} [viewportCroppedRect] - The ViewportCroppedDOMRect of `element`. If not provided, it will be computed.
 * @param {VisiblePoint} [visiblePoint] - A VisiblePoint in `element`. If not provided, it will be computed.
 * @returns {number|null} - The offset at which the visible edge is found, or null if no visible point is found.
 */
function getVisibleEdge(
  element,
  startOffset,
  incrementOffset,
  getOffsetElement,
  getPreviousElementEdge,
  getElementEdge,
  adjustOffset,
  viewportCroppedRect = getViewportCroppedRect(element),
  visiblePoint = getVisiblePoint(element)
) {
  if (!visiblePoint) return null;

  function checkPoint(offset, previousOffsetElement) {
    const offsetElement = getOffsetElement(offset);

    if (offsetElement === element || element.contains(offsetElement)) {
      if (!previousOffsetElement) return adjustOffset(offset);

      const previousOffsetElementRect =
        previousOffsetElement.getBoundingClientRect();
      const previousElementEdge = getPreviousElementEdge(
        previousOffsetElementRect
      );
      const elementEdge = getElementEdge(viewportCroppedRect);

      if (Math.abs(adjustOffset(offset) - previousElementEdge) < 1) {
        return previousElementEdge;
      } else if (Math.abs(adjustOffset(offset) - elementEdge) < 1) {
        return elementEdge;
      } else {
        return adjustOffset(offset);
      }
    } else {
      return checkPoint(incrementOffset(offset), offsetElement);
    }
  }

  return checkPoint(startOffset);
}

/**
 * Get the y-coordinate of a DOM element's visible top edge
 * @param {Element} element - The DOM element
 * @param {ViewportCroppedDOMRect} [viewportCroppedRect] - The ViewportCroppedDOMRect of `element`. If not provided, it will be computed.
 * @param {VisiblePoint} [visiblePoint] - A VisiblePoint in `element`. If not provided, it will be computed.
 * @returns {number} The y-coordinate of the visible top edge of `element`
 */
function getVisibleTop(
  element,
  viewportCroppedRect = getViewportCroppedRect(element),
  visiblePoint = getVisiblePoint(element)
) {
  return getVisibleEdge(
    element,
    viewportCroppedRect.top,
    (yOffset) => yOffset + 1,
    (yOffset) => document.elementFromPoint(visiblePoint.x, yOffset),
    (previousOffsetElementRect) => previousOffsetElementRect.bottom,
    (viewportCroppedRect) => viewportCroppedRect.top,
    (yOffset) => yOffset,
    viewportCroppedRect,
    visiblePoint
  );
}

/**
 * Get the y-coordinate of a DOM element's visible bottom edge
 * @param {Element} element - The DOM element
 * @param {ViewportCroppedDOMRect} [viewportCroppedRect] - The ViewportCroppedDOMRect of `element`. If not provided, it will be computed.
 * @param {VisiblePoint} [visiblePoint] - A VisiblePoint in `element`. If not provided, it will be computed.
 * @returns {number} The y-coordinate of the visible bottom edge of `element`
 */
function getVisibleBottom(
  element,
  viewportCroppedRect = getViewportCroppedRect(element),
  visiblePoint = getVisiblePoint(element)
) {
  return getVisibleEdge(
    element,
    viewportCroppedRect.bottom,
    (yOffset) => yOffset - 1,
    (yOffset) => document.elementFromPoint(visiblePoint.x, yOffset),
    (previousOffsetElementRect) => previousOffsetElementRect.top,
    (viewportCroppedRect) => viewportCroppedRect.bottom,
    (yOffset) => yOffset + 1,
    viewportCroppedRect,
    visiblePoint
  );
}

/**
 * Get the x-coordinate of a DOM element's visible left edge
 * @param {Element} element - The DOM element
 * @param {ViewportCroppedDOMRect} [viewportCroppedRect] - The ViewportCroppedDOMRect of `element`. If not provided, it will be computed.
 * @param {VisiblePoint} [visiblePoint] - A VisiblePoint in `element`. If not provided, it will be computed.
 * @returns {number} The x-coordinate of the visible left edge of `element`
 */
function getVisibleLeft(
  element,
  viewportCroppedRect = getViewportCroppedRect(element),
  visiblePoint = getVisiblePoint(element)
) {
  return getVisibleEdge(
    element,
    viewportCroppedRect.left,
    (xOffset) => xOffset + 1,
    (xOffset) => document.elementFromPoint(xOffset, visiblePoint.y),
    (previousOffsetElementRect) => previousOffsetElementRect.right,
    (viewportCroppedRect) => viewportCroppedRect.left,
    (xOffset) => xOffset,
    viewportCroppedRect,
    visiblePoint
  );
}

/**
 * Get the x-coordinate of a DOM element's visible right edge
 * @param {Element} element - The DOM element
 * @param {ViewportCroppedDOMRect} [viewportCroppedRect] - The DOMRect of `element`. If not provided, it will be computed.
 * @param {VisiblePoint} [visiblePoint] - A VisiblePoint in `element`. If not provided, it will be computed.
 * @returns {number} The x-coordinate of the visible right edge of `element`
 */
function getVisibleRight(
  element,
  viewportCroppedRect = getViewportCroppedRect(element),
  visiblePoint = getVisiblePoint(element)
) {
  return getVisibleEdge(
    element,
    viewportCroppedRect.right,
    (xOffset) => xOffset - 1,
    (xOffset) => document.elementFromPoint(xOffset, visiblePoint.y),
    (previousOffsetElementRect) => previousOffsetElementRect.left,
    (viewportCroppedRect) => viewportCroppedRect.right,
    (xOffset) => xOffset + 1,
    viewportCroppedRect,
    visiblePoint
  );
}

class VisibleDOMRect {
  constructor(top, bottom, left, right) {
    this.top = top || 0;
    this.bottom = bottom || 0;
    this.left = left || 0;
    this.right = right || 0;
    this.height = this.bottom - this.top;
    this.width = this.right - this.left;
  }
}

/**
 * Get the visible DOM rectangle of a DOM element.
 * @param {Element} element - The DOM element
 * @param {number} [minStep=16] - The minimum step in pixels to search the element for a visible point
 * @return {VisibleDOMRect}
 */
function getVisibleRect(element, minStep = 16) {
  const viewportCroppedRect = getViewportCroppedRect(element);
  const visiblePoint = getVisiblePoint(element, minStep, viewportCroppedRect);
  if (!visiblePoint) return new VisibleDOMRect();

  return new VisibleDOMRect(
    getVisibleTop(element, viewportCroppedRect, visiblePoint),
    getVisibleBottom(element, viewportCroppedRect, visiblePoint),
    getVisibleLeft(element, viewportCroppedRect, visiblePoint),
    getVisibleRight(element, viewportCroppedRect, visiblePoint)
  );
}

export {
  getVisibleRect,
  getVisibleTop,
  getVisibleBottom,
  getVisibleLeft,
  getVisibleRight,
};
