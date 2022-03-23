import { isPrimaryInput } from "./utilities.js";

export class MomentumScroller {
  static allMomentumScrollers = [];
  static pointerIsDown;

  #scrollContainer;
  #grabCursor;
  #grabbingCursor;
  #stopScrollOnPointerDown;
  #preventDefaultSelectors;
  #onMomentumScrollInitialActivation;
  #onMomentumScrollActivation;
  #onMomentumScrollDeactivation;
  #onMomentumScrollPointerDown;
  #onMomentumScrollPointerUp;
  #onMomentumScrollStart;
  #onMomentumScroll;
  #onMomentumScrollStop;

  constructor(
    scrollContainer,
    {
      grabCursor = "grab",
      grabbingCursor = "grabbing",
      stopScrollOnPointerDown = true,
      preventDefaultSelectors = [],
      onMomentumScrollInitialActivation,
      onMomentumScrollActivation,
      onMomentumScrollDeactivation,
      onMomentumScrollPointerDown,
      onMomentumScrollPointerUp,
      onMomentumScrollStart,
      onMomentumScroll,
      onMomentumScrollStop,
    } = {}
  ) {
    if (!(scrollContainer instanceof Element))
      throw new TypeError("scrollContainer must be an instance of Element");

    if (typeof grabCursor != "string")
      throw new TypeError(
        "grabCursor must be of type string and should be a value appropriate for the CSS Cursor property (https://developer.mozilla.org/en-US/docs/Web/CSS/cursor)"
      );

    if (typeof grabbingCursor != "string")
      throw new TypeError(
        "grabbingCursor must be of type string and should be a value appropriate for the CSS Cursor property (https://developer.mozilla.org/en-US/docs/Web/CSS/cursor)"
      );

    if (typeof stopScrollOnPointerDown != "boolean")
      throw new TypeError("stopScrollOnPointerDown must be of type boolean");

    if (Array.isArray(preventDefaultSelectors)) {
      if (
        preventDefaultSelectors.some(
          (cssSelector) => typeof cssSelector != "string"
        )
      )
        throw new TypeError(
          "preventDefaultSelectors must all be of type string"
        );
    } else if (!Array.isArray(preventDefaultSelectors)) {
      throw new TypeError("preventDefaultSelectors must be of type array");
    }

    if (
      (onMomentumScrollInitialActivation &&
        typeof onMomentumScrollInitialActivation != "function") ||
      (onMomentumScrollActivation &&
        typeof onMomentumScrollActivation != "function") ||
      (onMomentumScrollDeactivation &&
        typeof onMomentumScrollDeactivation != "function") ||
      (onMomentumScrollPointerDown &&
        typeof onMomentumScrollPointerDown != "function") ||
      (onMomentumScrollPointerUp &&
        typeof onMomentumScrollPointerUp != "function") ||
      (onMomentumScrollStart && typeof onMomentumScrollStart != "function") ||
      (onMomentumScroll && typeof onMomentumScroll != "function") ||
      (onMomentumScrollStop && typeof onMomentumScrollStop != "function")
    )
      throw new TypeError("Callbacks must be of type function");

    this.#scrollContainer = scrollContainer;
    this.#grabCursor = grabCursor;
    this.#grabbingCursor = grabbingCursor;
    this.#stopScrollOnPointerDown = stopScrollOnPointerDown;
    this.#preventDefaultSelectors = preventDefaultSelectors;
    this.#onMomentumScrollInitialActivation = onMomentumScrollInitialActivation;
    this.#onMomentumScrollActivation = onMomentumScrollActivation;
    this.#onMomentumScrollDeactivation = onMomentumScrollDeactivation;
    this.#onMomentumScrollPointerDown = onMomentumScrollPointerDown;
    this.#onMomentumScrollPointerUp = onMomentumScrollPointerUp;
    this.#onMomentumScrollStart = onMomentumScrollStart;
    this.#onMomentumScroll = onMomentumScroll;
    this.#onMomentumScrollStop = onMomentumScrollStop;

    MomentumScroller.allMomentumScrollers.push(this);
  }

