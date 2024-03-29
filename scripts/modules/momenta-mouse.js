import {
  Heuristics,
  InputTools,
  ScrollContainerTools,
  validateArgument,
} from "./utilities.js";

const momentaMouseScrollerKey = Symbol("momentaMouseScrollerKey");

class MomentaMouse {
  static #scrollerMap = new Map();
  static #scrollerHandlingPointer;
  static #supportsGetCoalescedEvents = InputTools.supportsGetCoalescedEvents();

  static autoCreateScrollers({
    rootSelector = ":root",
    activateImmediately = true,
    considerOverflowHiddenAxesNonScrollable = true,
    selectorsToIgnore = [],
  } = {}) {
    validateArgument("rootSelector", rootSelector, {
      allowedTypes: ["string"],
    });
    validateArgument("rootSelector", !!document.querySelector(rootSelector), {
      allowedValues: [true],
      customErrorMessage: "rootSelector not found",
    });
    validateArgument(
      "considerOverflowHiddenAxesNonScrollable",
      considerOverflowHiddenAxesNonScrollable,
      {
        allowedTypes: ["boolean"],
      }
    );
    this._verifySelectors("selectorsToIgnore", selectorsToIgnore);

    document
      .querySelectorAll(`${rootSelector}, ${rootSelector} *`)
      .forEach((element) => {
        const elementIsOnIgnoreList =
          selectorsToIgnore.length &&
          selectorsToIgnore.some((selector) => element.matches(selector));
        if (elementIsOnIgnoreList) return;

        const scrollerAlreadyExists = this.#scrollerMap.has(element);
        if (scrollerAlreadyExists) return;

        const {
          xAxisIsPotentiallyScrollable,
          xAxisOverflow,
          yAxisIsPotentiallyScrollable,
          yAxisOverflow,
        } = ScrollContainerTools.getAxisOverflowProperties(element);

        const bothAxesAreNonScrollable =
          !xAxisIsPotentiallyScrollable && !yAxisIsPotentiallyScrollable;
        const bothAxesHaveHiddenOverflow =
          xAxisOverflow === "hidden" && yAxisOverflow === "hidden";
        if (
          bothAxesAreNonScrollable ||
          (bothAxesHaveHiddenOverflow &&
            considerOverflowHiddenAxesNonScrollable)
        )
          return;

        this.createScroller(element, { activateImmediately });
      });

    return this;
  }

  static createScroller(scrollContainer, { activateImmediately = true } = {}) {
    validateArgument("scrollContainer", scrollContainer, {
      allowedPrototypes: [Element],
    });
    validateArgument("activateImmediately", activateImmediately, {
      allowedTypes: ["boolean"],
    });

    const scrollerAlreadyExists = this.#scrollerMap.has(scrollContainer);
    if (scrollerAlreadyExists) return this.#scrollerMap.get(scrollContainer);

    if (scrollContainer === document.body) {
      const rootScrollerAlreadyExists = this.#scrollerMap.has(
        document.documentElement
      );
      if (rootScrollerAlreadyExists) return;
    }

