/**
 * Represents the viewport-clipped subset of an element's DOMRect rectangle.
 *
 * This class stores the coordinates for the top, bottom, left, and right edges of a rectangle,
 * and calculates the width and height based on these coordinates.
 */
class ViewportClippedDOMRect {
  /**
   * Creates an instance of ViewportClippedDOMRect.
   *
   * @param {number} top - The top edge of the rectangle.
   * @param {number} bottom - The bottom edge of the rectangle.
   * @param {number} left - The left edge of the rectangle.
   * @param {number} right - The right edge of the rectangle.
   */
  constructor(top = 0, bottom = 0, left = 0, right = 0) {
    /**
     * @type {number}
     * @description The top edge of the rectangle.
     */
    this.top = top;

    /**
     * @type {number}
     * @description The bottom edge of the rectangle.
     */
    this.bottom = bottom;

    /**
     * @type {number}
     * @description The left edge of the rectangle.
     */
    this.left = left;

    /**
     * @type {number}
     * @description The right edge of the rectangle.
     */
    this.right = right;

    /**
     * @type {number}
     * @description The height of the rectangle, calculated as `bottom - top`.
     */
    this.height = this.bottom - this.top;

    /**
     * @type {number}
     * @description The width of the rectangle, calculated as `right - left`.
     */
    this.width = this.right - this.left;
  }
}

/**
 * Get a viewport-clipped subset of an element's DOMRect rectangle.
 *
 * @param {Element} element - The DOM element.
 *
 * @returns {ViewportClippedDOMRect}
 */
function getViewportClippedBoundingClientRect(element) {
  const elementRect = element.getBoundingClientRect();

  const viewportTop = 0;
  if (elementRect.bottom < viewportTop) return new ViewportClippedDOMRect();

  const viewportLeft = 0;
  if (elementRect.right < viewportLeft) return new ViewportClippedDOMRect();

  const viewportBottom =
    Math.abs(elementRect.bottom - document.documentElement.clientHeight) < 1
      ? elementRect.bottom
      : document.documentElement.clientHeight;
  if (elementRect.top > viewportBottom) return new ViewportClippedDOMRect();

  const viewportRight =
    Math.abs(elementRect.right - document.documentElement.clientWidth) < 1
      ? elementRect.right
      : document.documentElement.clientWidth;
  if (elementRect.left > viewportRight) return new ViewportClippedDOMRect();

  return new ViewportClippedDOMRect(
    Math.max(elementRect.top, viewportTop),
    Math.min(elementRect.bottom, viewportBottom),
    Math.max(elementRect.left, viewportLeft),
    Math.min(elementRect.right, viewportRight)
  );
}

/**
 * Represents a coordinate in 2D space.
 */
class Coordinate {
  /**
   * @param {number} x - The x-coordinate.
   * @param {number} y - The y-coordinate.
   */
  constructor(x, y) {
    /**
     * @type {number}
     * @description The x-coordinate.
     */
    this.x = x;

    /**
     * @type {number}
     * @description The y-coordinate.
     */
    this.y = y;
  }
}

/**
 * Searches a rectangular area defined by the top, bottom, left, and right boundaries
 * using a binary division strategy, and returns the first point that satisfies the predicate.
 *
 * @param {number} top - The top boundary of the rectangle.
 * @param {number} bottom - The bottom boundary of the rectangle.
 * @param {number} left - The left boundary of the rectangle.
 * @param {number} right - The right boundary of the rectangle.
 * @param {function(number, number): boolean} predicate - A function that takes x and y coordinates and returns a boolean indicating whether the point satisfies the condition.
 * @param {number} [maxDivisions=8] - The maximum number of divisions to perform. Defaults to `8`.
 *
 * @return {Coordinate|null} An instance of the `Coordinate` class, or `null` if no point satisfies the predicate within the maximum divisions.
 */
function binarySearchRect(
  top,
  bottom,
  left,
  right,
  predicate,
  maxDivisions = 8
) {
  let previousYStep = bottom - top;
  if (!previousYStep) return null;
  let previousXStep = right - left;
  if (!previousXStep) return null;

  let divisions = 0;
  while (divisions < maxDivisions) {
    divisions++;
    let currentYStep = previousYStep / 2;
    let currentXStep = previousXStep / 2;

    for (let y = top; y <= bottom; y += currentYStep) {
      if (y % previousYStep === 0) continue;
      for (let x = left; x <= right; x += currentXStep) {
        if (predicate(x, y)) return new Coordinate(x, y);
      }
    }

    for (let x = left; x <= right; x += currentXStep) {
      if (x % previousXStep === 0) continue;
      for (let y = top; y <= bottom; y += currentYStep) {
        if (y % previousYStep !== 0) continue;
        if (predicate(x, y)) return new Coordinate(x, y);
      }
    }

    previousYStep = currentYStep;
    previousXStep = currentXStep;
  }

  return null;
}

/**
 * Represents the visible, viewport-clipped subset of an element's DOMRect rectangle.
 *
 * This class stores the coordinates for the top, bottom, left, and right edges of a rectangle,
 * and calculates the width and height based on these coordinates.
 */