  #deceleration;

  changeDeceleration(ordinalName) {
    this.#deceleration =
      this.getDecelerationOrdinalValueFromOrdinalName(ordinalName) ??
      this.#deceleration;
  }

  getDecelerationOrdinalValueFromOrdinalName(ordinalName) {
    const decelerationDictionary = [
      {
        ordinalName: "zero",
        ordinalValue: 0,
      },
      {
        ordinalName: "low",
        ordinalValue: 0.0001875,
      },
      {
        ordinalName: "medium",
        ordinalValue: 0.00075,
      },
      {
        ordinalName: "high",
        ordinalValue: 0.006,
      },
      {
        ordinalName: "infinite",
        ordinalValue: Infinity,
      },
    ];

    const decelerationMatch = decelerationDictionary.find(
      (deceleration) => deceleration.ordinalName == ordinalName
    );
    if (decelerationMatch) return decelerationMatch.ordinalValue;
  }

  #active = false;

  get isActive() {
    return this.#active;
  }

  #initialActivation = true;
  #pointerDownAbortController = new AbortController();
  #xAxisIsScrollable;
  #yAxisIsScrollable;
  #scrollerType;

  activate() {
    if (this.#deceleration == undefined) this.changeDeceleration("medium");

    this.#scrollContainer.style.setProperty("cursor", this.#grabCursor);

    this.#xAxisIsScrollable =
      this.#scrollContainer.scrollWidth > this.#scrollContainer.clientWidth;
    this.#yAxisIsScrollable =
      this.#scrollContainer.scrollHeight > this.#scrollContainer.clientHeight;

    this.#scrollerType =
      this.#xAxisIsScrollable && this.#yAxisIsScrollable
        ? "horizontal-and-vertical"
        : this.#xAxisIsScrollable && !this.#yAxisIsScrollable
        ? "horizontal-only"
        : !this.#xAxisIsScrollable && this.#yAxisIsScrollable
        ? "vertical-only"
        : "none";

    if (this.#scrollerType == "none")
      throw Error("Container is not scrollable");

    if (this.#onMomentumScrollActivation)
      this.#onMomentumScrollActivation(
        this.getEventData({
          eventType: "onMomentumScrollActivation",
        })
      );

    if (this.#initialActivation && this.#onMomentumScrollInitialActivation)
      this.#onMomentumScrollInitialActivation(
        this.getEventData({
          eventType: "onMomentumScrollInitialActivation",
        })
      );

    this.#scrollContainer.addEventListener(
      "pointerdown",
      (event) => this.pointerDownHandler(event),
      { signal: this.#pointerDownAbortController.signal }
    );

    this.#initialActivation = false;
    this.#active = true;
  }

  deactivate() {
    if (this.#onMomentumScrollDeactivation)
      this.#onMomentumScrollDeactivation(
        this.getEventData({
          eventType: "onMomentumScrollDeactivation",
        })
      );

    this.#scrollContainer.style.removeProperty("cursor");

    this.#pointerDownAbortController.abort();
    this.#pointerDownAbortController = new AbortController();
    this.#pointerMoveUpCancelAbortController.abort();
    this.#pointerMoveUpCancelAbortController = new AbortController();

    this.#active = false;
  }

  #paused = false;

  pause() {
    this.#paused = true;
  }

  unpause() {
    this.#paused = false;
  }

  #pointerMoveUpCancelAbortController = new AbortController();
  #pointerMoveLog = [];
  #pointerIsDown;

  get pointerIsDown() {
    return this.#pointerIsDown;
  }

  pointerDownHandler(event) {
    if (MomentumScroller.pointerIsDown) return;

    if (this.#preventDefaultSelectors) {
      if (
        this.#preventDefaultSelectors.some((cssSelector) =>
          event.target.closest(cssSelector)
        )
      )
        return;
    }

    const inputButtonIsPrimary = isPrimaryInput(event);
    if (!inputButtonIsPrimary) return;

    MomentumScroller.pointerIsDown = true;
    this.#pointerIsDown = true;

    this.#scrollContainer.style.setProperty("cursor", this.#grabbingCursor);

    if (this.#stopScrollOnPointerDown)
      this.abortPriorScrolls({
        abortedBy: "Pointer down on scroll container",
      });

    if (this.#onMomentumScrollPointerDown)
      this.#onMomentumScrollPointerDown(
        this.getEventData({
          eventType: "onMomentumScrollPointerDown",
        })
      );

    let movementX = 0;
    let previousScreenX = event.screenX; // Safari returns undefined for event.movementX
    let movementY = 0;
    let previousScreenY = event.screenY; // Safari returns undefined for event.movementY

    this.#scrollContainer.addEventListener(
      "pointermove",
      (event) => {
        if (!this.#paused)
          this.#scrollContainer.setPointerCapture(event.pointerId);

        if (this.#xAxisIsScrollable) {
          movementX = event.screenX - previousScreenX;
          previousScreenX = event.screenX;
        }

        if (this.#yAxisIsScrollable) {
          movementY = event.screenY - previousScreenY;
          previousScreenY = event.screenY;
        }

        if (this.#paused) return;
        if (this.#xAxisIsScrollable)
          this.#scrollContainer.scrollLeft -= movementX;
        if (this.#yAxisIsScrollable)
          this.#scrollContainer.scrollTop -= movementY;

        this.#pointerMoveLog.push([
          event.screenX,
          event.screenY,
          event.timeStamp,
        ]);
      },
      { signal: this.#pointerMoveUpCancelAbortController.signal }
    );

    this.#scrollContainer.addEventListener(
      "pointerup",
      (event) => this.pointerUpHandler(event),
      {
        once: true,
        signal: this.#pointerMoveUpCancelAbortController.signal,
      }
    );

    this.#scrollContainer.addEventListener(
      "pointercancel",
      (event) => this.pointerUpHandler(event),
      {
        once: true,
        signal: this.#pointerMoveUpCancelAbortController.signal,
      }
    );
  }

  pointerUpHandler(event) {
    MomentumScroller.pointerIsDown = false;
    this.#pointerIsDown = false;

    this.#scrollContainer.style.setProperty("cursor", this.#grabCursor);

    if (this.#onMomentumScrollPointerUp)
      this.#onMomentumScrollPointerUp(
        this.getEventData({
          eventType: "onMomentumScrollPointerUp",
        })
      );

    this.#pointerMoveUpCancelAbortController.abort();
    this.#pointerMoveUpCancelAbortController = new AbortController();

    if (this.#paused) return;

    const endTime = event.timeStamp;

    const meetsMomentumScrollCriteria =
      this.#pointerMoveLog.length > 0 &&
      endTime - this.#pointerMoveLog[this.#pointerMoveLog.length - 1][2] < 100;

    let endPositionX;
    let velocityX = 0;
    if (this.#xAxisIsScrollable) {
      endPositionX = event.screenX;
      velocityX = getVelocity(this.#pointerMoveLog, 0, endPositionX);
    }

    let endPositionY;
    let velocityY = 0;
    if (this.#yAxisIsScrollable) {
      endPositionY = event.screenY;
      velocityY = getVelocity(this.#pointerMoveLog, 1, endPositionY);
    }

    function getVelocity(movementLog, axisIndex, endPosition) {
      if (!meetsMomentumScrollCriteria) return 0;

      for (let i = 1; i < 5; i++) {
        if (movementLog.length < i) return 0;

        const startPosition = movementLog[movementLog.length - i][axisIndex];
        const startTime = movementLog[movementLog.length - i][2];

        const positionChange = endPosition - startPosition;
        const timeChange = endTime - startTime;

        if (positionChange && timeChange) {
          return positionChange / timeChange;
        }
      }

      return 0;
    }

    this.momentumScroll({
      velocityX: velocityX,
      velocityY: velocityY,
    });

    this.#pointerMoveLog = [];
  }

  #isCurrentlyScrolling = false;

  get isCurrentlyScrolling() {
    return this.#isCurrentlyScrolling;
  }

  #scrollDirectionPreviousY;
  #scrollDirectionPreviousX;
  #scrollDistance;
  #scrollDuration;
  #scrollDurationPrevious;
  #scrollVelocityMultiplierX = 1;
  #scrollVelocityMultiplierY = 1;
  #scrollRafId;
  #scrollStartingPointX;
  #scrollStartingPointY;
  #scrollTimestampPrevious;
  #startTime;
  #elapsedTime;
  #resolve;

  momentumScroll(
    { velocityX = 0, velocityY = 0 },
    newMomentumScroll = true,
    deceleration,
    currentTime
  ) {
    const scrollContainerClientRects =
      this.#scrollContainer.getBoundingClientRect();

    const scrollContainerBottomEdge =
      this.#scrollContainer.scrollHeight - this.#scrollContainer.scrollTop;
    const scrollContainerTopEdge = 0;
    const scrollContainerRightEdge =
      this.#scrollContainer.scrollWidth - this.#scrollContainer.scrollLeft;
    const scrollContainerLeftEdge = 0;

    const reachedTopEdge =
      this.#scrollContainer.scrollTop == scrollContainerTopEdge;
    const reachedBottomEdge =
      Math.abs(scrollContainerClientRects.height - scrollContainerBottomEdge) <
      1;
    const reachedLeftEdge =
      this.#scrollContainer.scrollLeft == scrollContainerLeftEdge;
    const reachedRightEdge =
      Math.abs(scrollContainerClientRects.width - scrollContainerRightEdge) < 1;

    const reachedEdgeOfVerticalOnlyScroller =
      (reachedTopEdge || reachedBottomEdge) &&
      this.#scrollerType == "vertical-only";

    const reachedEdgeOfHorizontalOnlyScroller =
      (reachedLeftEdge || reachedRightEdge) &&
      this.#scrollerType == "horizontal-only";

    const reachedEdgeOfOneDimensionalScroller =
      reachedEdgeOfVerticalOnlyScroller || reachedEdgeOfHorizontalOnlyScroller;

    const reachedTopLeftVertex = reachedTopEdge && reachedLeftEdge;
    const reachedTopRightVertex = reachedTopEdge && reachedRightEdge;
    const reachedBottomRightVertex = reachedBottomEdge && reachedRightEdge;
    const reachedBottomLeftVertex = reachedBottomEdge && reachedLeftEdge;

    const reachedVertexOfTwoDimensionalScroller =
      (reachedTopLeftVertex ||
        reachedTopRightVertex ||
        reachedBottomRightVertex ||
        reachedBottomLeftVertex) &&
      this.#scrollerType == "horizontal-and-vertical";

    if (newMomentumScroll) {
      if (!velocityX && !velocityY) {
        this.abortPriorScrolls({ abortedBy: "New momentum scroll" });
        return new Promise((resolve) => {
          this.#resolve = resolve;
          return this.abortPriorScrolls({
            abortedBy: "No velocity in X and Y direction",
          });
        });
      }

      if (!Number.isFinite(velocityX) || !Number.isFinite(velocityY)) {
        this.abortPriorScrolls({ abortedBy: "New momentum scroll" });
        return new Promise((resolve) => {
          this.#resolve = resolve;
          return this.abortPriorScrolls({
            abortedBy: "TypeError: X and Y must be finite numbers",
          });
        });
      }

      this.abortPriorScrolls({ abortedBy: "New momentum scroll" });

      const velocityHypotenuse = Math.hypot(velocityX, velocityY);

      this.#scrollDuration = velocityHypotenuse / this.#deceleration;
      this.#scrollDistance = (velocityHypotenuse * this.#scrollDuration) / 2;

      const scrollDistanceX =
        this.#scrollDistance * (Math.abs(velocityX) / velocityHypotenuse);
      const scrollDistanceY =
        this.#scrollDistance * (Math.abs(velocityY) / velocityHypotenuse);

      const minimumScrollableDistance = 1 / devicePixelRatio;
      const xDistanceBelowMinimum = scrollDistanceX < minimumScrollableDistance;
      const yDistanceBelowMinimum = scrollDistanceY < minimumScrollableDistance;

      if (
        (this.#scrollerType == "horizontal-only" && xDistanceBelowMinimum) ||
        (this.#scrollerType == "vertical-only" && yDistanceBelowMinimum) ||
        (this.#scrollerType == "horizontal-and-vertical" &&
          xDistanceBelowMinimum &&
          yDistanceBelowMinimum)
      ) {
        this.abortPriorScrolls({ abortedBy: "New momentum scroll" });
        return new Promise((resolve) => {
          this.#resolve = resolve;
          return this.abortPriorScrolls({
            abortedBy: "Scroll distance < minimum scrollable distance",
          });
        });
      }

      const scrollTimestamp = Date.now();
      this.#scrollStartingPointY = this.#scrollContainer.scrollTop;
      this.#scrollStartingPointX = this.#scrollContainer.scrollLeft;

      const timeSinceLastScroll =
        scrollTimestamp - this.#scrollTimestampPrevious;
      const halfTheDurationOfPreviousScroll =
        0.5 * this.#scrollDurationPrevious;
      const timeSinceLastScrollAbortion =
        scrollTimestamp - this.#abortionTimestamp;
      const isWithinTimeWindow =
        timeSinceLastScroll < halfTheDurationOfPreviousScroll &&
        timeSinceLastScrollAbortion < 500;

      const scrollDirectionX = Math.sign(velocityX);
      if (scrollDirectionX) {
        const sameDirectionX =
          scrollDirectionX == this.#scrollDirectionPreviousX;
        const multipleQuickSameDirectionXScrolls =
          !reachedLeftEdge &&
          !reachedRightEdge &&
          sameDirectionX &&
          isWithinTimeWindow;

        this.#scrollVelocityMultiplierX = multipleQuickSameDirectionXScrolls
          ? this.#scrollVelocityMultiplierX + 1
          : 1;
      } else if (!scrollDirectionX) {
        this.#scrollVelocityMultiplierX = 1;
      }

      const scrollDirectionY = Math.sign(velocityY);
      if (scrollDirectionY) {
        const sameScrollDirectionY =
          scrollDirectionY == this.#scrollDirectionPreviousY;
        const multipleQuickSameDirectionYScrolls =
          !reachedTopEdge &&
          !reachedBottomEdge &&
          sameScrollDirectionY &&
          isWithinTimeWindow;

        this.#scrollVelocityMultiplierY = multipleQuickSameDirectionYScrolls
          ? this.#scrollVelocityMultiplierY + 1
          : 1;
      } else if (!scrollDirectionY) {
        this.#scrollVelocityMultiplierY = 1;
      }

      this.#scrollDurationPrevious = this.#scrollDuration;
      this.#scrollDirectionPreviousX = scrollDirectionX;
      this.#scrollDirectionPreviousY = scrollDirectionY;
      this.#scrollTimestampPrevious = scrollTimestamp;

      const multiplierAdjustedVelocityX =
        velocityX * this.#scrollVelocityMultiplierX;
      const multiplierAdjustedVelocityY =
        velocityY * this.#scrollVelocityMultiplierY;

      return new Promise((resolve) => {
        this.#resolve = resolve;
        this.#scrollRafId = requestAnimationFrame((currentTime) => {
          this.momentumScroll(
            {
              velocityX: multiplierAdjustedVelocityX,
              velocityY: multiplierAdjustedVelocityY,
            },
            false,
            this.#deceleration,
            currentTime
          );
        });
      });
    }

    if (!this.#startTime) {
      this.#startTime = currentTime;
      if (this.#onMomentumScrollStart)
        this.#onMomentumScrollStart(
          this.getEventData({
            eventType: "onMomentumScrollStart",
          })
        );
    }

    this.#elapsedTime = currentTime - this.#startTime;
    const elapsedTimeRatio = Math.min(
      this.#elapsedTime / this.#scrollDuration,
      1
    );

    if (!this.#active) {
      return this.abortPriorScrolls({
        abortedBy: "Momentum scroller deactivation",
      });
    }

    const velocityHypotenuse = Math.hypot(velocityX, velocityY);

    if (this.#xAxisIsScrollable) {
      const nextScrollX =
        this.#scrollStartingPointX +
        (-velocityX * this.#elapsedTime +
          Math.sign(velocityX) *
            0.5 *
            deceleration *
            (Math.abs(velocityX) / velocityHypotenuse) *
            Math.pow(this.#elapsedTime, 2));
      this.#scrollContainer.scrollLeft = nextScrollX;
    }

    if (this.#yAxisIsScrollable) {
      const nextScrollY =
        this.#scrollStartingPointY +
        (-velocityY * this.#elapsedTime +
          Math.sign(velocityY) *
            0.5 *
            deceleration *
            (Math.abs(velocityY) / velocityHypotenuse) *
            Math.pow(this.#elapsedTime, 2));
      this.#scrollContainer.scrollTop = nextScrollY;
    }

    if (this.#onMomentumScroll)
      this.#onMomentumScroll(
        this.getEventData({ eventType: "onMomentumScroll" })
      );

    if (
      elapsedTimeRatio < 1 &&
      !reachedEdgeOfOneDimensionalScroller &&
      !reachedVertexOfTwoDimensionalScroller
    ) {
      this.#isCurrentlyScrolling = true;
      this.#scrollRafId = requestAnimationFrame((currentTime) => {
        this.momentumScroll(
          { velocityX: velocityX, velocityY: velocityY },
          false,
          deceleration,
          currentTime
        );
      });
    } else if (
      elapsedTimeRatio >= 1 ||
      Number.isNaN(elapsedTimeRatio) ||
      reachedEdgeOfOneDimensionalScroller ||
      reachedVertexOfTwoDimensionalScroller
    ) {
      const resolveData = this.getEventData();

      this.#isCurrentlyScrolling = false;
      this.#scrollVelocityMultiplierX = 1;
      this.#scrollVelocityMultiplierY = 1;
      this.#scrollDirectionPreviousX = null;
      this.#scrollDirectionPreviousY = null;
      this.#scrollTimestampPrevious = null;

      return this.abortPriorScrolls(resolveData);
    }
  }

  toggleOnOff() {
    if (this.#active) {
      this.deactivate();
    } else if (!this.#active) {
      this.activate();
    }
  }

  #abortionTimestamp;

  abortPriorScrolls(extraData = {}) {
    if (this.#resolve) this.#resolve(this.getEventData(extraData));

    if (this.#onMomentumScrollStop) {
      this.#onMomentumScrollStop(
        this.getEventData(
          Object.assign(extraData, { eventType: "onMomentumScrollStop" })
        )
      );
    }

    this.#abortionTimestamp = Date.now();
    cancelAnimationFrame(this.#scrollRafId);
    this.#startTime = null;
    this.#scrollStartingPointX = null;
    this.#scrollStartingPointY = null;
    this.#scrollDuration = null;
    this.#elapsedTime = null;
    this.#resolve = null;
  }

  getEventData(extraData) {
    const eventData = {
      abortedBy: null,
      xInitial: this.#scrollStartingPointX,
      xFinal: this.#scrollContainer.scrollLeft,
      yInitial: this.#scrollStartingPointY,
      yFinal: this.#scrollContainer.scrollTop,
      deceleration: this.#deceleration,
      distance: Math.hypot(
        Math.abs(this.#scrollStartingPointX - this.#scrollContainer.scrollLeft),
        Math.abs(this.#scrollStartingPointY - this.#scrollContainer.scrollTop)
      ),
      duration: this.#scrollDuration,
      elapsedTime: this.#elapsedTime,
      velocityMultiplierX: this.#scrollVelocityMultiplierX,
      velocityMultiplierY: this.#scrollVelocityMultiplierY,
      scrollContainer: this.#scrollContainer,
      momentumScroller: this,
    };

    if (extraData && typeof extraData == "object")
      Object.assign(eventData, extraData);

    return eventData;
  }
}
