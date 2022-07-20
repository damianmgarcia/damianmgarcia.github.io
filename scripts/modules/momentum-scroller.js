import {
  getDeviceHeuristics,
  getTransformProperties,
  isPrimaryInput,
  ScrollContainerTools,
  validateArgument,
} from "./utilities.js";

const deviceHeuristics = getDeviceHeuristics();
const scrollerCreationKey = Symbol("scrollerCreationKey");

class MomentumScroller {
  static #scrollerMap = new Map();

  static autoCreateScrollers({ rootSelector = ":root", activate = true } = {}) {
    document
      .querySelectorAll(`${rootSelector}, ${rootSelector} *`)
      .forEach((element) => {
        const scrollerAlreadyExists = this.#scrollerMap.has(element);
        if (scrollerAlreadyExists) return;

        const { xAxisIsScrollable, yAxisIsScrollable } =
          ScrollContainerTools.getScrollableAxes(element);

        if (xAxisIsScrollable || yAxisIsScrollable)
          this.createScroller(element, activate);
      });

    return this;
  }

  static createScroller(scrollContainer, activate = true) {
    if (deviceHeuristics.isTouchScreen)
      throw new Error(
        "MomentumScroller instantiation blocked. Due to conflicts between native momentum scrolling systems and MomentumScroller.js, touch screen devices, such as this one, are not supported."
      );

    validateArgument("scrollContainer", scrollContainer, {
      allowedPrototypes: [Element],
    });

    if (this.#scrollerMap.has(scrollContainer))
      throw new Error(
        "A MomentumScroller instance for this scrollContainer already exists"
      );

    const scroller = new this(scrollContainer, scrollerCreationKey);

    if (activate) scroller.activate();

    this.#scrollerMap.set(scrollContainer, scroller);

    return scroller;
  }

  static getScroller(scrollContainer) {
    return this.#scrollerMap.get(scrollContainer);
  }

  static getAllScrollers() {
    return Array.from(this.#scrollerMap.values());
  }

  #scrollContainer;
  #decelerationLevel = "medium";
  #borderBouncinessLevel = "medium";
  #grabCursor = "grab";
  #grabbingCursor = "grabbing";
  #allowHorizontalScrolling = true;
  #allowVerticalScrolling = true;
  #selectorsOfDescendantsTheScrollerShouldIgnore = [
    "input[type=email]",
    "input[type=number]",
    "input[type=password]",
    "input[type=range]",
    "input[type=search]",
    "input[type=tel]",
    "input[type=text]",
    "input[type=url]",
    "textarea",
  ];
  #selectorsOfDescendantsThatReactToClicks = [
    "a",
    "button",
    "details",
    "input[type=button]",
    "input[type=checkbox]",
    "input[type=color]",
    "input[type=date]",
    "input[type=datetime-local]",
    "input[type=file]",
    "input[type=image]",
    "input[type=month]",
    "input[type=radio]",
    "input[type=reset]",
    "input[type=submit]",
    "input[type=time]",
    "input[type=week]",
    "summary",
  ];
  #selectorsOfDescendantsThatUseHorizontalOnlyTouchScrolling = [];
  #selectorsOfDescendantsThatUseVerticalOnlyTouchScrolling = [];
  #decelerationLevelToQuantityMap = new Map([
    ["none", 0],
    ["minimum", 0.00004],
    ["low", 0.0002],
    ["medium", 0.001],
    ["high", 0.005],
    ["maximum", 0.025],
  ]);
  #borderBouncinessLevelToQuantityMap = new Map([
    ["none", Infinity],
    ["minimum", 0.02],
    ["low", 0.01],
    ["medium", 0.005],
    ["high", 0.00375],
    ["maximum", 0.0025],
  ]);

  constructor(scrollContainer, key) {
    validateArgument("key", key, {
      allowedValues: [scrollerCreationKey],
      customErrorMessage:
        "Please use the MomentumScroller.autoCreateScrollers static method or the MomentumScroller.createScroller static method to create scrollers",
    });

    this.#scrollContainer = scrollContainer;

    this.#scrollContainer.classList.add("momentum-scroller");

    this.#scrollContainer.addEventListener("pointerdown", (event) =>
      this.#pointerDownHandler(event)
    );

    this.#scrollContainer.addEventListener("smoothScrollerScrollStart", () => {
      if (this.#scrollResolve)
        this.#stopScroll({
          interruptedBy: "Smooth scroll on same container",
        });
    });

    this.#scrollContainer.querySelectorAll("*").forEach((element) =>
      element.addEventListener("dragstart", (event) => {
        if (this.#active) event.preventDefault();
      })
    );
  }

  setDecelerationLevel(decelerationLevel = "medium") {
    validateArgument("decelerationLevel", decelerationLevel, {
      allowedValues: Array.from(this.#decelerationLevelToQuantityMap.keys()),
    });

    this.#decelerationLevel = decelerationLevel;
    return this;
  }

  setBorderBouncinessLevel(borderBouncinessLevel = "medium") {
    validateArgument("borderBouncinessLevel", borderBouncinessLevel, {
      allowedValues: Array.from(
        this.#borderBouncinessLevelToQuantityMap.keys()
      ),
    });

    this.#borderBouncinessLevel = borderBouncinessLevel;
    return this;
  }

  setGrabCursor(grabCursor = "grab") {
    validateArgument("grabCursor", grabCursor, {
      allowedTypes: ["string"],
      customErrorMessage:
        "grabCursor must be a String and should be appropriate for the CSS Cursor property (https://developer.mozilla.org/en-US/docs/Web/CSS/cursor)",
    });

    if (!this.#pointerIsDown && this.#active)
      this.#scrollContainer.style.setProperty("cursor", grabCursor);

    this.#grabCursor = grabCursor;
    return this;
  }

  setGrabbingCursor(grabbingCursor = "grabbing") {
    validateArgument("grabbingCursor", grabbingCursor, {
      allowedTypes: ["string"],
      customErrorMessage:
        "grabbingCursor must be a String and should be appropriate for the CSS Cursor property (https://developer.mozilla.org/en-US/docs/Web/CSS/cursor)",
    });

    if (this.#pointerIsDown && this.#active)
      this.#scrollContainer.style.setProperty("cursor", grabbingCursor);

    this.#grabbingCursor = grabbingCursor;
    return this;
  }

  setAllowHorizontalScrolling(allowHorizontalScrolling = true) {
    validateArgument("allowHorizontalScrolling", allowHorizontalScrolling, {
      allowedTypes: ["boolean"],
    });

    this.#allowHorizontalScrolling = allowHorizontalScrolling;
    return this;
  }

  setAllowVerticalScrolling(allowVerticalScrolling = true) {
    validateArgument("allowVerticalScrolling", allowVerticalScrolling, {
      allowedTypes: ["boolean"],
    });

    this.#allowVerticalScrolling = allowVerticalScrolling;
    return this;
  }

  setSelectorsOfDescendantsTheScrollerShouldIgnore(
    selectors = [],
    keepCurrentSelectors = true
  ) {
    validateArgument(
      "selectorsOfDescendantsTheScrollerShouldIgnore selectors",
      selectors,
      {
        allowedTypes: ["array"],
      }
    );

    selectors.forEach((selector) => {
      validateArgument(
        "selectorsOfDescendantsTheScrollerShouldIgnore selectors",
        selector,
        {
          allowedTypes: ["string"],
        }
      );
      validateArgument(
        "selectorsOfDescendantsTheScrollerShouldIgnore selectors",
        selector.length,
        {
          allowedMin: 1,
          customErrorMessage:
            "Empty strings not allowed in selectorsOfDescendantsTheScrollerShouldIgnore selectors",
        }
      );
    });

    const currentSlectors = this.#selectorsOfDescendantsTheScrollerShouldIgnore;

    selectors = keepCurrentSelectors
      ? [...new Set([...selectors, ...currentSlectors])]
      : selectors;

    this.#selectorsOfDescendantsTheScrollerShouldIgnore = selectors;
    return this;
  }

  setSelectorsOfDescendantsThatReactToClicks(
    selectors = [],
    keepCurrentSelectors = true
  ) {
    validateArgument(
      "selectorsOfDescendantsThatReactToClicks selectors",
      selectors,
      {
        allowedTypes: ["array"],
      }
    );

    selectors.forEach((selector) => {
      validateArgument(
        "selectorsOfDescendantsThatReactToClicks selectors",
        selector,
        {
          allowedTypes: ["string"],
        }
      );
      validateArgument(
        "selectorsOfDescendantsThatReactToClicks selectors",
        selector.length,
        {
          allowedMin: 1,
          customErrorMessage:
            "Empty strings not allowed in selectorsOfDescendantsThatReactToClicks selectors",
        }
      );
    });

    const currentSlectors = this.#selectorsOfDescendantsThatReactToClicks;

    selectors = keepCurrentSelectors
      ? [...new Set([...selectors, ...currentSlectors])]
      : selectors;

    this.#selectorsOfDescendantsThatReactToClicks = selectors;
    return this;
  }

  setSelectorsOfDescendantsThatUseHorizontalOnlyTouchScrolling(
    selectors = [],
    keepCurrentSelectors = true
  ) {
    validateArgument(
      "selectorsOfDescendantsThatUseHorizontalOnlyTouchScrolling selectors",
      selectors,
      {
        allowedTypes: ["array"],
      }
    );

    selectors.forEach((selector) => {
      validateArgument(
        "selectorsOfDescendantsThatUseHorizontalOnlyTouchScrolling selectors",
        selector,
        {
          allowedTypes: ["string"],
        }
      );
      validateArgument(
        "selectorsOfDescendantsThatUseHorizontalOnlyTouchScrolling selectors",
        selector.length,
        {
          allowedMin: 1,
          customErrorMessage:
            "Empty strings not allowed in selectorsOfDescendantsThatUseHorizontalOnlyTouchScrolling selectors",
        }
      );
    });

    const currentSlectors =
      this.#selectorsOfDescendantsThatUseHorizontalOnlyTouchScrolling;

    selectors = keepCurrentSelectors
      ? [...new Set([...selectors, ...currentSlectors])]
      : selectors;

    this.#selectorsOfDescendantsThatUseHorizontalOnlyTouchScrolling = selectors;
    return this;
  }

  setSelectorsOfDescendantsThatUseVerticalOnlyTouchScrolling(
    selectors = [],
    keepCurrentSelectors = true
  ) {
    validateArgument(
      "selectorsOfDescendantsThatUseVerticalOnlyTouchScrolling selectors",
      selectors,
      {
        allowedTypes: ["array"],
      }
    );

    selectors.forEach((selector) => {
      validateArgument(
        "selectorsOfDescendantsThatUseVerticalOnlyTouchScrolling selectors",
        selector,
        {
          allowedTypes: ["string"],
        }
      );
      validateArgument(
        "selectorsOfDescendantsThatUseVerticalOnlyTouchScrolling selectors",
        selector.length,
        {
          allowedMin: 1,
          customErrorMessage:
            "Empty strings not allowed in selectorsOfDescendantsThatUseVerticalOnlyTouchScrolling selectors",
        }
      );
    });

    const currentSlectors =
      this.#selectorsOfDescendantsThatUseVerticalOnlyTouchScrolling;

    selectors = keepCurrentSelectors
      ? [...new Set([...selectors, ...currentSlectors])]
      : selectors;

    this.#selectorsOfDescendantsThatUseVerticalOnlyTouchScrolling = selectors;
    return this;
  }

  #active = false;

  activate() {
    if (this.#active) return;

    const momentumScrollerActivateEvent = new CustomEvent(
      "momentumScrollerActivate",
      {
        bubbles: true,
        cancelable: true,
        detail: this.#getEventData(),
      }
    );
    this.#scrollContainer.dispatchEvent(momentumScrollerActivateEvent);

    this.#scrollContainer.style.setProperty("cursor", this.#grabCursor);
    this.#scrollContainer.style.setProperty("-webkit-user-select", "none");
    this.#scrollContainer.style.setProperty("user-select", "none");

    this.#active = true;

    return this;
  }

  deactivate() {
    if (!this.#active) return;

    const momentumScrollerDeactivateEvent = new CustomEvent(
      "momentumScrollerDeactivate",
      {
        bubbles: true,
        cancelable: true,
        detail: this.#getEventData(),
      }
    );
    this.#scrollContainer.dispatchEvent(momentumScrollerDeactivateEvent);

    if (this.#scrollResolve)
      this.#stopScroll({
        interruptedBy: "Momentum scroller deactivation",
      });

    this.#undoPointerDownChanges();

    this.#scrollContainer.style.removeProperty("cursor");
    this.#scrollContainer.style.removeProperty("-webkit-user-select");
    this.#scrollContainer.style.removeProperty("user-select");

    this.#active = false;

    return this;
  }

  toggleActivation() {
    if (this.#active) {
      return this.deactivate();
    } else if (!this.#active) {
      return this.activate();
    }
  }

  #paused = false;

  #pause() {
    this.#paused = true;
  }

  #unpause() {
    this.#paused = false;
  }

  #xAxisIsScrollable;
  #yAxisIsScrollable;
  #scrollerType;
  get scrollerType() {
    return this.#scrollerType;
  }
  #pointerMoveUpCancelAbortController = new AbortController();
  #pointerMoveLog = [];
  #pointerIsDown;
  #xAlreadyBounced;
  #yAlreadyBounced;
  #scrollPausing = {
    continueMonitoring: true,
    scrollerInCharge: null,
    scrollerInChargeOriginalScreenX: null,
    scrollerInChargeOriginalScreenY: null,
    otherElement: null,
    otherElementIsMomentumScroller: null,
    otherElementScrollerType: null,
    otherElementReactsToClicks: null,
    otherElementUsesHorizontalOnlyTouchScrolling: null,
    otherElementUsesVerticalOnlyTouchScrolling: null,
    stopMonitoring() {
      this.continueMonitoring = false;
    },
    dontPauseForOtherScroller() {
      this.stopMonitoring();
    },
    pauseForOtherScroller() {
      this.stopMonitoring();
      this.otherElement.#unpause();
      this.scrollerInCharge.#pause();
      this.scrollerInCharge.#undoPointerDownChanges();
    },
    unpauseScrollerInCharge() {
      this.scrollerInCharge.#unpause();
    },
    dispatchScrollPausingStopEvent(eventData = {}) {
      this.stopMonitoring();
      const momentumScrollerScrollPausingStopEvent = new CustomEvent(
        "momentumScrollerScrollPausingStop",
        {
          bubbles: true,
          cancelable: true,
          detail: eventData,
        }
      );
      this.otherElement.dispatchEvent(momentumScrollerScrollPausingStopEvent);
    },
    reset() {
      if (this.scrollerInCharge) this.unpauseScrollerInCharge();
      if (this.otherElementIsMomentumScroller) this.otherElement.#unpause();
      this.continueMonitoring = true;
      this.scrollerInCharge = null;
      this.scrollerInChargeOriginalScreenX = null;
      this.scrollerInChargeOriginalScreenY = null;
      this.otherElement = null;
      this.otherElementIsMomentumScroller = null;
      this.otherElementScrollerType = null;
      this.otherElementReactsToClicks = null;
      this.otherElementUsesHorizontalOnlyTouchScrolling = null;
      this.otherElementUsesVerticalOnlyTouchScrolling = null;
    },
  };

  async #pointerDownHandler(event) {
    if (!this.#active) return;

    if (
      this.#selectorsOfDescendantsTheScrollerShouldIgnore.length &&
      this.#selectorsOfDescendantsTheScrollerShouldIgnore.some((selector) =>
        event.target.closest(selector)
      )
    )
      return;

    const inputButtonIsPrimary = isPrimaryInput(event);
    if (!inputButtonIsPrimary) return;

    const { xAxisIsScrollable, yAxisIsScrollable } =
      ScrollContainerTools.getScrollableAxes(this.#scrollContainer);

    this.#xAxisIsScrollable =
      this.#allowHorizontalScrolling && xAxisIsScrollable;
    this.#yAxisIsScrollable = this.#allowVerticalScrolling && yAxisIsScrollable;

    this.#scrollerType =
      this.#xAxisIsScrollable && this.#yAxisIsScrollable
        ? "horizontal-and-vertical"
        : this.#xAxisIsScrollable && !this.#yAxisIsScrollable
        ? "horizontal-only"
        : !this.#xAxisIsScrollable && this.#yAxisIsScrollable
        ? "vertical-only"
        : "none";

    if (this.#scrollerType === "none") return;

    const scrollPausingElements = event
      .composedPath()
      .map((object) => {
        const isAnElement = object instanceof Element;
        if (!isAnElement) return;

        const elementIsMomentumScroller = object.matches(".momentum-scroller");
        const elementReactsToClicks = this
          .#selectorsOfDescendantsThatReactToClicks.length
          ? object.matches(this.#selectorsOfDescendantsThatReactToClicks)
          : false;
        const elementUsesHorizontalOnlyTouchScrolling = this
          .#selectorsOfDescendantsThatUseHorizontalOnlyTouchScrolling.length
          ? object.matches(
              this.#selectorsOfDescendantsThatUseHorizontalOnlyTouchScrolling
            )
          : false;
        const elementUsesVerticalOnlyTouchScrolling = this
          .#selectorsOfDescendantsThatUseVerticalOnlyTouchScrolling.length
          ? object.matches(
              this.#selectorsOfDescendantsThatUseVerticalOnlyTouchScrolling
            )
          : false;

        if (
          elementIsMomentumScroller ||
          elementReactsToClicks ||
          elementUsesHorizontalOnlyTouchScrolling ||
          elementUsesVerticalOnlyTouchScrolling
        )
          return {
            element: object,
            elementIsMomentumScroller,
            elementReactsToClicks,
            elementUsesHorizontalOnlyTouchScrolling,
            elementUsesVerticalOnlyTouchScrolling,
          };
      })
      .filter((elementData) => elementData);

    const multipleScrollPausingElements = scrollPausingElements
      ? scrollPausingElements.length > 1
      : null;
    if (multipleScrollPausingElements) {
      const scrollContainerOfScrollerInCharge = scrollPausingElements.find(
        (elementData) => elementData.elementIsMomentumScroller
      ).element;

      const scrollerInCharge = MomentumScroller.#scrollerMap.get(
        scrollContainerOfScrollerInCharge
      );

      const otherElementData = scrollPausingElements.find(
        (elementData) =>
          elementData.element !== scrollContainerOfScrollerInCharge
      );

      const otherElementIsMomentumScroller =
        otherElementData.elementIsMomentumScroller;

      if (
        otherElementIsMomentumScroller &&
        this === MomentumScroller.#scrollerMap.get(otherElementData.element)
      )
        this.#pause();

      const otherScrollers = scrollPausingElements.filter(
        (elementData) =>
          elementData.elementIsMomentumScroller &&
          elementData.element !== scrollContainerOfScrollerInCharge &&
          elementData.element !== otherElementData.element
      );

      if (
        otherScrollers.find(
          (elementData) => elementData.element === this.#scrollContainer
        )
      )
        return;

      if (this === scrollerInCharge) {
        this.#scrollPausing.scrollerInCharge = scrollerInCharge;
        this.#scrollPausing.scrollerInChargeOriginalScreenX = event.screenX;
        this.#scrollPausing.scrollerInChargeOriginalScreenY = event.screenY;
        this.#scrollPausing.otherElement = otherElementIsMomentumScroller
          ? MomentumScroller.#scrollerMap.get(otherElementData.element)
          : otherElementData.element;
        this.#scrollPausing.otherElementIsMomentumScroller =
          otherElementIsMomentumScroller;
        this.#scrollPausing.otherElementScrollerType =
          otherElementIsMomentumScroller
            ? this.#scrollPausing.otherElement.scrollerType
            : null;
        this.#scrollPausing.otherElementReactsToClicks =
          otherElementData.elementReactsToClicks;
        this.#scrollPausing.otherElementUsesHorizontalOnlyTouchScrolling =
          otherElementData.elementUsesHorizontalOnlyTouchScrolling;
        this.#scrollPausing.otherElementUsesVerticalOnlyTouchScrolling =
          otherElementData.elementUsesVerticalOnlyTouchScrolling;

        if (!otherElementIsMomentumScroller) this.#pause();
      }
    }

    this.#pointerIsDown = true;

    const momentumScrollerPointerDownEvent = new CustomEvent(
      "momentumScrollerPointerDown",
      {
        bubbles: true,
        cancelable: true,
        detail: this.#getEventData(),
      }
    );
    this.#scrollContainer.dispatchEvent(momentumScrollerPointerDownEvent);

    if (this.#scrollResolve)
      this.#stopScroll({
        interruptedBy: "Pointer down on scroll container",
      });

    if (this.#bounceResolve)
      this.#stopBounce({
        interruptedBy: "Pointer down on scroll container",
      });

    this.#scrollContainer.style.setProperty("cursor", this.#grabbingCursor);

    let movementX = 0;
    let previousScreenX = event.screenX; // Safari returns undefined for event.movementX
    let movementY = 0;
    let previousScreenY = event.screenY; // Safari returns undefined for event.movementY

    let currentTranslateX;
    let currentTranslateY;
    let bounciness;
    if (this.#borderBouncinessLevel !== "none") {
      this.#xAlreadyBounced = false;
      this.#yAlreadyBounced = false;

      const currentTransformProperties = getTransformProperties(
        this.#scrollContainer
      );

      this.#scrollContainer.style.setProperty(
        "transform",
        `translateX(${currentTransformProperties.translateX}px) translateY(${currentTransformProperties.translateY}px)`
      );

      currentTranslateX = currentTransformProperties
        ? currentTransformProperties.translateX
        : 0;
      currentTranslateY = currentTransformProperties
        ? currentTransformProperties.translateY
        : 0;

      bounciness = this.#borderBouncinessLevelToQuantityMap.get(
        this.#borderBouncinessLevel
      );
    }

    this.#pointerMoveUpCancelAbortController = new AbortController();

    this.#scrollContainer.addEventListener(
      "contextmenu",
      (event) => this.#undoPointerDownChanges(event.pointerId),
      { signal: this.#pointerMoveUpCancelAbortController.signal }
    );

    this.#scrollContainer.addEventListener(
      "pointermove",
      (event) => {
        if (this.#xAxisIsScrollable) {
          movementX = event.screenX - previousScreenX;
          previousScreenX = event.screenX;
        }

        if (this.#yAxisIsScrollable) {
          movementY = event.screenY - previousScreenY;
          previousScreenY = event.screenY;
        }

        if (
          multipleScrollPausingElements &&
          this === this.#scrollPausing.scrollerInCharge &&
          this.#scrollPausing.continueMonitoring
        ) {
          const getPointerCrossedThreshold = (
            originalPosition,
            newPosition,
            threshold = 10
          ) => Math.abs(originalPosition - newPosition) > threshold;

          const pointerCrossedHorizontalThreshold = getPointerCrossedThreshold(
            this.#scrollPausing.scrollerInChargeOriginalScreenX,
            event.screenX
          );
          const pointerCrossedVerticalThreshold = getPointerCrossedThreshold(
            this.#scrollPausing.scrollerInChargeOriginalScreenY,
            event.screenY
          );

          if (
            pointerCrossedHorizontalThreshold ||
            pointerCrossedVerticalThreshold
          ) {
            if (this.#scrollPausing.otherElementIsMomentumScroller) {
              if (this.#scrollerType === "horizontal-only") {
                const otherScrollerIsAHorizontalOnlyScroller =
                  this.#scrollPausing.otherElementScrollerType ===
                  "horizontal-only";
                if (
                  otherScrollerIsAHorizontalOnlyScroller ||
                  pointerCrossedHorizontalThreshold
                ) {
                  this.#scrollPausing.dontPauseForOtherScroller();
                } else if (pointerCrossedVerticalThreshold) {
                  return this.#scrollPausing.pauseForOtherScroller();
                }
              } else if (this.#scrollerType === "vertical-only") {
                const otherScrollerIsAVerticalOnlyScroller =
                  this.#scrollPausing.otherElementScrollerType ===
                  "vertical-only";
                if (
                  otherScrollerIsAVerticalOnlyScroller ||
                  pointerCrossedVerticalThreshold
                ) {
                  this.#scrollPausing.dontPauseForOtherScroller();
                } else if (pointerCrossedHorizontalThreshold) {
                  return this.#scrollPausing.pauseForOtherScroller();
                }
              } else if (this.#scrollerType === "horizontal-and-vertical") {
                this.#scrollPausing.dontPauseForOtherScroller();
              }
            } else if (!this.#scrollPausing.otherElementIsMomentumScroller) {
              const scrollerInChargeShouldBeUnpaused =
                this.#scrollPausing.otherElementReactsToClicks ||
                (this.#scrollPausing
                  .otherElementUsesHorizontalOnlyTouchScrolling &&
                  this.#scrollerType === "vertical-only" &&
                  pointerCrossedVerticalThreshold) ||
                (this.#scrollPausing
                  .otherElementUsesVerticalOnlyTouchScrolling &&
                  this.#scrollerType === "horizontal-only" &&
                  pointerCrossedHorizontalThreshold);

              const eventData = {
                scrollerInCharge: this.#scrollPausing.scrollerInCharge,
                pointerCrossedHorizontalThreshold,
                pointerCrossedVerticalThreshold,
                scrollerInChargeWasUnpaused: scrollerInChargeShouldBeUnpaused,
              };
              this.#scrollPausing.dispatchScrollPausingStopEvent(eventData);

              if (scrollerInChargeShouldBeUnpaused)
                this.#scrollPausing.unpauseScrollerInCharge();
            }
          }
        }

        if (this.#paused) return;

        this.#scrollContainer.setPointerCapture(event.pointerId);

        const updateScrollLeft = () =>
          (this.#scrollContainer.scrollLeft -= movementX);
        const updateScrollTop = () =>
          (this.#scrollContainer.scrollTop -= movementY);
        const resetTranslateX = () => (currentTranslateX = 0);
        const resetTranslateY = () => (currentTranslateY = 0);

        if (this.#borderBouncinessLevel !== "none") {
          const { atLeftEdge, atRightEdge, atTopEdge, atBottomEdge } =
            ScrollContainerTools.getEdgeStatus(this.#scrollContainer);

          const tryingToScrollBeyondHorizontalEdge =
            (atLeftEdge && currentTranslateX + movementX > 0) ||
            (atRightEdge && currentTranslateX + movementX < 0);
          const tryingToScrollBeyondVerticalEdge =
            (atBottomEdge && currentTranslateY + movementY < 0) ||
            (atTopEdge && currentTranslateY + movementY > 0);

          if (tryingToScrollBeyondHorizontalEdge) {
            currentTranslateX =
              currentTranslateX +
              movementX *
                (1 /
                  (bounciness *
                    Math.abs(Math.pow(currentTranslateX + movementX, 2)) +
                    1));
          } else if (!tryingToScrollBeyondHorizontalEdge) {
            resetTranslateX();
            updateScrollLeft();
          }

          if (tryingToScrollBeyondVerticalEdge) {
            currentTranslateY =
              currentTranslateY +
              movementY *
                (1 /
                  (bounciness *
                    Math.abs(Math.pow(currentTranslateY + movementY, 2)) +
                    1));
          } else if (!tryingToScrollBeyondVerticalEdge) {
            resetTranslateY();
            updateScrollTop();
          }

          this.#scrollContainer.style.setProperty(
            "transform",
            `translateX(${currentTranslateX}px) translateY(${currentTranslateY}px)`
          );
        } else if (!this.#borderBouncinessLevel !== "none") {
          resetTranslateX();
          resetTranslateY();
          updateScrollLeft();
          updateScrollTop();
        }

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
      (event) => this.#pointerUpHandler(event),
      {
        once: true,
        signal: this.#pointerMoveUpCancelAbortController.signal,
      }
    );

    this.#scrollContainer.addEventListener(
      "pointercancel",
      (event) => this.#pointerUpHandler(event),
      {
        once: true,
        signal: this.#pointerMoveUpCancelAbortController.signal,
      }
    );
  }

  #undoPointerDownChanges(pointerId) {
    const momentumScrollerPointerUpEvent = new CustomEvent(
      "momentumScrollerPointerUp",
      {
        bubbles: true,
        cancelable: true,
        detail: this.#getEventData(),
      }
    );
    this.#scrollContainer.dispatchEvent(momentumScrollerPointerUpEvent);

    this.#pointerMoveUpCancelAbortController.abort();

    if (pointerId) this.#scrollContainer.releasePointerCapture(pointerId);

    this.#pointerIsDown = false;

    this.#scrollContainer.style.setProperty("cursor", this.#grabCursor);

    const currentTransformProperties = getTransformProperties(
      this.#scrollContainer
    );

    const onBorder =
      currentTransformProperties.translateX ||
      currentTransformProperties.translateY;

    if (onBorder) this.#bounce();

    this.#scrollPausing.reset();
  }

  #pointerUpHandler(event) {
    if (this.#paused) return this.#undoPointerDownChanges();
    this.#undoPointerDownChanges();

    const endTime = event.timeStamp;

    const getVelocity = (axis, endPosition) => {
      const meetsMomentumScrollCriteria =
        this.#pointerMoveLog.length > 0 &&
        endTime - this.#pointerMoveLog[this.#pointerMoveLog.length - 1][2] <
          100;

      if (!meetsMomentumScrollCriteria) return 0;

      const axisIndex = axis === "x" ? 0 : 1;

      for (let i = 1; i < 5; i++) {
        if (this.#pointerMoveLog.length < i) return 0;

        const startPosition =
          this.#pointerMoveLog[this.#pointerMoveLog.length - i][axisIndex];
        const startTime =
          this.#pointerMoveLog[this.#pointerMoveLog.length - i][2];

        const positionChange = endPosition - startPosition;
        const timeChange = endTime - startTime;

        if (positionChange && timeChange) {
          const velocity = positionChange / timeChange;

          const { atLeftEdge, atRightEdge, atTopEdge, atBottomEdge } =
            ScrollContainerTools.getEdgeStatus(this.#scrollContainer);

          if (axis === "x") {
            const tryingToScrollBeyondHorizontalEdge =
              (atLeftEdge && velocity > 0) || (atRightEdge && velocity < 0);
            if (tryingToScrollBeyondHorizontalEdge) return 0;
          } else if (axis === "y") {
            const tryingToScrollBeyondVerticalEdge =
              (atTopEdge && velocity > 0) || (atBottomEdge && velocity < 0);
            if (tryingToScrollBeyondVerticalEdge) return 0;
          }

          return velocity;
        }
      }

      return 0;
    };

    let endPositionX;
    let scrollInitialVelocityX = 0;
    if (this.#xAxisIsScrollable) {
      endPositionX = event.screenX;
      scrollInitialVelocityX = getVelocity("x", endPositionX);
    }

    let endPositionY;
    let scrollInitialVelocityY = 0;
    if (this.#yAxisIsScrollable) {
      endPositionY = event.screenY;
      scrollInitialVelocityY = getVelocity("y", endPositionY);
    }

    this.scroll({
      scrollInitialVelocityX,
      scrollInitialVelocityY,
    });

    this.#pointerMoveLog = [];
  }

  #isScrolling = false;
  get isScrolling() {
    return this.#isScrolling;
  }
  #previousScrollDirectionX;
  #previousScrollDirectionY;
  #previousScrollDuration;
  #previousScrollStartTimestamp;
  #previousScrollStopTimestamp;
  #scrollCurrentVelocityX;
  #scrollCurrentVelocityY;
  #scrollDeceleration;
  #scrollDuration;
  #scrollElapsedTime;
  #scrollInitialVelocityX;
  #scrollInitialVelocityXMultiplier;
  #scrollInitialVelocityY;
  #scrollInitialVelocityYMultiplier;
  #scrollRafId;
  #scrollResolve;
  #scrollStartingPointX;
  #scrollStartingPointY;
  #scrollStartTime;
  #scrollVelocityHypotenuse;

  scroll({
    scrollInitialVelocityX = 0,
    scrollInitialVelocityY = 0,
    currentTime = NaN,
  }) {
    const { atLeftEdge, atRightEdge, atTopEdge, atBottomEdge } =
      ScrollContainerTools.getEdgeStatus(this.#scrollContainer);

    const isNewScroll = Number.isNaN(currentTime);
    if (isNewScroll) {
      validateArgument("scrollInitialVelocityX", scrollInitialVelocityX, {
        allowedTypes: ["number"],
        allowFiniteNumbersOnly: true,
      });
      validateArgument("scrollInitialVelocityY", scrollInitialVelocityY, {
        allowedTypes: ["number"],
        allowFiniteNumbersOnly: true,
      });

      if (this.#scrollResolve)
        this.#stopScroll({ interruptedBy: "New momentum scroll" });

      const scrollStartTimestamp = Date.now();
      const timeSincePreviousScrollStart =
        scrollStartTimestamp - this.#previousScrollStartTimestamp;
      const halfOfPreviousScrollDuration = 0.5 * this.#previousScrollDuration;
      const timeSincePreviousScrollStop =
        scrollStartTimestamp - this.#previousScrollStopTimestamp;
      const scrollMeetsMultiplierTimingCriteria =
        timeSincePreviousScrollStart < halfOfPreviousScrollDuration &&
        timeSincePreviousScrollStop < 500;

      const getInitialVelocityMultiplier = (
        scrollDirection,
        previousScrollDirection,
        edge1,
        edge2,
        initialVelocityMultiplier
      ) => {
        if (scrollDirection !== 0) {
          const scrollDirectionXMatchesPreviousScrollDirectionX =
            scrollDirection === previousScrollDirection;
          const scrollMeetsMultiplierPositionCriteria = !edge1 && !edge2;
          const allMultiplierCriteriaMet =
            scrollMeetsMultiplierPositionCriteria &&
            scrollDirectionXMatchesPreviousScrollDirectionX &&
            scrollMeetsMultiplierTimingCriteria;
          return allMultiplierCriteriaMet ? initialVelocityMultiplier + 1 : 1;
        } else if (scrollDirection === 0) {
          return 1;
        }
      };

      const scrollDirectionX = Math.sign(scrollInitialVelocityX);
      this.#scrollInitialVelocityXMultiplier = getInitialVelocityMultiplier(
        scrollDirectionX,
        this.#previousScrollDirectionX,
        atLeftEdge,
        atRightEdge,
        this.#scrollInitialVelocityXMultiplier
      );

      const scrollDirectionY = Math.sign(scrollInitialVelocityY);
      this.#scrollInitialVelocityYMultiplier = getInitialVelocityMultiplier(
        scrollDirectionY,
        this.#previousScrollDirectionY,
        atTopEdge,
        atBottomEdge,
        this.#scrollInitialVelocityYMultiplier
      );

      this.#previousScrollDuration = this.#scrollDuration;
      this.#previousScrollDirectionX = scrollDirectionX;
      this.#previousScrollDirectionY = scrollDirectionY;
      this.#previousScrollStartTimestamp = scrollStartTimestamp;

      this.#scrollInitialVelocityX =
        scrollInitialVelocityX * this.#scrollInitialVelocityXMultiplier;
      this.#scrollInitialVelocityY =
        scrollInitialVelocityY * this.#scrollInitialVelocityYMultiplier;

      this.#scrollVelocityHypotenuse = Math.hypot(
        this.#scrollInitialVelocityX,
        this.#scrollInitialVelocityY
      );

      this.#scrollDeceleration = this.#decelerationLevelToQuantityMap.get(
        this.#decelerationLevel
      );

      this.#scrollDuration =
        this.#scrollVelocityHypotenuse / this.#scrollDeceleration;

      this.#previousScrollDirectionX = scrollDirectionX;
      this.#previousScrollDirectionY = scrollDirectionY;
      this.#previousScrollDuration = this.#scrollDuration;
      this.#scrollStartingPointX = this.#scrollContainer.scrollLeft;
      this.#scrollStartingPointY = this.#scrollContainer.scrollTop;

      const getScrollDistance = (initialVelocity) =>
        (Math.abs(initialVelocity) * this.#scrollDuration) / 2;

      const scrollDistanceX = getScrollDistance(this.#scrollInitialVelocityX);
      const scrollDistanceY = getScrollDistance(this.#scrollInitialVelocityY);

      const minimumScrollableDistance = 1 / devicePixelRatio;
      const scrollDistanceXTooSmall =
        scrollDistanceX < minimumScrollableDistance;
      const scrollDistanceYTooSmall =
        scrollDistanceY < minimumScrollableDistance;

      if (
        (this.#scrollInitialVelocityX === 0 &&
          this.#scrollInitialVelocityY === 0) ||
        (this.#scrollerType === "horizontal-only" && scrollDistanceXTooSmall) ||
        (this.#scrollerType === "vertical-only" && scrollDistanceYTooSmall) ||
        (this.#scrollerType === "horizontal-and-vertical" &&
          scrollDistanceXTooSmall &&
          scrollDistanceYTooSmall)
      ) {
        return new Promise((resolve) => {
          this.#scrollResolve = resolve;
          return this.#stopScroll({
            interruptedBy:
              "Scroll distance is below minimum scrollable distance",
          });
        });
      }

      return new Promise((resolve) => {
        this.#scrollResolve = resolve;
        this.#scrollRafId = requestAnimationFrame((currentTime) => {
          this.scroll({
            currentTime,
          });
        });
      });
    }

    if (!this.#scrollStartTime) {
      this.#scrollStartTime = currentTime;

      const momentumScrollerScrollStartEvent = new CustomEvent(
        "momentumScrollerScrollStart",
        {
          bubbles: true,
          cancelable: true,
          detail: this.#getEventData(),
        }
      );
      this.#scrollContainer.dispatchEvent(momentumScrollerScrollStartEvent);

      this.#isScrolling = true;
    }

    const momentumScrollerScrollEvent = new CustomEvent(
      "momentumScrollerScroll",
      {
        bubbles: true,
        cancelable: true,
        detail: this.#getEventData(),
      }
    );
    this.#scrollContainer.dispatchEvent(momentumScrollerScrollEvent);

    this.#scrollElapsedTime = currentTime - this.#scrollStartTime;
    const elapsedTimeRatio = Math.min(
      this.#scrollElapsedTime / this.#scrollDuration,
      1
    );

    const getCurrentVelocity = (initialVelocity) =>
      Math.sign(initialVelocity) *
      (Math.abs(initialVelocity) -
        this.#scrollDeceleration *
          (Math.abs(initialVelocity) / this.#scrollVelocityHypotenuse) *
          this.#scrollElapsedTime);

    this.#scrollCurrentVelocityX = getCurrentVelocity(
      this.#scrollInitialVelocityX
    );
    this.#scrollCurrentVelocityY = getCurrentVelocity(
      this.#scrollInitialVelocityY
    );

    const getNextScrollPosition = (startingPoint, initialVelocity) =>
      startingPoint +
      (-initialVelocity * this.#scrollElapsedTime +
        Math.sign(initialVelocity) *
          0.5 *
          this.#scrollDeceleration *
          (Math.abs(initialVelocity) / this.#scrollVelocityHypotenuse) *
          Math.pow(this.#scrollElapsedTime, 2));

    if (this.#xAxisIsScrollable) {
      const nextScrollLeft = getNextScrollPosition(
        this.#scrollStartingPointX,
        this.#scrollInitialVelocityX
      );
      this.#scrollContainer.scrollLeft = nextScrollLeft;
    }

    if (this.#yAxisIsScrollable) {
      const nextScrollTop = getNextScrollPosition(
        this.#scrollStartingPointY,
        this.#scrollInitialVelocityY
      );
      this.#scrollContainer.scrollTop = nextScrollTop;
    }

    if (this.#borderBouncinessLevel !== "none") {
      const tryingToScrollBeyondHorizontalEdge =
        (this.#scrollInitialVelocityX > 0 && atLeftEdge) ||
        (this.#scrollInitialVelocityX < 0 && atRightEdge);
      const tryingToScrollBeyondVerticalEdge =
        (this.#scrollInitialVelocityY > 0 && atTopEdge) ||
        (this.#scrollInitialVelocityY < 0 && atBottomEdge);

      if (!this.#xAlreadyBounced && tryingToScrollBeyondHorizontalEdge) {
        this.#bounce({ initialVelocityX: this.#scrollCurrentVelocityX });
        this.#xAlreadyBounced = true;
      }
      if (!this.#yAlreadyBounced && tryingToScrollBeyondVerticalEdge) {
        this.#bounce({ initialVelocityY: this.#scrollCurrentVelocityY });
        this.#yAlreadyBounced = true;
      }
    }

    const atEdgeOfVerticalOnlyScroller =
      this.#scrollerType === "vertical-only" && (atTopEdge || atBottomEdge);

    const atEdgeOfHorizontalOnlyScroller =
      this.#scrollerType === "horizontal-only" && (atLeftEdge || atRightEdge);

    const atEdgeOfOneDimensionalScroller =
      atEdgeOfVerticalOnlyScroller || atEdgeOfHorizontalOnlyScroller;

    const atTopLeftVertex = atTopEdge && atLeftEdge;
    const atTopRightVertex = atTopEdge && atRightEdge;
    const atBottomRightVertex = atBottomEdge && atRightEdge;
    const atBottomLeftVertex = atBottomEdge && atLeftEdge;

    const atTopOrBottomEdgeAndNoHorizontalMovement =
      (atTopEdge || atBottomEdge) && !this.#scrollInitialVelocityX;
    const atLeftOrRightEdgeAndNoVerticalMovement =
      (atLeftEdge || atRightEdge) && !this.#scrollInitialVelocityY;

    const atVertexOfTwoDimensionalScroller =
      this.#scrollerType === "horizontal-and-vertical" &&
      (atTopLeftVertex ||
        atTopRightVertex ||
        atBottomRightVertex ||
        atBottomLeftVertex ||
        atTopOrBottomEdgeAndNoHorizontalMovement ||
        atLeftOrRightEdgeAndNoVerticalMovement);

    if (
      elapsedTimeRatio < 1 &&
      !atEdgeOfOneDimensionalScroller &&
      !atVertexOfTwoDimensionalScroller
    ) {
      this.#scrollRafId = requestAnimationFrame((currentTime) => {
        this.scroll({
          currentTime,
        });
      });
    } else if (
      elapsedTimeRatio >= 1 ||
      Number.isNaN(elapsedTimeRatio) ||
      atEdgeOfOneDimensionalScroller ||
      atVertexOfTwoDimensionalScroller
    ) {
      const resolveData = this.#getEventData();

      this.#previousScrollDirectionX = null;
      this.#previousScrollDirectionY = null;
      this.#previousScrollStartTimestamp = null;
      this.#scrollCurrentVelocityX = null;
      this.#scrollCurrentVelocityY = null;
      this.#scrollInitialVelocityXMultiplier = 1;
      this.#scrollInitialVelocityYMultiplier = 1;

      return this.#stopScroll(resolveData);
    }
  }

  #stopScroll(extraData = {}) {
    const eventData = this.#getEventData(extraData);

    if (this.#scrollResolve) this.#scrollResolve(eventData);

    const momentumScrollerScrollStopEvent = new CustomEvent(
      "momentumScrollerScrollStop",
      {
        bubbles: true,
        cancelable: true,
        detail: eventData,
      }
    );
    this.#scrollContainer.dispatchEvent(momentumScrollerScrollStopEvent);

    this.#previousScrollStopTimestamp = Date.now();
    cancelAnimationFrame(this.#scrollRafId);
    this.#isScrolling = false;
    this.#scrollDeceleration = null;
    this.#scrollDuration = null;
    this.#scrollElapsedTime = null;
    this.#scrollResolve = null;
    this.#scrollStartingPointX = null;
    this.#scrollStartingPointY = null;
    this.#scrollStartTime = null;
    this.#scrollVelocityHypotenuse = null;
    this.#scrollInitialVelocityX = null;
    this.#scrollInitialVelocityY = null;
  }

  #getEventData(extraData) {
    const eventData = {
      interruptedBy: null,
      startPoint: [this.#scrollStartingPointX, this.#scrollStartingPointY],
      endPoint: [
        this.#scrollContainer.scrollLeft,
        this.#scrollContainer.scrollTop,
      ],
      distance: Math.hypot(
        Math.abs(this.#scrollStartingPointX - this.#scrollContainer.scrollLeft),
        Math.abs(this.#scrollStartingPointY - this.#scrollContainer.scrollTop)
      ),
      initialVelocityX: this.#scrollInitialVelocityX,
      initialVelocityY: this.#scrollInitialVelocityY,
      velocityHypotenuse: this.#scrollVelocityHypotenuse,
      duration: this.#scrollDuration,
      elapsedTime: this.#scrollElapsedTime,
      scrollContainer: this.#scrollContainer,
      momentumScroller: this,
    };

    if (extraData && typeof extraData === "object")
      Object.assign(eventData, extraData);

    return eventData;
  }

  #bounceDamping;
  #bounceElapsedTimeX = 0;
  #bounceElapsedTimeY = 0;
  #bounceInitialPositionX = 0;
  #bounceInitialPositionY = 0;
  #bounceInitialVelocityX = 0;
  #bounceInitialVelocityY = 0;
  #bounceRafId;
  #bounceResolve;
  #bounceStartTimeX;
  #bounceStartTimeY;
  #bounceTimeAtMaximumDisplacment;
  #bounceXFallingOnly;
  #bounceYFallingOnly;
  #bounceXIsBouncing;
  #bounceYIsBouncing;

  #getCurrentPositionX() {
    return getTransformProperties(this.#scrollContainer).translateX;
  }
  #getCurrentPositionY() {
    return getTransformProperties(this.#scrollContainer).translateY;
  }

  #bounce({
    initialVelocityX = 0,
    initialVelocityY = 0,
    currentTime = NaN,
  } = {}) {
    const isNewBounce = Number.isNaN(currentTime);
    if (isNewBounce) {
      validateArgument("initialVelocityX", initialVelocityX, {
        allowedTypes: ["number"],
        allowFiniteNumbersOnly: true,
        allowNonNaNNumbersOnly: true,
      });
      validateArgument("initialVelocityY", initialVelocityY, {
        allowedTypes: ["number"],
        allowFiniteNumbersOnly: true,
        allowNonNaNNumbersOnly: true,
      });

      const currentPositionX = this.#getCurrentPositionX();
      const currentPositionY = this.#getCurrentPositionY();

      const nothing =
        initialVelocityX === 0 &&
        initialVelocityY === 0 &&
        currentPositionX === 0 &&
        currentPositionY === 0;

      if (nothing) return;

      this.#bounceDamping = this.#borderBouncinessLevelToQuantityMap.get(
        this.#borderBouncinessLevel
      );

      this.#bounceTimeAtMaximumDisplacment = 1 / this.#bounceDamping;

      this.#bounceXFallingOnly =
        initialVelocityX === 0 && currentPositionX !== 0;
      this.#bounceYFallingOnly =
        initialVelocityY === 0 && currentPositionY !== 0;

      const getInitialVelocity = (currentPosition) =>
        currentPosition /
        (this.#bounceTimeAtMaximumDisplacment *
          Math.pow(
            Math.E,
            -1 * this.#bounceDamping * this.#bounceTimeAtMaximumDisplacment
          ));

      if (!this.#bounceXIsBouncing) {
        if (this.#bounceXFallingOnly) {
          initialVelocityX = getInitialVelocity(currentPositionX);
          this.#bounceInitialVelocityX = initialVelocityX / Math.E;
          this.#bounceInitialPositionX =
            this.#bounceInitialVelocityX * this.#bounceTimeAtMaximumDisplacment;
        } else if (!this.#bounceXFallingOnly) {
          this.#bounceInitialVelocityX = initialVelocityX * 0.1;
          this.#bounceInitialPositionX = 0;
        }
        if (this.#bounceInitialVelocityX) this.#bounceXIsBouncing = true;
      }

      if (!this.#bounceYIsBouncing) {
        if (this.#bounceYFallingOnly) {
          initialVelocityY = getInitialVelocity(currentPositionY);
          this.#bounceInitialVelocityY = initialVelocityY / Math.E;
          this.#bounceInitialPositionY =
            this.#bounceInitialVelocityY * this.#bounceTimeAtMaximumDisplacment;
        } else if (!this.#bounceYFallingOnly) {
          this.#bounceInitialVelocityY = initialVelocityY * 0.1;
          this.#bounceInitialPositionY = 0;
        }
        if (this.#bounceInitialVelocityY) this.#bounceYIsBouncing = true;
      }

      if (
        this.#bounceXIsBouncing &&
        this.#bounceYIsBouncing &&
        !(this.#bounceXFallingOnly && this.#bounceYFallingOnly)
      )
        return;

      return new Promise((resolve) => {
        this.#bounceResolve = resolve;
        this.#bounceRafId = requestAnimationFrame((currentTime) => {
          this.#bounce({
            currentTime,
          });
        });
      });
    }

    if (this.#bounceInitialVelocityX && !this.#bounceStartTimeX) {
      this.#bounceStartTimeX = currentTime;

      const momentumScrollerBounceStartEvent = new CustomEvent(
        "momentumScrollerBounceStart",
        {
          bubbles: true,
          cancelable: true,
          detail: { axis: "x" },
        }
      );
      this.#scrollContainer.dispatchEvent(momentumScrollerBounceStartEvent);
    }
    if (this.#bounceInitialVelocityY && !this.#bounceStartTimeY) {
      this.#bounceStartTimeY = currentTime;

      const momentumScrollerBounceStartEvent = new CustomEvent(
        "momentumScrollerBounceStart",
        {
          bubbles: true,
          cancelable: true,
          detail: { axis: "y" },
        }
      );
      this.#scrollContainer.dispatchEvent(momentumScrollerBounceStartEvent);
    }

    if (this.#bounceStartTimeX)
      this.#bounceElapsedTimeX = currentTime - this.#bounceStartTimeX;
    if (this.#bounceStartTimeY)
      this.#bounceElapsedTimeY = currentTime - this.#bounceStartTimeY;

    const getTranslate = (initialPosition, initialVelocity, elapsedTime) =>
      (initialPosition + initialVelocity * elapsedTime) /
      Math.pow(Math.E, this.#bounceDamping * elapsedTime);

    const translateX = getTranslate(
      this.#bounceInitialPositionX,
      this.#bounceInitialVelocityX,
      this.#bounceElapsedTimeX
    );
    const translateY = getTranslate(
      this.#bounceInitialPositionY,
      this.#bounceInitialVelocityY,
      this.#bounceElapsedTimeY
    );

    this.#scrollContainer.style.setProperty(
      "transform",
      `translateX(${translateX}px) translateY(${translateY}px)`
    );

    const getIsAtEquilibrium = (isBouncing, elapsedTime, translate) =>
      !isBouncing ||
      (isBouncing &&
        elapsedTime > this.#bounceTimeAtMaximumDisplacment &&
        Math.abs(translate) < 1 / (devicePixelRatio * 10));

    const xIsAtEquilibrium = getIsAtEquilibrium(
      this.#bounceXIsBouncing,
      this.#bounceElapsedTimeX,
      translateX
    );
    const yIsAtEquilibrium = getIsAtEquilibrium(
      this.#bounceYIsBouncing,
      this.#bounceElapsedTimeY,
      translateY
    );

    if (!xIsAtEquilibrium || !yIsAtEquilibrium) {
      this.#bounceRafId = requestAnimationFrame((currentTime) => {
        this.#bounce({
          currentTime,
        });
      });
    } else if (xIsAtEquilibrium && yIsAtEquilibrium) {
      this.#scrollContainer.style.setProperty(
        "transform",
        "translateX(0) translateY(0)"
      );

      return this.#stopBounce();
    }
  }

  #stopBounce(extraData = {}) {
    if (this.#bounceResolve) this.#bounceResolve(extraData);

    const momentumScrollerBounceStopEvent = new CustomEvent(
      "momentumScrollerBounceStop",
      {
        bubbles: true,
        cancelable: true,
        detail: extraData,
      }
    );
    this.#scrollContainer.dispatchEvent(momentumScrollerBounceStopEvent);

    cancelAnimationFrame(this.#bounceRafId);
    this.#bounceDamping = null;
    this.#bounceInitialVelocityX = 0;
    this.#bounceInitialVelocityY = 0;
    this.#bounceXIsBouncing = false;
    this.#bounceYIsBouncing = false;
    this.#bounceStartTimeX = null;
    this.#bounceStartTimeY = null;
    this.#bounceElapsedTimeX = null;
    this.#bounceElapsedTimeY = null;
    this.#bounceXFallingOnly = null;
    this.#bounceYFallingOnly = null;
    this.#bounceResolve = null;
  }
}

export { MomentumScroller };