class VisibleDOMRect {
  /**
   * Creates an instance of VisibleDOMRect.
   *
   * @param {number} top - The top edge of the rectangle.
   * @param {number} bottom - The bottom edge of the rectangle.
   * @param {number} left - The left edge of the rectangle.
   * @param {number} right - The right edge of the rectangle.
   */
  constructor(top, bottom, left, right) {
    /**
     * @type {number}
     * @description The top edge of the rectangle.
     */
    this.top = top || 0;

    /**
     * @type {number}
     * @description The bottom edge of the rectangle.
     */
    this.bottom = bottom || 0;

    /**
     * @type {number}
     * @description The left edge of the rectangle.
     */
    this.left = left || 0;

    /**
     * @type {number}
     * @description The right edge of the rectangle.
     */
    this.right = right || 0;

    /**
     * @type {number}
     * @description The height of the rectangle, calculated as `bottom - top`.
     */
    this.height = this.bottom - this.top;

    /**
     * @type {number}
     * @description The width of the rectangle, calculated as `right - left`.
     */
    this.width = this.right - this.left;
  }
}

/**
 * Get the visible, viewport-clipped subset of a DOM element's bounding client rectangle.
 *
 * @param {Element} element - The DOM element
 * @param {number} [maxDivisions] - The maximum number of times to divide the element in half in search of a visible point
 *
 * @return {VisibleDOMRect}
 */
function getVisibleRect(element, maxDivisions) {
  const viewportClippedRect = getViewportClippedBoundingClientRect(element);

  const visiblePoint = binarySearchRect(
    viewportClippedRect.top,
    viewportClippedRect.bottom,
    viewportClippedRect.left,
    viewportClippedRect.right,
    function (x, y) {
      const elementFromPoint = document.elementFromPoint(x, y);
      return elementFromPoint === element || element.contains(elementFromPoint);
    },
    maxDivisions
  );

  if (!visiblePoint) return new VisibleDOMRect();

  const top = getVisibleEdge(
    viewportClippedRect.top,
    (yOffset) => yOffset + 0.1,
    (yOffset) => yOffset > visiblePoint.y,
    (offsetElement) => offsetElement.getBoundingClientRect().bottom + 1,
    (yOffset) => document.elementFromPoint(visiblePoint.x, yOffset),
    (previousOffsetElementRect) => previousOffsetElementRect.bottom
  );

  const bottom = getVisibleEdge(
    viewportClippedRect.bottom,
    (yOffset) => yOffset - 0.1,
    (yOffset) => yOffset < visiblePoint.y,
    (offsetElement) => offsetElement.getBoundingClientRect().top - 1,
    (yOffset) => document.elementFromPoint(visiblePoint.x, yOffset),
    (previousOffsetElementRect) => previousOffsetElementRect.top
  );

  const left = getVisibleEdge(
    viewportClippedRect.left,
    (xOffset) => xOffset + 0.1,
    (xOffset) => xOffset > visiblePoint.x,
    (offsetElement) => offsetElement.getBoundingClientRect().right + 1,
    (xOffset) => document.elementFromPoint(xOffset, visiblePoint.y),
    (previousOffsetElementRect) => previousOffsetElementRect.right
  );

  const right = getVisibleEdge(
    viewportClippedRect.right,
    (xOffset) => xOffset - 0.1,
    (xOffset) => xOffset < visiblePoint.x,
    (offsetElement) => offsetElement.getBoundingClientRect().left - 1,
    (xOffset) => document.elementFromPoint(xOffset, visiblePoint.y),
    (previousOffsetElementRect) => previousOffsetElementRect.left
  );

  return new VisibleDOMRect(top, bottom, left, right);

  /**
   * Determine the visible edge of an element by recursively checking the points along an axis.
   *
   * @param {number} startOffset - The initial offset where the search begins.
   * @param {function(number): number} adjustStartOffset - A function to increment or decrement the `startOffset` at the beginning of the search.
   * @param {function(number): boolean} exceedsMaxOffset - A function that takes an offset and returns a boolean indicating whether the point exceeds the maximum allowed offset.
   * @param {function(Element): number} incrementOffset - A function to increment or decrement the offset during the search.
   * @param {function(number): Element} getOffsetElement - A function that returns the element at the specified offset.
   * @param {function(DOMRect): number} getPreviousOffsetElementEdge - A function that returns the relevant edge (e.g., top, bottom) of the previous offset element's rectangle.
   *
   * @returns {(number|null)} - The offset at which the visible edge is found, or null if no visible edge is found.
   */
  function getVisibleEdge(
    startOffset,
    adjustStartOffset,
    exceedsMaxOffset,
    incrementOffset,
    getOffsetElement,
    getPreviousOffsetElementEdge
  ) {
    function checkPoint(offset, previousOffsetElement) {
      const offsetElement = getOffsetElement(offset);
      if (!offsetElement) {
        return !previousOffsetElement
          ? checkPoint(adjustStartOffset(offset))
          : null;
      }

      if (offsetElement === element || element.contains(offsetElement)) {
        return !previousOffsetElement
          ? startOffset
          : getPreviousOffsetElementEdge(
              previousOffsetElement.getBoundingClientRect()
            );
      } else {
        const nextOffset = incrementOffset(offsetElement);
        return exceedsMaxOffset(nextOffset)
          ? checkPoint(adjustStartOffset(offset))
          : checkPoint(nextOffset, offsetElement);
      }
    }

    return checkPoint(adjustStartOffset(startOffset));
  }
}

export { getVisibleRect };