    if (!this.#initializationComplete) {
      Heuristics.getDeviceHeuristics({ listenForAndDispatchChanges: true });

      document.addEventListener("deviceHeuristicsChange", (event) => {
        if (event.detail.property !== "hasMouseOrTouchpad") return;

        const { newValue: hasMouseOrTouchpad } = event.detail;

        if (hasMouseOrTouchpad) {
          this.#scrollerMap.forEach((scroller) =>
            scroller.activate({ reason: "Mouse available" })
          );
        } else if (!hasMouseOrTouchpad) {
          this.#scrollerMap.forEach((scroller) =>
            scroller.deactivate({ reason: "Mouse not available" })
          );
        }
      });

      document.addEventListener("pointerdown", (event) =>
        this._pointerDownRouter(event)
      );

      document.addEventListener("keydown", (event) => {
        if (!this.#allowQuickToggleKey) return;

        if (event.key === "Control")
          this.#scrollerMap.forEach((scroller) =>
            scroller.deactivate({ reason: "Quick toggle key" })
          );
      });

      document.addEventListener("keyup", (event) => {
        if (!this.#allowQuickToggleKey) return;

        if (event.key === "Control")
          this.#scrollerMap.forEach((scroller) =>
            scroller.activate({ reason: "Quick toggle key" })
          );
      });

      addEventListener("blur", () => {
        if (this.#allowQuickToggleKey) {
          this.#scrollerMap.forEach((scroller) =>
            scroller.activate({ reason: "Quick toggle key" })
          );
        }

        if (this.#scrollerHandlingPointer)
          this.#scrollerHandlingPointer.#undoPointerDownChanges({
            interruptedBy: "Blur",
          });
      });

      document.addEventListener("contextmenu", () => {
        if (this.#scrollerHandlingPointer)
          this.#scrollerHandlingPointer.#undoPointerDownChanges({
            interruptedBy: "Context Menu",
          });
      });

      document.addEventListener(
        "momentaMouseScrollerPointerHandlingStart",
        (event) => {
          const scroller = this.getScroller(event.detail.scrollContainer);
          this.#scrollerHandlingPointer = scroller;
        }
      );

      document.addEventListener(
        "momentaMouseScrollerPointerHandlingStop",
        () => (this.#scrollerHandlingPointer = null)
      );

      this.#initializationComplete = true;
    }

    const createCounterBounceMechanismForRoot = () => {
      document.documentElement.style.setProperty("display", "grid");

      const pageProgression =
        ScrollContainerTools.getPageProgression(scrollContainer);
      const counterBouncer = document.createElement("div");
      const counterBouncerFloatDirection =
        pageProgression === "left-to-right"
          ? "right"
          : pageProgression === "right-to-left"
          ? "left"
          : null;
      counterBouncer.setAttribute(
        "style",
        `height: 1px; width: 1px; transform: translate3d(0px, 0px, 0px); float: ${counterBouncerFloatDirection};`
      );
      counterBouncer.classList.add("momenta-mouse-counter-bouncer");
      document.body.insertAdjacentElement("beforeend", counterBouncer);
    };

    if (scrollContainer === document.documentElement)
      createCounterBounceMechanismForRoot();

    const scroller = new this(
      scrollContainer,
      momentaMouseScrollerKey,
      this.#supportsGetCoalescedEvents
    );

    this.#scrollerMap.set(scrollContainer, scroller);

    if (activateImmediately)
      scroller.activate({
        reason: "Scroller creation automatic activation",
      });

    return scroller;
  }

  static getScroller(scrollContainer) {
    return this.#scrollerMap.get(scrollContainer);
  }

  static getAllScrollers() {
    return Array.from(this.#scrollerMap.values());
  }

  static #initializationComplete = false;

  static #allowQuickToggleKey = true;

  static setAllowQuickToggleKey(allowQuickToggleKey = true) {
    validateArgument("allowQuickToggleKey", allowQuickToggleKey, {
      allowedTypes: ["boolean"],
    });

    this.#allowQuickToggleKey = allowQuickToggleKey;
    return this;
  }

  static #selectorsOfElementsScrollerShouldIgnore = [
    "input[type=email]",
    "input[type=number]",
    "input[type=password]",
    "input[type=range]",
    "input[type=search]",
    "input[type=tel]",
    "input[type=text]",
    "input[type=url]",
    "select",
    "textarea",
  ];

  static #selectorsOfClickableElements = [
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

  static #selectorsOfOtherTouchScrollers = [];

  static _verifySelectors(selectorsName, selectors) {
    validateArgument(selectorsName, selectors, {
      allowedTypes: ["array"],
    });

    selectors.forEach((selector) => {
      validateArgument(`${selectorsName} selectors`, selector, {
        allowedTypes: ["string"],
      });
      validateArgument(`${selectorsName} selectors`, selector.length, {
        allowedMin: 1,
        customErrorMessage: `${selectorsName} selectors cannot be empty strings`,
      });
    });
  }

  static setSelectorsOfElementsScrollerShouldIgnore(
    selectors = [],
    { keepCurrentSelectors = true } = {}
  ) {
    this._verifySelectors("selectorsOfElementsScrollerShouldIgnore", selectors);

    const currentSelector = this.#selectorsOfElementsScrollerShouldIgnore;

    selectors = keepCurrentSelectors
      ? [...new Set([...selectors, ...currentSelector])]
      : selectors;

    this.#selectorsOfElementsScrollerShouldIgnore = selectors;
    return this;
  }

  static setSelectorsOfClickableElements(
    selectors = [],
    { keepCurrentSelectors = true } = {}
  ) {
    this._verifySelectors("selectorsOfClickableElements", selectors);

    const currentSelector = this.#selectorsOfClickableElements;

    selectors = keepCurrentSelectors
      ? [...new Set([...selectors, ...currentSelector])]
      : selectors;

    this.#selectorsOfClickableElements = selectors;
    return this;
  }

  static setSelectorsOfOtherTouchScrollers(
    selectors = [],
    { keepCurrentSelectors = true } = {}
  ) {
    this._verifySelectors("selectorsOfOtherTouchScrollers", selectors);

    const currentSelector = this.#selectorsOfOtherTouchScrollers;

    selectors = keepCurrentSelectors
      ? [...new Set([...selectors, ...currentSelector])]
      : selectors;

    this.#selectorsOfOtherTouchScrollers = selectors;
    return this;
  }

  static async _pointerDownRouter(event) {
    if (event.pointerType !== "mouse") return;

    const inputButtonIsPrimary = InputTools.isPrimaryInput(event);
    if (!inputButtonIsPrimary) return;

    const targetOrAncestorIsOnIgnoreList =
      this.#selectorsOfElementsScrollerShouldIgnore.length &&
      this.#selectorsOfElementsScrollerShouldIgnore.some((selector) =>
        event.target.closest(selector)
      );
    if (targetOrAncestorIsOnIgnoreList) return;

    const eventTargets = event.composedPath();
    const topMomentaMouseScrollerEventTarget = eventTargets.find(
      (eventTarget) =>
        eventTarget instanceof Element &&
        eventTarget.matches(".momenta-mouse-scroller")
    );

    if (!topMomentaMouseScrollerEventTarget) return;

    const relevantEventTargetsAndProperties = eventTargets
      .map((eventTarget) => {
        const isAnElement = eventTarget instanceof Element;
        if (!isAnElement) return;

        const compileEventTargetProperties = (properties = {}) =>
          Object.assign({ eventTarget }, properties);
        const safeMatches = (selectors) =>
          selectors.length ? eventTarget.matches(selectors) : false;

        const isNonScroller = safeMatches(this.#selectorsOfClickableElements);
        if (isNonScroller)
          return compileEventTargetProperties({ isNonScroller });

        const isScrollerMomentum = eventTarget.matches(
          ".momenta-mouse-scroller"
        );
        if (isScrollerMomentum) {
          const { scrollableAxes } =
            this.getScroller(eventTarget).getScrollerData();
          return compileEventTargetProperties({
            isScrollerMomentum,
            scrollableAxes,
          });
        }

        const isScrollerNonMomentum = safeMatches(
          this.#selectorsOfOtherTouchScrollers
        );
        if (isScrollerNonMomentum) {
          const { xAxisIsScrollable, yAxisIsScrollable } =
            ScrollContainerTools.getAxisOverflowProperties(eventTarget);

          const scrollableAxes =
            xAxisIsScrollable && yAxisIsScrollable
              ? "horizontal-and-vertical"
              : xAxisIsScrollable && !yAxisIsScrollable
              ? "horizontal-only"
              : !xAxisIsScrollable && yAxisIsScrollable
              ? "vertical-only"
              : "none";

          if (scrollableAxes === "none")
            return compileEventTargetProperties({ isNonScroller: true });

          return compileEventTargetProperties({
            isScrollerNonMomentum,
            scrollableAxes,
          });
        }
      })
      .filter((eventTargetProperties) => eventTargetProperties);

    const moreThanOneRelevantEventTarget =
      relevantEventTargetsAndProperties.length > 1;

    const topEventTarget = eventTargets[0];

    const dispatchMomentaMouseScrollerPointerRouteEvent = (detail = {}) =>
      topEventTarget.dispatchEvent(
        new CustomEvent("momentaMouseScrollerPointerRoute", {
          bubbles: true,
          detail: Object.assign(detail, { key: momentaMouseScrollerKey }),
        })
      );

    if (!moreThanOneRelevantEventTarget)
      return dispatchMomentaMouseScrollerPointerRouteEvent({
        pointerEvent: event,
        routeTo: topMomentaMouseScrollerEventTarget,
        routeFrom: null,
      });

    const thresholdTest = (threshold = 5) =>
      new Promise((resolve) => {
        const pointerStartingPointX = event.screenX;
        const pointerStartingPointY = event.screenY;
        const thresholdTestAbortController = new AbortController();

        const abortAndResolve = (resolveData) => {
          thresholdTestAbortController.abort();
          resolve(resolveData);
        };

        const processPointerMove = (event) => {
          const getPointerDistanceFromOrigin = (
            originalPosition,
            newPosition
          ) => Math.abs(originalPosition - newPosition);

          const pointerDistanceFromOriginX = getPointerDistanceFromOrigin(
            pointerStartingPointX,
            event.screenX
          );
          const pointerDistanceFromOriginY = getPointerDistanceFromOrigin(
            pointerStartingPointY,
            event.screenY
          );

          if (
            pointerDistanceFromOriginX > threshold &&
            pointerDistanceFromOriginX > pointerDistanceFromOriginY
          ) {
            return abortAndResolve({ event, thresholdCrossed: "horizontal" });
          } else if (
            pointerDistanceFromOriginY > threshold &&
            pointerDistanceFromOriginY > pointerDistanceFromOriginX
          ) {
            return abortAndResolve({ event, thresholdCrossed: "vertical" });
          }
        };

        document.addEventListener(
          "pointermove",
          (event) =>
            this.#supportsGetCoalescedEvents
              ? event
                  .getCoalescedEvents()
                  .forEach((event) => processPointerMove(event))
              : processPointerMove(event),
          { signal: thresholdTestAbortController.signal }
        );

        ["contextmenu", "pointercancel", "pointerup", "wheel"].forEach(
          (eventType) =>
            document.addEventListener(
              eventType,
              () => abortAndResolve({ thresholdCrossed: null }),
              { passive: true, signal: thresholdTestAbortController.signal }
            )
        );

        addEventListener(
          "blur",
          () => abortAndResolve({ thresholdCrossed: null }),
          { signal: thresholdTestAbortController.signal }
        );

        document.addEventListener(
          "keydown",
          (event) => {
            const pressedScrollingKey = InputTools.isKeyThatScrolls(event.key);
            if (
              pressedScrollingKey ||
              (event.key === "Control" && this.#allowQuickToggleKey)
            )
              abortAndResolve({ thresholdCrossed: null });
          },
          { signal: thresholdTestAbortController.signal }
        );

        document.addEventListener(
          "mousedown",
          (event) => {
            const wheelButtonClicked = event.button === 1;
            if (wheelButtonClicked) abortAndResolve({ thresholdCrossed: null });
          },
          { signal: thresholdTestAbortController.signal }
        );
      });

    const findCompatibleScroller = ({
      scrollersToIgnore = [],
      allowNonMomentaMouseScrollers = false,
      allowedScrollableAxes = [],
    }) =>
      relevantEventTargetsAndProperties.find(
        (relevantEventTargetProperties) =>
          !scrollersToIgnore.includes(
            relevantEventTargetProperties.eventTarget
          ) &&
          (relevantEventTargetProperties.isScrollerMomentum ||
            (relevantEventTargetProperties.isScrollerNonMomentum &&
              allowNonMomentaMouseScrollers)) &&
          allowedScrollableAxes.includes(
            relevantEventTargetProperties.scrollableAxes
          )
      );

    const topRelevantEventTargetProperties =
      relevantEventTargetsAndProperties[0];

    dispatchMomentaMouseScrollerPointerRouteEvent({
      pointerEvent: event,
      routeTo: topRelevantEventTargetProperties.eventTarget,
      routeFrom: null,
    });

    if (
      topRelevantEventTargetProperties.isScrollerMomentum ||
      topRelevantEventTargetProperties.isScrollerNonMomentum
    ) {
      const topScrollerAlreadyUsesBothAxes =
        topRelevantEventTargetProperties.scrollableAxes ===
        "horizontal-and-vertical";
      if (topScrollerAlreadyUsesBothAxes) return;

      const scrollableAxesThatHaveMissingAxis =
        topRelevantEventTargetProperties.scrollableAxes === "horizontal-only"
          ? ["horizontal-and-vertical", "vertical-only"]
          : ["horizontal-and-vertical", "horizontal-only"];

      const nextCompatibleScroller = findCompatibleScroller({
        scrollersToIgnore: [topRelevantEventTargetProperties.eventTarget],
        allowNonMomentaMouseScrollers:
          topRelevantEventTargetProperties.isScrollerMomentum ? true : false,
        allowedScrollableAxes: scrollableAxesThatHaveMissingAxis,
      });

      if (!nextCompatibleScroller) return;

      const thresholdTestResults = await thresholdTest();

      const noThresholdsWereCrossed = !thresholdTestResults.thresholdCrossed;
      const horizontalThresholdWasCrossedAndTopScrollerIsHorizontalOnly =
        thresholdTestResults.thresholdCrossed === "horizontal" &&
        topRelevantEventTargetProperties.scrollableAxes === "horizontal-only";
      const verticalThresholdWasCrossedAndTopScrollerIsVerticalOnly =
        thresholdTestResults.thresholdCrossed === "vertical" &&
        topRelevantEventTargetProperties.scrollableAxes === "vertical-only";

      if (
        noThresholdsWereCrossed ||
        horizontalThresholdWasCrossedAndTopScrollerIsHorizontalOnly ||
        verticalThresholdWasCrossedAndTopScrollerIsVerticalOnly
      )
        return;

      dispatchMomentaMouseScrollerPointerRouteEvent({
        pointerEvent: thresholdTestResults.event,
        routeTo: nextCompatibleScroller.eventTarget,
        routeFrom: topRelevantEventTargetProperties.eventTarget,
      });
    } else if (topRelevantEventTargetProperties.isNonScroller) {
      const scrollableAxesThatHaveMissingAxis = [
        "horizontal-and-vertical",
        "horizontal-only",
        "vertical-only",
      ];
      const firstCompatibleScroller = findCompatibleScroller({
        allowedScrollableAxes: scrollableAxesThatHaveMissingAxis,
      });

      if (!firstCompatibleScroller) return;

      const secondCompatibleScroller = findCompatibleScroller({
        scrollersToIgnore: [firstCompatibleScroller.eventTarget],
        allowedScrollableAxes: scrollableAxesThatHaveMissingAxis,
      });

      const thresholdTestResults = await thresholdTest();

      const noThresholdsWereCrossed = !thresholdTestResults.thresholdCrossed;
      if (noThresholdsWereCrossed) return;

      // Click preventDefault/stopPropagation necessary for Gecko
      const abortController = new AbortController();
      ["pointercancel", "pointerup"].forEach((eventType) =>
        document.addEventListener(
          eventType,
          (event) => {
            const cursorIsOverNonScrollerElement =
              document.elementFromPoint(event.clientX, event.clientY) ===
              topRelevantEventTargetProperties.eventTarget;
            if (!cursorIsOverNonScrollerElement) return abortController.abort();
            document.addEventListener(
              "click",
              (event) => {
                event.preventDefault();
                event.stopPropagation();
                abortController.abort();
              },
              { signal: abortController.signal, capture: true }
            );
          },
          { signal: abortController.signal }
        )
      );

      const routeToScroller = (routeTo) =>
        dispatchMomentaMouseScrollerPointerRouteEvent({
          pointerEvent: thresholdTestResults.event,
          routeTo,
          routeFrom: topRelevantEventTargetProperties.eventTarget,
        });

      const scrollerIncludesCrossedThresholdAxis = (scrollableAxes) => {
        if (thresholdTestResults.thresholdCrossed === "horizontal") {
          return ["horizontal-only", "horizontal-and-vertical"].includes(
            scrollableAxes
          );
        } else if (thresholdTestResults.thresholdCrossed === "vertical") {
          return ["vertical-only", "horizontal-and-vertical"].includes(
            scrollableAxes
          );
        }
      };

      const firstCompatibleScrollerIncludesCrossedThresholdAxis =
        scrollerIncludesCrossedThresholdAxis(
          firstCompatibleScroller.scrollableAxes
        );

      if (firstCompatibleScrollerIncludesCrossedThresholdAxis)
        return routeToScroller(firstCompatibleScroller.eventTarget);

      if (!secondCompatibleScroller)
        return routeToScroller(firstCompatibleScroller.eventTarget);

      const secondCompatibleScrollerIncludesCrossedThresholdAxis =
        scrollerIncludesCrossedThresholdAxis(
          secondCompatibleScroller.scrollableAxes
        );
      if (secondCompatibleScrollerIncludesCrossedThresholdAxis)
        return routeToScroller(secondCompatibleScroller.eventTarget);

      return routeToScroller(firstCompatibleScroller.eventTarget);
    }
  }

  #scrollContainer;
  #useCoalescedEvents;
  #pageProgression;
  #decelerationLevel = "medium";
  #borderBouncinessLevel = "medium";
  #grabCursor = "grab";
  #grabbingCursor = "grabbing";
  #allowReactiveCursor = true;
  #allowHorizontalScrolling = true;
  #allowVerticalScrolling = true;
  #decelerationLevelToQuantityMap = new Map([
    ["none", 0],
    ["minimum", 0.0005 * (2 ** 0.5) ** 0],
    ["low", 0.0005 * (2 ** 0.5) ** 1],
    ["medium", 0.0005 * (2 ** 0.5) ** 2],
    ["high", 0.0005 * (2 ** 0.5) ** 3],
    ["maximum", 0.0005 * (2 ** 0.5) ** 4],
  ]);
  #borderBouncinessLevelToQuantityMap = new Map([
    ["none", Infinity],
    ["minimum", 0.01 / 1.2 ** 0],
    ["low", 0.01 / 1.2 ** 1],
    ["medium", 0.01 / 1.2 ** 2],
    ["high", 0.01 / 1.2 ** 3],
    ["maximum", 0.01 / 1.2 ** 4],
  ]);

  constructor(scrollContainer, key, supportsGetCoalescedEvents) {
    validateArgument("key", key, {
      allowedValues: [momentaMouseScrollerKey],
      customErrorMessage:
        "Please use the autoCreateScrollers static method or the createScroller static method to create scrollers",
    });

    this.#scrollContainer = scrollContainer;
    this.#useCoalescedEvents = supportsGetCoalescedEvents;

    this.#scrollContainer.classList.add("momenta-mouse-scroller");
    this.#scrollContainer.setAttribute("tabindex", "0");

    this.#scrollContainer.addEventListener(
      "momentaMouseScrollerPointerRoute",
      (event) => {
        if (!this.#active) return;

        const key = event.detail.key;
        validateArgument("key", key, {
          allowedValues: [momentaMouseScrollerKey],
          customErrorMessage:
            "This momentaMouseScrollerRoute event is invalid because it was not dispatched by the MomentaMouse module",
        });

        const { pointerEvent, routeTo, routeFrom } = event.detail;
        if (routeTo === this.#scrollContainer)
          return this.#pointerDownHandler(pointerEvent);

        if (routeFrom === this.#scrollContainer)
          return this.#undoPointerDownChanges({
            delayCursorChangeFor: routeTo,
            interruptedBy: "Threshold test",
          });

        if (this.#scrollResolve)
          this.#stopScroll({
            interruptedBy: "MomentaMouse routed to a different EventTarget",
          });
      }
    );

    const stopHandlingOrScrollingIfNeeded = ({ interruptedBy = null } = {}) => {
      if (this.#scrollResolve) {
        this.#stopScroll({
          interruptedBy: "Other scroll",
        });
      } else if (this.#isCurrentlyHandlingPointer) {
        this.#undoPointerDownChanges({ interruptedBy });
      }
    };

    this.#scrollContainer.addEventListener(
      "wheel",
      () => {
        if (!this.#active) return;

        stopHandlingOrScrollingIfNeeded({ interruptedBy: "Wheel" });
      },
      { passive: true }
    );

    this.#scrollContainer.addEventListener("keydown", (event) => {
      if (!this.#active) return;

      const pressedScrollingKey = InputTools.isKeyThatScrolls(event.key);
      if (!pressedScrollingKey) return;

      stopHandlingOrScrollingIfNeeded({ interruptedBy: "Keydown" });
    });

    this.#scrollContainer.addEventListener("mousedown", (event) => {
      if (!this.#active) return;

      const wheelButtonClicked = event.button === 1;
      if (!wheelButtonClicked) return;

      stopHandlingOrScrollingIfNeeded({ interruptedBy: "Mouse middle button" });
    });

    this.#scrollContainer.addEventListener(
      "smoothScrollerScrollStart",
      (event) => {
        if (!this.#active) return;

        if (event.target !== this.#scrollContainer) return;

        if (this.#scrollResolve)
          this.#stopScroll({
            interruptedBy: "Other scroll",
          });
      }
    );

    this.#scrollContainer.addEventListener("dragstart", (event) => {
      if (!this.#active) return;

      event.preventDefault();
    });

    this.#pageProgression = ScrollContainerTools.getPageProgression(
      this.#scrollContainer
    );
  }

  getScrollerData() {
    return {
      active: this.#active,
      isCurrentlyHandlingPointer: this.#isCurrentlyHandlingPointer,
      scrollableAxes: this.#getUpdatedScrollableAxes(),
      scrollContainer: this.#scrollContainer,
      scrolling: !!this.#scrollResolve,
    };
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

    if (
      this.#allowReactiveCursor &&
      !this.#isCurrentlyHandlingPointer &&
      this.#active
    )
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

    if (
      this.#allowReactiveCursor &&
      this.#isCurrentlyHandlingPointer &&
      this.#active
    )
      this.#scrollContainer.style.setProperty("cursor", grabbingCursor);

    this.#grabbingCursor = grabbingCursor;
    return this;
  }

  setAllowReactiveCursor(allowReactiveCursor = true) {
    validateArgument("allowReactiveCursor", allowReactiveCursor, {
      allowedTypes: ["boolean"],
    });

    if (allowReactiveCursor && this.#active) {
      if (this.#isCurrentlyHandlingPointer) {
        this.#scrollContainer.style.setProperty("cursor", this.#grabbingCursor);
      } else if (!this.#isCurrentlyHandlingPointer) {
        this.#scrollContainer.style.setProperty("cursor", this.#grabCursor);
      }
    } else if (!allowReactiveCursor) {
      this.#scrollContainer.style.removeProperty("cursor");
    }

    this.#allowReactiveCursor = allowReactiveCursor;
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

  #active = false;

  activate({ reason } = {}) {
    if (this.#active) return;

    if (!Heuristics.getDeviceHeuristics().hasMouseOrTouchpad) return;

    if (reason === "Quick toggle key" && !this.#quickToggleDeactivation) return;

    this.#quickToggleDeactivation = false;

    if (this.#allowReactiveCursor)
      this.#scrollContainer.style.setProperty("cursor", this.#grabCursor);
    this.#scrollContainer.style.setProperty("-webkit-user-select", "none");
    this.#scrollContainer.style.setProperty("user-select", "none");
    this.#active = true;

    this.#scrollContainer.dispatchEvent(
      new CustomEvent("momentaMouseScrollerActivate", {
        bubbles: true,
        detail: { scrollContainer: this.#scrollContainer, reason },
      })
    );

    return this;
  }

  #quickToggleDeactivation = false;

  deactivate({ reason } = {}) {
    if (!this.#active) return;

    if (reason === "Quick toggle key") this.#quickToggleDeactivation = true;

    if (this.#scrollResolve)
      this.#stopScroll({
        interruptedBy: "MomentaMouse scroller deactivation",
      });

    this.#undoPointerDownChanges({
      interruptedBy: "MomentaMouse scroller deactivation",
    });
    if (this.#allowReactiveCursor)
      this.#scrollContainer.style.removeProperty("cursor");
    this.#scrollContainer.style.removeProperty("-webkit-user-select");
    this.#scrollContainer.style.removeProperty("user-select");
    this.#active = false;

    this.#scrollContainer.dispatchEvent(
      new CustomEvent("momentaMouseScrollerDeactivate", {
        bubbles: true,
        detail: { scrollContainer: this.#scrollContainer, reason },
      })
    );

    return this;
  }

  toggleActivation() {
    if (this.#active) {
      return this.deactivate({ reason: "toggleActivation Method" });
    } else if (!this.#active) {
      return this.activate({ reason: "toggleActivation Method" });
    }
  }

  #isCurrentlyHandlingPointer;
  #pointerId;
  #pointerMoveLog = [];
  #pointerMoveUpCancelAbortController = new AbortController();
  #scrollableAxes;
  #xAlreadyBounced;
  #xAxisIsScrollable;
  #yAlreadyBounced;
  #yAxisIsScrollable;

  #getUpdatedScrollableAxes() {
    const { xAxisIsScrollable, yAxisIsScrollable } =
      ScrollContainerTools.getAxisOverflowProperties(this.#scrollContainer);

    this.#xAxisIsScrollable =
      this.#allowHorizontalScrolling && xAxisIsScrollable;
    this.#yAxisIsScrollable = this.#allowVerticalScrolling && yAxisIsScrollable;

    this.#scrollableAxes =
      this.#xAxisIsScrollable && this.#yAxisIsScrollable
        ? "horizontal-and-vertical"
        : this.#xAxisIsScrollable && !this.#yAxisIsScrollable
        ? "horizontal-only"
        : !this.#xAxisIsScrollable && this.#yAxisIsScrollable
        ? "vertical-only"
        : "none";

    return this.#scrollableAxes;
  }

  #pointerDownHandler(event) {
    if (!this.#active) return;

    this.#scrollContainer.dispatchEvent(
      new CustomEvent("momentaMouseScrollerPointerHandlingStart", {
        bubbles: true,
        detail: { scrollContainer: this.#scrollContainer },
      })
    );

    this.#isCurrentlyHandlingPointer = true;
    this.#pointerId = event.pointerId;
    this.#scrollContainer.setPointerCapture(event.pointerId);

    if (this.#scrollResolve)
      this.#stopScroll({
        interruptedBy: "Pointer down on scroll container",
      });

    if (this.#bounceResolve)
      this.#stopBounce({
        interruptedBy: "Pointer down on scroll container",
      });

    if (this.#allowReactiveCursor)
      this.#scrollContainer.style.setProperty("cursor", this.#grabbingCursor);

    let movementX = 0;
    let previousScreenX = event.screenX; // Safari returns undefined for event.movementX
    let movementY = 0;
    let previousScreenY = event.screenY; // Safari returns undefined for event.movementY

    this.#xAlreadyBounced = false;
    this.#yAlreadyBounced = false;
    const bounciness = this.#borderBouncinessLevelToQuantityMap.get(
      this.#borderBouncinessLevel
    );

    this.#pointerMoveUpCancelAbortController = new AbortController();

    ["pointerup", "pointercancel"].forEach((eventType) =>
      this.#scrollContainer.addEventListener(
        eventType,
        (event) => this.#pointerUpHandler(event),
        { signal: this.#pointerMoveUpCancelAbortController.signal }
      )
    );

    const processPointerMove = (event) => {
      if (this.#xAxisIsScrollable) {
        movementX = event.screenX - previousScreenX;
        previousScreenX = event.screenX;
      }

      if (this.#yAxisIsScrollable) {
        movementY = event.screenY - previousScreenY;
        previousScreenY = event.screenY;
      }

      const updateScrollLeft = () =>
        (this.#scrollContainer.scrollLeft -= movementX);
      const updateScrollTop = () =>
        (this.#scrollContainer.scrollTop -= movementY);
      const resetTranslateX = () => (this.#bounceCurrentTranslateX = 0);
      const resetTranslateY = () => (this.#bounceCurrentTranslateY = 0);

      if (this.#borderBouncinessLevel !== "none") {
        const { atLeftEdge, atRightEdge, atTopEdge, atBottomEdge } =
          ScrollContainerTools.getEdgeStatus(this.#scrollContainer, {
            cachedPageProgression: this.#pageProgression,
          });

        const tryingToScrollBeyondHorizontalEdge =
          (atLeftEdge && this.#bounceCurrentTranslateX + movementX > 0) ||
          (atRightEdge && this.#bounceCurrentTranslateX + movementX < 0);
        const tryingToScrollBeyondVerticalEdge =
          (atBottomEdge && this.#bounceCurrentTranslateY + movementY < 0) ||
          (atTopEdge && this.#bounceCurrentTranslateY + movementY > 0);

        const getCurrentTranslate = (currentTranslate, movement) =>
          currentTranslate +
          (Math.sign(currentTranslate) === Math.sign(movement) ||
          currentTranslate === 0
            ? movement /
              Math.pow(
                Math.E,
                10 * bounciness * Math.abs(currentTranslate + movement)
              )
            : movement);

        const updateCurrentTranslateX = () =>
          (this.#bounceCurrentTranslateX = getCurrentTranslate(
            this.#bounceCurrentTranslateX,
            movementX
          ));
        const updateCurrentTranslateY = () =>
          (this.#bounceCurrentTranslateY = getCurrentTranslate(
            this.#bounceCurrentTranslateY,
            movementY
          ));

        if (tryingToScrollBeyondHorizontalEdge) {
          updateCurrentTranslateX();
        } else if (!tryingToScrollBeyondHorizontalEdge) {
          resetTranslateX();
          updateScrollLeft();
        }

        if (tryingToScrollBeyondVerticalEdge) {
          updateCurrentTranslateY();
        } else if (!tryingToScrollBeyondVerticalEdge) {
          resetTranslateY();
          updateScrollTop();
        }

        this.#updateBouncePosition();
      } else if (this.#borderBouncinessLevel === "none") {
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
    };

    this.#scrollContainer.addEventListener(
      "pointermove",
      (event) =>
        this.#useCoalescedEvents
          ? event
              .getCoalescedEvents()
              .forEach((event) => processPointerMove(event))
          : processPointerMove(event),
      { signal: this.#pointerMoveUpCancelAbortController.signal }
    );
  }

  #undoPointerDownChanges({ delayCursorChangeFor, interruptedBy = null } = {}) {
    if (!this.#isCurrentlyHandlingPointer) return;

    this.#scrollContainer.dispatchEvent(
      new CustomEvent("momentaMouseScrollerPointerHandlingStop", {
        bubbles: true,
        detail: { scrollContainer: this.#scrollContainer, interruptedBy },
      })
    );

    this.#pointerMoveUpCancelAbortController.abort();

    if (this.#pointerId)
      this.#scrollContainer.releasePointerCapture(this.#pointerId);

    this.#isCurrentlyHandlingPointer = false;
    this.#pointerId = null;

    if (this.#allowReactiveCursor) {
      if (!delayCursorChangeFor) {
        this.#scrollContainer.style.setProperty("cursor", this.#grabCursor);
      } else if (delayCursorChangeFor) {
        const cursorSwitchingAbortController = new AbortController();
        delayCursorChangeFor.addEventListener(
          "momentaMouseScrollerPointerHandlingStop",
          (event) => {
            if (event.detail.scrollContainer !== delayCursorChangeFor) return;
            this.#scrollContainer.style.setProperty("cursor", this.#grabCursor);
            cursorSwitchingAbortController.abort();
          },
          { signal: cursorSwitchingAbortController.signal }
        );
      }
    }

    if (this.#borderBouncinessLevel === "none") return;

    const needsToBounceBack =
      this.#bounceCurrentTranslateX || this.#bounceCurrentTranslateY;

    if (needsToBounceBack) this.#bounce();
  }

  #pointerUpHandler(event) {
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
            ScrollContainerTools.getEdgeStatus(this.#scrollContainer, {
              cachedPageProgression: this.#pageProgression,
            });

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

    this.#scroll({
      scrollInitialVelocityX,
      scrollInitialVelocityY,
    });

    this.#pointerMoveLog = [];
  }

  #previousScrollDirectionX = NaN;
  #previousScrollDirectionY = NaN;
  #previousScrollDuration = NaN;
  #previousScrollStartTimestamp = NaN;
  #previousScrollStopTimestamp = NaN;
  #scrollCurrentVelocityX = NaN;
  #scrollCurrentVelocityY = NaN;
  #scrollDeceleration = NaN;
  #scrollDuration = NaN;
  #scrollElapsedTime = NaN;
  #scrollEndingPointX = NaN;
  #scrollEndingPointY = NaN;
  #scrollInitialVelocity = NaN;
  #scrollInitialVelocityX = NaN;
  #scrollInitialVelocityXMultiplier = 1;
  #scrollInitialVelocityY = NaN;
  #scrollInitialVelocityYMultiplier = 1;
  #scrollRafId;
  #scrollResolve;
  #scrollStartingPointX = NaN;
  #scrollStartingPointY = NaN;
  #scrollStartTime = NaN;

  #scroll({
    scrollInitialVelocityX = 0,
    scrollInitialVelocityY = 0,
    currentTime = NaN,
  }) {
    const { atLeftEdge, atRightEdge, atTopEdge, atBottomEdge } =
      ScrollContainerTools.getEdgeStatus(this.#scrollContainer, {
        cachedPageProgression: this.#pageProgression,
      });

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
        if (scrollDirection === 0) return 1;

        const scrollDirectionXMatchesPreviousScrollDirectionX =
          scrollDirection === previousScrollDirection;
        const scrollMeetsMultiplierPositionCriteria = !edge1 && !edge2;
        const allMultiplierCriteriaMet =
          scrollMeetsMultiplierPositionCriteria &&
          scrollDirectionXMatchesPreviousScrollDirectionX &&
          scrollMeetsMultiplierTimingCriteria;

        return allMultiplierCriteriaMet ? initialVelocityMultiplier + 1 : 1;
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

      this.#scrollInitialVelocity = Math.hypot(
        this.#scrollInitialVelocityX,
        this.#scrollInitialVelocityY
      );

      this.#scrollDeceleration = this.#decelerationLevelToQuantityMap.get(
        this.#decelerationLevel
      );

      this.#scrollDuration =
        this.#scrollInitialVelocity / this.#scrollDeceleration;

      this.#previousScrollDirectionX = scrollDirectionX;
      this.#previousScrollDirectionY = scrollDirectionY;
      this.#previousScrollDuration = this.#scrollDuration;

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
        (this.#scrollableAxes === "horizontal-only" &&
          scrollDistanceXTooSmall) ||
        (this.#scrollableAxes === "vertical-only" && scrollDistanceYTooSmall) ||
        (this.#scrollableAxes === "horizontal-and-vertical" &&
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
          this.#scroll({
            currentTime,
          });
        });
      });
    }

    if (!this.#scrollStartTime) {
      this.#scrollStartTime = currentTime;
      this.#scrollStartingPointX = this.#scrollContainer.scrollLeft;
      this.#scrollStartingPointY = this.#scrollContainer.scrollTop;

      this.#scrollContainer.dispatchEvent(
        new CustomEvent("momentaMouseScrollerScrollStart", {
          bubbles: true,
          detail: this.#getScrollEventData(),
        })
      );
    }

    this.#scrollElapsedTime = currentTime - this.#scrollStartTime;
    const elapsedTimeRatio = Math.min(
      this.#scrollElapsedTime / this.#scrollDuration,
      1
    );

    const getCurrentVelocity = (initialVelocity) =>
      Math.sign(initialVelocity) *
      (Math.abs(initialVelocity) -
        this.#scrollDeceleration *
          (Math.abs(initialVelocity) / this.#scrollInitialVelocity) *
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
          (Math.abs(initialVelocity) / this.#scrollInitialVelocity) *
          Math.pow(this.#scrollElapsedTime, 2));

    if (this.#xAxisIsScrollable)
      this.#scrollContainer.scrollLeft = getNextScrollPosition(
        this.#scrollStartingPointX,
        this.#scrollInitialVelocityX
      );

    if (this.#yAxisIsScrollable)
      this.#scrollContainer.scrollTop = getNextScrollPosition(
        this.#scrollStartingPointY,
        this.#scrollInitialVelocityY
      );

    this.#scrollEndingPointX = this.#scrollContainer.scrollLeft;
    this.#scrollEndingPointY = this.#scrollContainer.scrollTop;

    this.#scrollContainer.dispatchEvent(
      new CustomEvent("momentaMouseScrollerScroll", {
        bubbles: true,
        detail: this.#getScrollEventData(),
      })
    );

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
      this.#scrollableAxes === "vertical-only" && (atTopEdge || atBottomEdge);

    const atEdgeOfHorizontalOnlyScroller =
      this.#scrollableAxes === "horizontal-only" && (atLeftEdge || atRightEdge);

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
      this.#scrollableAxes === "horizontal-and-vertical" &&
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
        this.#scroll({
          currentTime,
        });
      });
    } else if (
      elapsedTimeRatio >= 1 ||
      Number.isNaN(elapsedTimeRatio) ||
      atEdgeOfOneDimensionalScroller ||
      atVertexOfTwoDimensionalScroller
    ) {
      this.#previousScrollDirectionX = NaN;
      this.#previousScrollDirectionY = NaN;
      this.#previousScrollStartTimestamp = NaN;
      this.#scrollCurrentVelocityX = NaN;
      this.#scrollCurrentVelocityY = NaN;
      this.#scrollInitialVelocityXMultiplier = 1;
      this.#scrollInitialVelocityYMultiplier = 1;

      return this.#stopScroll();
    }
  }

  #stopScroll(extraData = {}) {
    const eventData = this.#getScrollEventData(extraData);

    if (this.#scrollResolve) this.#scrollResolve(eventData);

    this.#scrollContainer.dispatchEvent(
      new CustomEvent("momentaMouseScrollerScrollStop", {
        bubbles: true,
        detail: eventData,
      })
    );

    this.#previousScrollStopTimestamp = Date.now();
    cancelAnimationFrame(this.#scrollRafId);
    this.#scrollDeceleration = NaN;
    this.#scrollDuration = NaN;
    this.#scrollElapsedTime = NaN;
    this.#scrollEndingPointX = NaN;
    this.#scrollEndingPointY = NaN;
    this.#scrollResolve = null;
    this.#scrollStartingPointX = NaN;
    this.#scrollStartingPointY = NaN;
    this.#scrollStartTime = NaN;
    this.#scrollInitialVelocity = NaN;
    this.#scrollInitialVelocityX = NaN;
    this.#scrollInitialVelocityY = NaN;
  }

  #getScrollEventData(extraData) {
    const eventData = {
      scrollContainer: this.#scrollContainer,
      initialVelocityX: this.#scrollInitialVelocityX,
      initialVelocityY: this.#scrollInitialVelocityY,
      initialVelocity: this.#scrollInitialVelocity,
      startPoint: [this.#scrollStartingPointX, this.#scrollStartingPointY],
      endPoint: [this.#scrollEndingPointX, this.#scrollEndingPointY],
      distance: Math.hypot(
        Math.abs(this.#scrollStartingPointX - this.#scrollEndingPointX),
        Math.abs(this.#scrollStartingPointY - this.#scrollEndingPointY)
      ),
      elapsedTime: this.#scrollElapsedTime,
      interruptedBy: null,
    };

    if (extraData && typeof extraData === "object")
      Object.assign(eventData, extraData);

    return eventData;
  }

  #bounceBouncingX;
  #bounceBouncingY;
  #bounceCurrentTranslateX = 0;
  #bounceCurrentTranslateY = 0;
  #bounceDamping = NaN;
  #bounceElapsedTimeX = NaN;
  #bounceElapsedTimeY = NaN;
  #bounceReboundOnlyX;
  #bounceReboundOnlyY;
  #bounceInitialPositionX = NaN;
  #bounceInitialPositionY = NaN;
  #bounceInitialVelocityX = NaN;
  #bounceInitialVelocityY = NaN;
  #bounceRafId;
  #bounceResolve;
  #bounceStartTimeX = NaN;
  #bounceStartTimeY = NaN;
  #bounceTimeAtMaximumDisplacment = NaN;

  #updateBouncePosition() {
    this.#scrollContainer.style.setProperty(
      "transform",
      `translate3d(${this.#bounceCurrentTranslateX}px, ${
        this.#bounceCurrentTranslateY
      }px, 0px)`
    );

    if (this.#scrollContainer === document.documentElement) {
      this.#scrollContainer
        .querySelector(".momenta-mouse-counter-bouncer")
        .style.setProperty(
          "transform",
          `translate3d(${-1 * this.#bounceCurrentTranslateX}px, ${
            -1 * this.#bounceCurrentTranslateY
          }px, 0px)`
        );
    }
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

      const nothing =
        initialVelocityX === 0 &&
        initialVelocityY === 0 &&
        this.#bounceCurrentTranslateX === 0 &&
        this.#bounceCurrentTranslateY === 0;

      if (nothing) return;

      this.#bounceDamping = this.#borderBouncinessLevelToQuantityMap.get(
        this.#borderBouncinessLevel
      );

      this.#bounceTimeAtMaximumDisplacment = 1 / this.#bounceDamping;

      this.#bounceReboundOnlyX =
        initialVelocityX === 0 && this.#bounceCurrentTranslateX !== 0;
      this.#bounceReboundOnlyY =
        initialVelocityY === 0 && this.#bounceCurrentTranslateY !== 0;

      const getInitialVelocity = (currentPosition) =>
        currentPosition /
        (this.#bounceTimeAtMaximumDisplacment *
          Math.pow(
            Math.E,
            -1 * this.#bounceDamping * this.#bounceTimeAtMaximumDisplacment
          ));

      if (!this.#bounceBouncingX) {
        if (this.#bounceReboundOnlyX) {
          initialVelocityX = getInitialVelocity(this.#bounceCurrentTranslateX);
          this.#bounceInitialVelocityX = initialVelocityX / Math.E;
          this.#bounceInitialPositionX =
            this.#bounceInitialVelocityX * this.#bounceTimeAtMaximumDisplacment;
        } else if (!this.#bounceReboundOnlyX) {
          this.#bounceInitialVelocityX = initialVelocityX * 0.1;
          this.#bounceInitialPositionX = 0;
        }
        if (this.#bounceInitialVelocityX) this.#bounceBouncingX = true;
      }

      if (!this.#bounceBouncingY) {
        if (this.#bounceReboundOnlyY) {
          initialVelocityY = getInitialVelocity(this.#bounceCurrentTranslateY);
          this.#bounceInitialVelocityY = initialVelocityY / Math.E;
          this.#bounceInitialPositionY =
            this.#bounceInitialVelocityY * this.#bounceTimeAtMaximumDisplacment;
        } else if (!this.#bounceReboundOnlyY) {
          this.#bounceInitialVelocityY = initialVelocityY * 0.1;
          this.#bounceInitialPositionY = 0;
        }
        if (this.#bounceInitialVelocityY) this.#bounceBouncingY = true;
      }

      if (
        this.#bounceBouncingX &&
        this.#bounceBouncingY &&
        !(this.#bounceReboundOnlyX && this.#bounceReboundOnlyY)
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

    const dispatchMomentaMouseScrollerBounceEvent = () => {
      this.#scrollContainer.dispatchEvent(
        new CustomEvent("momentaMouseScrollerBounceStart", {
          bubbles: true,
          detail: this.#getBounceEventData(),
        })
      );
    };

    if (this.#bounceInitialVelocityX && !this.#bounceStartTimeX) {
      this.#bounceStartTimeX = currentTime;
      dispatchMomentaMouseScrollerBounceEvent();
    }
    if (this.#bounceInitialVelocityY && !this.#bounceStartTimeY) {
      this.#bounceStartTimeY = currentTime;
      dispatchMomentaMouseScrollerBounceEvent();
    }

    if (this.#bounceStartTimeX)
      this.#bounceElapsedTimeX = currentTime - this.#bounceStartTimeX;
    if (this.#bounceStartTimeY)
      this.#bounceElapsedTimeY = currentTime - this.#bounceStartTimeY;

    const getTranslate = (initialPosition, initialVelocity, elapsedTime) =>
      (initialPosition + initialVelocity * elapsedTime) /
      Math.pow(Math.E, this.#bounceDamping * elapsedTime);

    this.#bounceCurrentTranslateX = getTranslate(
      this.#bounceInitialPositionX,
      this.#bounceInitialVelocityX,
      this.#bounceElapsedTimeX || 0
    );
    this.#bounceCurrentTranslateY = getTranslate(
      this.#bounceInitialPositionY,
      this.#bounceInitialVelocityY,
      this.#bounceElapsedTimeY || 0
    );

    this.#updateBouncePosition();

    const getIsAtEquilibrium = (scrolling, elapsedTime, translate) =>
      !scrolling ||
      (scrolling &&
        elapsedTime > this.#bounceTimeAtMaximumDisplacment &&
        Math.abs(translate) < 1 / devicePixelRatio);

    const xIsAtEquilibrium = getIsAtEquilibrium(
      this.#bounceBouncingX,
      this.#bounceElapsedTimeX,
      this.#bounceCurrentTranslateX
    );
    const yIsAtEquilibrium = getIsAtEquilibrium(
      this.#bounceBouncingY,
      this.#bounceElapsedTimeY,
      this.#bounceCurrentTranslateY
    );

    if (!xIsAtEquilibrium || !yIsAtEquilibrium) {
      this.#bounceRafId = requestAnimationFrame((currentTime) => {
        this.#bounce({
          currentTime,
        });
      });
    } else if (xIsAtEquilibrium && yIsAtEquilibrium) {
      this.#bounceCurrentTranslateX = 0;
      this.#bounceCurrentTranslateY = 0;

      this.#updateBouncePosition();

      return this.#stopBounce();
    }
  }

  #stopBounce(extraData = {}) {
    const eventData = this.#getBounceEventData(extraData);

    if (this.#bounceResolve) this.#bounceResolve(eventData);

    this.#scrollContainer.dispatchEvent(
      new CustomEvent("momentaMouseScrollerBounceStop", {
        bubbles: true,
        detail: eventData,
      })
    );

    cancelAnimationFrame(this.#bounceRafId);
    this.#bounceDamping = NaN;
    this.#bounceInitialVelocityX = NaN;
    this.#bounceInitialVelocityY = NaN;
    this.#bounceBouncingX = false;
    this.#bounceBouncingY = false;
    this.#bounceStartTimeX = NaN;
    this.#bounceStartTimeY = NaN;
    this.#bounceElapsedTimeX = NaN;
    this.#bounceElapsedTimeY = NaN;
    this.#bounceReboundOnlyX = null;
    this.#bounceReboundOnlyY = null;
    this.#bounceResolve = null;
  }

  #getBounceEventData(extraData) {
    const eventData = {
      scrollContainer: this.#scrollContainer,
      startTimeX: this.#bounceStartTimeX,
      startTimeY: this.#bounceStartTimeY,
      initialVelocityX: this.#bounceInitialVelocityX,
      initialVelocityY: this.#bounceInitialVelocityY,
      elapsedTimeX: this.#bounceElapsedTimeX,
      elapsedTimeY: this.#bounceElapsedTimeY,
      interruptedBy: null,
    };

    if (extraData && typeof extraData === "object")
      Object.assign(eventData, extraData);

    return eventData;
  }
}

export { MomentaMouse };
