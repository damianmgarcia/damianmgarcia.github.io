export function awaitElement({ selector = "" } = {}) {
  validateArgument("selector", selector, {
    allowedTypes: ["string"],
  });

  return new Promise((resolve) => {
    if (document.querySelector(selector)) return resolve(selector);

    const documentMutationObserver = new MutationObserver((records) => {
      const elementFound = records.find((record) =>
        record.target.matches(selector)
      );

      if (elementFound) {
        documentMutationObserver.disconnect();
        return resolve(selector);
      }
    });

    documentMutationObserver.observe(document, {
      childList: true,
      subtree: true,
    });
  });
}

export function awaitTimeout({ milliseconds = NaN } = {}) {
  validateArgument("milliseconds", milliseconds, {
    allowedTypes: ["number"],
    allowedMin: 0,
    allowIntegerNumbersOnly: true,
    allowFiniteNumbersOnly: true,
  });

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, milliseconds);
  });
}

export function cancelAllElementAnimations(element) {
  validateArgument("element", element, {
    allowedPrototypes: [Element, Document],
  });
  const animations = element.getAnimations();
  if (animations.length) {
    animations.forEach((animation) => animation.cancel());
  }
}

export function containElement(elementToBeContained, container) {
  validateArgument("elementToBeContained", elementToBeContained, {
    allowedPrototypes: [Element],
  });
  validateArgument("elementToBeContained", elementToBeContained.parentElement, {
    allowedPrototypes: [Element],
    customErrorMessage: "elementToBeContained must have a parent element",
  });
  validateArgument("container", container, {
    allowedPrototypes: [Element],
  });

  elementToBeContained.insertAdjacentElement("beforebegin", container);
  container.insertAdjacentElement("afterbegin", elementToBeContained);
}

export class DateTools {
  static millisecondConversionMap = new Map([
    ["year", 1000 * 60 * 60 * 24 * 30.436875 * 12],
    ["month", 1000 * 60 * 60 * 24 * 30.436875],
    ["week", 1000 * 60 * 60 * 24 * 7],
    ["day", 1000 * 60 * 60 * 24],
    ["hour", 1000 * 60 * 60],
    ["minute", 1000 * 60],
    ["second", 1000],
    ["millisecond", 1],
  ]);

  static convertTime(fromQuantity = NaN, fromUnit = "", toUnit = "") {
    validateArgument("fromQuantity", fromQuantity, {
      allowedTypes: ["number"],
      allowedMin: 0,
      allowFiniteNumbersOnly: true,
    });

    validateArgument("fromUnit", fromUnit, {
      allowedValues: Array.from(this.millisecondConversionMap.keys()),
    });

    validateArgument("toUnit", toUnit, {
      allowedValues: Array.from(this.millisecondConversionMap.keys()),
    });

    return (
      (fromQuantity * this.millisecondConversionMap.get(fromUnit)) /
      this.millisecondConversionMap.get(toUnit)
    );
  }

  static getBreakpointTime(
    timeQuantity = NaN,
    timeUnit = "",
    {
      maxMonths = 12,
      maxWeeks = 8,
      maxDays = 7,
      maxHours = 24,
      maxMinutes = 60,
      maxSeconds = 60,
      maxMilliseconds = 1000,
    } = {}
  ) {
    const largestUnit = this.millisecondConversionMap.keys().next().value;

    const breakpoints = [
      ["month", maxMonths],
      ["week", maxWeeks],
      ["day", maxDays],
      ["hour", maxHours],
      ["minute", maxMinutes],
      ["second", maxSeconds],
      ["millisecond", maxMilliseconds],
    ];

    const timeInMilliseconds = this.convertTime(
      timeQuantity,
      timeUnit,
      "millisecond"
    );

    const breakpointUnit = getBreakpointUnit();

    const breakpointQuantity = this.convertTime(
      timeInMilliseconds,
      "millisecond",
      breakpointUnit
    );

    return {
      breakpointQuantity: breakpointQuantity,
      breakpointUnit: breakpointUnit,
    };

    function getBreakpointUnit() {
      const breakpointIndex = breakpoints.findIndex(
        ([unit, breakpoint]) =>
          timeInMilliseconds >=
          DateTools.convertTime(breakpoint, unit, "millisecond")
      );

      if (breakpointIndex === 0) {
        return largestUnit;
      } else if (breakpointIndex > 0) {
        const [breakpoint] = breakpoints[breakpointIndex - 1];
        return breakpoint;
      } else if (breakpointIndex === -1) {
        const [breakpoint] = breakpoints[breakpoints.length - 1];
        return breakpoint;
      }
    }
  }

  static getElapsedTimeRecord(
    timeQuantity = NaN,
    fromUnit = "",
    {
      toUnits = Array.from(this.millisecondConversionMap.keys()),
      remainderRounding = "none",
    } = {}
  ) {
    validateArgument("toUnits", toUnits, {
      allowedTypes: ["array"],
    });
    toUnits = new Set(toUnits);
    validateArgument("remainderRounding", remainderRounding, {
      allowedValues: ["ceil", "floor", "none", "round"],
    });

    let timeInMilliseconds = this.convertTime(
      timeQuantity,
      fromUnit,
      "millisecond"
    );

    const elapsedTimeRecord = [];

    Array.from(this.millisecondConversionMap.keys()).forEach(
      (conversionUnit) => {
        if (!toUnits.has(conversionUnit)) return;

        const quotientInMilliseconds =
          timeInMilliseconds -
          (timeInMilliseconds %
            this.convertTime(1, conversionUnit, "millisecond"));

        const quotientInUnit = this.convertTime(
          quotientInMilliseconds,
          "millisecond",
          conversionUnit
        );

        timeInMilliseconds -= quotientInMilliseconds;

        elapsedTimeRecord.push([conversionUnit, quotientInUnit]);
      }
    );

    if (timeInMilliseconds !== 0) {
      const [unit, quantity] = elapsedTimeRecord[elapsedTimeRecord.length - 1];
      const remainingMillisecondsConvertedToUnit = this.convertTime(
        timeInMilliseconds,
        "millisecond",
        unit
      );

      const updatedQuantity =
        remainderRounding === "none"
          ? quantity + remainingMillisecondsConvertedToUnit
          : remainderRounding === "round"
          ? Math.round(quantity + remainingMillisecondsConvertedToUnit)
          : remainderRounding === "floor"
          ? Math.floor(quantity + remainingMillisecondsConvertedToUnit)
          : Math.ceil(quantity + remainingMillisecondsConvertedToUnit);

      elapsedTimeRecord[elapsedTimeRecord.length - 1] = [unit, updatedQuantity];
    }

    return new Map(elapsedTimeRecord);
  }

  static getDateHolidayName(date = new Date()) {
    validateArgument("date", date, {
      allowedPrototypes: [Date],
    });

    const day = date.getDate();
    const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    if (month === 10 && day === 31) {
      return "halloween";
    } else if (month === 11 && day >= 22 && dayName === "Thursday") {
      const daysOfTheMonth = this.getDaysOfTheMonth(month, year);
      const [thanksgivingDay] = daysOfTheMonth.find(
        ([dayNumber, dayName]) => dayNumber >= 22 && dayName === "Thursday"
      );
      if (day === thanksgivingDay) return "thanksgiving";
    } else if (month === 1 && day === 1) {
      return "new-year";
    }
  }

  static getDateInISOFormat(date = new Date()) {
    validateArgument("date", date, {
      allowedPrototypes: [Date],
    });

    const year = date.getFullYear();
    const month = date.toLocaleDateString("en-us", {
      month: "2-digit",
    });
    const day = date.toLocaleDateString("en-us", {
      day: "2-digit",
    });

    return `${year}-${month}-${day}`;
  }

  static getDaysOfTheMonth(
    month = new Date().getMonth() + 1,
    year = new Date().getFullYear()
  ) {
    const numberOfDaysInMonth = this.getNumberOfDaysInMonth(month, year);

    const daysOfTheMonth = [];
    for (let dayNumber = 1; dayNumber <= numberOfDaysInMonth; dayNumber++) {
      const dayName = new Date(year, month - 1, dayNumber).toLocaleDateString(
        "en-US",
        { weekday: "long" }
      );

      daysOfTheMonth.push([dayNumber, dayName]);
    }

    return daysOfTheMonth;
  }

  static getGrammaticalTimeUnit(quantity = NaN, unit = "", capitalize = true) {
    validateArgument("quantity", quantity, {
      allowedTypes: ["number"],
      allowedMin: 0,
      allowFiniteNumbersOnly: true,
    });

    validateArgument("unit", unit, {
      allowedValues: Array.from(this.millisecondConversionMap.keys()),
    });

    validateArgument("capitalize", capitalize, {
      allowedTypes: ["boolean"],
    });

    return quantity === 1 ? getSingularUnit() : getPluralUnit();

    function getSingularUnit() {
      return capitalize ? unit.charAt(0).toUpperCase() + unit.slice(1) : unit;
    }

    function getPluralUnit() {
      return capitalize
        ? unit.charAt(0).toUpperCase() + unit.slice(1) + "s"
        : unit + "s";
    }
  }

  static getNumberOfDaysInMonth = (
    month = new Date().getMonth() + 1,
    year = new Date().getFullYear()
  ) => {
    if (!this.isValidMonth(month)) throw TypeError("Invalid month");
    if (!this.isValidYear(year)) throw TypeError("Invalid year");

    return new Date(year, month, 0).getDate();
  };

  static isValidMonth(month) {
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    return months.includes(month);
  }

  static isValidYear(year) {
    return Number.isInteger(year);
  }

  static isLeapYear(year = new Date().getFullYear()) {
    if (!this.isValidYear(year)) throw TypeError("Invalid year");

    if (year % 4 !== 0) {
      return false;
    } else if (year % 100 !== 0) {
      return true;
    } else if (year % 400 !== 0) {
      return false;
    } else {
      return true;
    }
  }
}

export function elementAIsAncestorOfElementB(elementA, elementB) {
  validateArgument("elementA", elementA, {
    allowedPrototypes: [Element],
  });
  validateArgument("elementB", elementB, {
    allowedPrototypes: [Element],
  });

  if (!elementB.parentElement) return false;
  let currentElement = elementB.parentElement;
  while (currentElement !== null) {
    if (elementA === currentElement) return true;
    currentElement = currentElement.parentElement;
  }
  return false;
}

export function flashAnimation(
  element,
  keyframes,
  duration = 200,
  easing = "ease"
) {
  validateArgument("element", element, {
    allowedPrototypes: [Element],
  });

  validateArgument("keyframes", keyframes, {
    allowedTypes: ["array"],
  });

  keyframes.forEach((keyframe) => {
    validateArgument("keyframe", keyframe, {
      allowedTypes: ["array"],
    });
    validateArgument("keyframe.length", keyframe.length, {
      allowedValues: [3],
    });
  });

  validateArgument("duration", duration, {
    allowedTypes: ["number"],
    allowedMin: 0,
    allowFiniteNumbersOnly: true,
  });

  const startAndEndKeyframes = {};
  const flashKeyframes = {};
  keyframes.forEach(([property, startAndEndValue, flashValue]) => {
    startAndEndKeyframes[property] = startAndEndValue;
    flashKeyframes[property] = flashValue;
  });

  return element.animate(
    [startAndEndKeyframes, flashKeyframes, startAndEndKeyframes],
    {
      duration: duration,
      easing: easing,
    }
  );
}

export class FunctionDecorators {
  /**
   * Adds throttling to a function
   * @param {function} func The function to throttle
   * @param {number} throttleInterval The minimum time in milliseconds allowed between function calls
   * @param {"end" | "start" | "intervals excluding end" | "intervals including end"} returnOn Select whether the throttled function should return after the last call ("end"), on the first call ("start"), on the first call and calls at throttling intervals excluding the last call ("intervals excluding end"), or on the first call and calls at throttling intervals including the last call ("intervals including end")
   * @returns {function} The throttled function
   */
  static addThrottling(func, throttleInterval = 0, returnOn = "") {
    if (typeof func !== "function") throw TypeError("func must be a function");
    if (!Number.isInteger(throttleInterval))
      throw RangeError("throttleInterval must be an integer");
    if (
      ![
        "end",
        "start",
        "intervals excluding end",
        "intervals including end",
      ].includes(returnOn)
    )
      throw RangeError(
        "returnOn must be 'end', 'start', 'intervals excluding end', or 'intervals including end'"
      );

    if (returnOn === "end") {
      let isThrottled = false;
      return function (...args) {
        clearTimeout(isThrottled);
        isThrottled = setTimeout(
          () => func.call(this, ...args),
          throttleInterval
        );
      };
    } else if (returnOn === "start") {
      let isThrottled = false;
      return function (...args) {
        if (!isThrottled) func.call(this, ...args);
        clearTimeout(isThrottled);
        isThrottled = setTimeout(() => (isThrottled = false), throttleInterval);
      };
    } else if (returnOn === "intervals excluding end") {
      let isThrottled = false;
      return function (...args) {
        if (isThrottled) return;
        func.call(this, ...args);
        isThrottled = setTimeout(() => (isThrottled = false), throttleInterval);
      };
    } else if (returnOn === "intervals including end") {
      let isThrottled = false;
      let isNotFirstCall = false;
      return function (...args) {
        if (isNotFirstCall) {
          clearTimeout(isNotFirstCall);
          isNotFirstCall = setTimeout(
            () => (isNotFirstCall = false),
            throttleInterval
          );
          if (isThrottled) return;
          isThrottled = setTimeout(() => {
            func.call(this, ...args);
            isThrottled = false;
          }, throttleInterval);
        } else {
          func.call(this, ...args);
          isNotFirstCall = setTimeout(
            () => (isNotFirstCall = false),
            throttleInterval
          );
        }
      };
    }
  }
}

export class Heuristics {
  static getBrowserHeuristics() {
    const userAgent = navigator.userAgent.toLowerCase();

    const isChromium =
      navigator?.userAgentData?.brands.some(
        (brandInformation) => brandInformation.brand === "Chromium"
      ) || /Chrome\/[.0-9]*/.test(navigator.userAgent);

    const isSafari =
      !isChromium &&
      userAgent.includes("applewebkit/") &&
      !userAgent.includes("chrome/") &&
      !userAgent.includes("firefox/") &&
      !userAgent.includes("edg/") &&
      !userAgent.includes("opr/");

    const isIOsSafari =
      isSafari &&
      (navigator?.standalone === true || navigator?.standalone === false);

    const browserHeuristics = {
      isChromium,
      isSafari,
      isIOsSafari,
    };

    return browserHeuristics;
  }

  static #deviceHeuristics;
  static getDeviceHeuristics({ listenForAndDispatchChanges = false } = {}) {
    if (this.#deviceHeuristics) return this.#deviceHeuristics;

    const getHasTouchScreen = () => matchMedia("(any-pointer: coarse)").matches;
    const getHasMouseOrTouchpad = () =>
      matchMedia("(any-pointer: fine)").matches &&
      matchMedia("(any-hover: hover)").matches;
    const deviceHeuristics = {
      hasTouchScreen: getHasTouchScreen(),
      hasMouseOrTouchpad: getHasMouseOrTouchpad(),
    };

    if (listenForAndDispatchChanges) {
      this.#deviceHeuristics = deviceHeuristics;

      const dispatchEvent = (change) =>
        document.dispatchEvent(
          new CustomEvent("deviceHeuristicsChange", {
            detail: change,
          })
        );

      matchMedia("(any-pointer: coarse)").addEventListener("change", () => {
        const hasTouchScreen = getHasTouchScreen();
        if (this.#deviceHeuristics.hasTouchScreen === hasTouchScreen) return;

        const change = {
          property: "hasTouchScreen",
          oldValue: this.#deviceHeuristics.hasTouchScreen,
          newValue: hasTouchScreen,
        };
        this.#deviceHeuristics.hasTouchScreen = hasTouchScreen;
        dispatchEvent(change);
      });

      [
        matchMedia("(any-pointer: fine)"),
        matchMedia("(any-hover: hover)"),
      ].forEach((mediaQuery) =>
        mediaQuery.addEventListener("change", () => {
          const hasMouseOrTouchpad = getHasMouseOrTouchpad();
          if (this.#deviceHeuristics.hasMouseOrTouchpad === hasMouseOrTouchpad)
            return;

          const change = {
            property: "hasMouseOrTouchpad",
            oldValue: this.#deviceHeuristics.hasMouseOrTouchpad,
            newValue: hasMouseOrTouchpad,
          };
          this.#deviceHeuristics.hasMouseOrTouchpad = hasMouseOrTouchpad;
          dispatchEvent(change);
        })
      );
    }

    return deviceHeuristics;
  }
}

export function getRandomNumber({
  min = NaN,
  max = NaN,
  randomIntegersOnly = false,
} = {}) {
  validateArgument("min", min, {
    allowedTypes: ["number"],
  });
  validateArgument("max", max, {
    allowedTypes: ["number"],
  });
  validateArgument("min", min, {
    allowedMax: max,
  });
  validateArgument("max", max, {
    allowedMin: min,
  });
  validateArgument("randomIntegersOnly", randomIntegersOnly, {
    allowedTypes: ["boolean"],
  });

  const randomNumber = !randomIntegersOnly
    ? Math.random() * (max - min) + min
    : Math.floor(Math.random() * (max - min + 1) + min);
  return randomNumber;
}

export function getRandomString(
  length,
  { includeUpperCase, includeLowerCase, includeNumber, includeSpecial } = {}
) {
  validateArgument("length", length, {
    allowedTypes: ["number"],
    allowIntegerNumbersOnly: true,
    allowedMin: 1,
  });

  const allInclusionOptions = [
    includeUpperCase,
    includeLowerCase,
    includeNumber,
    includeSpecial,
  ];

  allInclusionOptions.forEach((inclusionOption) =>
    validateArgument("inclusionOption", inclusionOption, {
      allowedTypes: ["boolean", "undefined"],
    })
  );

  const includeNothing =
    allInclusionOptions.every((includeOption) => includeOption === false) ||
    (allInclusionOptions.some((inclusionOption) => inclusionOption === false) &&
      !allInclusionOptions.some((inclusionOption) => inclusionOption === true));

  if (includeNothing)
    throw Error(
      "At least one type of character must be permitted to generate a string"
    );

  const upperCase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowerCase = "abcdefghijklmnopqrstuvwxyz";
  const number = "0123456789";
  const special = `!"#$%&'()*+,-./:;<=>?@[\]^_\`{|}~`;

  const includeAll = allInclusionOptions.every(
    (includeOption) => includeOption === undefined
  );

  const permittedCharacters = includeAll
    ? upperCase + lowerCase + number + special
    : `${includeUpperCase ? upperCase : ""}${
        includeLowerCase ? lowerCase : ""
      }${includeNumber ? number : ""}${includeSpecial ? special : ""}`;

  return Array.from({ length }, () =>
    permittedCharacters.charAt(
      getRandomNumber({
        min: 0,
        max: permittedCharacters.length - 1,
        randomIntegersOnly: true,
      })
    )
  ).join("");
}

export function getComputedTransformProperties(element) {
  validateArgument("element", element, {
    allowedPrototypes: [Element],
  });

  const cssTransformMatrix =
    /matrix\((?<scaleX>[-\d.]{0,}),\s(?<skewY>[-\d.]{0,}),\s(?<skewX>[-\d.]{0,}),\s(?<scaleY>[-\d.]{0,}),\s(?<translateX>[-\d.]{0,}),\s(?<translateY>[-\d.]{0,})\)/.exec(
      getComputedStyle(element).transform
    )?.groups;

  return {
    scaleX: +cssTransformMatrix?.scaleX || 1,
    skewY: +cssTransformMatrix?.skewY || 0,
    skewX: +cssTransformMatrix?.skewX || 0,
    scaleY: +cssTransformMatrix?.scaleY || 1,
    translateX: +cssTransformMatrix?.translateX || 0,
    translateY: +cssTransformMatrix?.translateY || 0,
  };
}

export class MetaViewportWidthPreserver {
  #metaViewportElement;
  #width;

  constructor(width = NaN) {
    validateArgument("width", width, {
      allowedTypes: ["number"],
      allowedMin: 0,
      allowFiniteNumbersOnly: true,
    });

    this.#width = width;

    const metaViewportElement = document.createElement("meta");
    metaViewportElement.setAttribute("name", "viewport");
    this.#metaViewportElement = document
      .querySelector("head")
      .insertAdjacentElement("beforeend", metaViewportElement);

    matchMedia("(orientation: portrait)").addEventListener("change", () =>
      this.updateMetaViewportWidth()
    );
  }

  updateMetaViewportWidth() {
    const availWidth = screen.availWidth;
    const availHeight = screen.availHeight;

    if (!availHeight && !availWidth) return;

    const orientation = availHeight > availWidth ? "portrait" : "landscape";

    if (orientation === "portrait") {
      if (availWidth < this.#width) {
        return (this.#metaViewportElement.content = `width=${
          this.#width
        }, shrink-to-fit=no`);
      } else if (availWidth >= this.#width) {
        return (this.#metaViewportElement.content = `width=${availWidth}, shrink-to-fit=no`);
      }
    } else if (orientation === "landscape") {
      if (!(availWidth >= this.#width && availHeight >= this.#width)) {
        return (this.#metaViewportElement.content = `width=${
          (availWidth / availHeight) * this.#width
        }, shrink-to-fit=no`);
      } else if (availWidth >= this.#width && availHeight >= this.#width) {
        return (this.#metaViewportElement.content = `width=${availWidth}, shrink-to-fit=no`);
      }
    }
  }
}

export class InputTools {
  static isPrimaryInput(event) {
    validateArgument("event", event, {
      allowedPrototypes: [Event],
    });

    if (event.type === "blur" || event.type === "contextmenu") return true;

    if (event instanceof MouseEvent || event instanceof PointerEvent) {
      const isPrimaryPointer = event.isPrimary;
      const isPrimaryButton = event.button === 0 || event.button === -1;
      return isPrimaryPointer && isPrimaryButton;
    } else if (event instanceof KeyboardEvent) {
      const isEnterOrEscapeKey =
        event.key === "Enter" || event.key === "Escape";
      return isEnterOrEscapeKey;
    }
  }

  static isKeyThatScrolls(key = "") {
    validateArgument("key", key, { allowedTypes: ["string"] });

    return [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "PageUp",
      "PageDown",
      "Home",
      "End",
      " ",
      "Tab",
    ].includes(key);
  }

  static supportsGetCoalescedEvents() {
    return (
      !!window.PointerEvent &&
      Object.getOwnPropertyNames(window.PointerEvent.prototype).includes(
        "getCoalescedEvents"
      )
    );
  }
}

export function* range(stop = 0, { start = 0, step = 1 } = {}) {
  const nonFiniteArgument = [stop, start, step].some(
    (argument) => !Number.isFinite(argument)
  );
  const zeroStep = step === 0;
  const aStepInTheWrongDirection = Math.sign(step) !== Math.sign(stop - start);

  if (nonFiniteArgument || zeroStep || aStepInTheWrongDirection) return;

  let currentValue = start;
  const condition =
    step > 0 ? () => currentValue < stop : () => currentValue > stop;
  while (condition()) {
    yield currentValue;
    currentValue += step;
  }
}

export class ScrollContainerTools {
  static getEdgeStatus(element, { cachedPageProgression } = {}) {
    validateArgument("element", element, {
      allowedPrototypes: [Element],
    });
    validateArgument("cachedPageProgression", cachedPageProgression, {
      allowedValues: ["left-to-right", "right-to-left"],
    });

    const pageProgression =
      cachedPageProgression || this.getPageProgression(element);

    const edgeStatus = {};

    if (pageProgression === "left-to-right") {
      edgeStatus.atLeftEdge = element.scrollLeft <= 0;
      edgeStatus.atRightEdge =
        element.scrollWidth - element.scrollLeft - element.clientWidth <= 1;
    } else if (pageProgression === "right-to-left") {
      edgeStatus.atLeftEdge =
        element.scrollWidth + element.scrollLeft - element.clientWidth <= 1;
      edgeStatus.atRightEdge = element.scrollLeft >= 0;
    }

    edgeStatus.atTopEdge = element.scrollTop <= 0;
    edgeStatus.atBottomEdge =
      element.scrollHeight - element.scrollTop - element.clientHeight <= 1;

    return edgeStatus;
  }

  static getPageProgression(element) {
    validateArgument("element", element, {
      allowedPrototypes: [Element],
    });

    const { direction, writingMode } = getComputedStyle(element);

    if (writingMode === "horizontal-tb") {
      if (direction === "ltr") {
        return "left-to-right";
      } else if (direction === "rtl") {
        return "right-to-left";
      }
    } else if (writingMode === "vertical-rl" || writingMode === "sideways-rl") {
      return "right-to-left";
    } else if (writingMode === "vertical-lr" || writingMode === "sideways-lr") {
      return "left-to-right";
    }
  }

  static getAxisOverflowProperties(element) {
    validateArgument("element", element, {
      allowedPrototypes: [Element],
    });

    const isDocumentRoot = element === document.documentElement;
    const computedStyle = getComputedStyle(element);
    const xAxisOverflow = computedStyle.overflowX;
    const yAxisOverflow = computedStyle.overflowY;

    const scrollableOverflowValues = ["auto", "hidden", "overlay", "scroll"];
    const xAxisIsPotentiallyScrollable = isDocumentRoot
      ? [...scrollableOverflowValues, "visible"].includes(xAxisOverflow)
      : scrollableOverflowValues.includes(xAxisOverflow);
    const yAxisIsPotentiallyScrollable = isDocumentRoot
      ? [...scrollableOverflowValues, "visible"].includes(yAxisOverflow)
      : scrollableOverflowValues.includes(yAxisOverflow);
    const xAxisHasScrollableOverflow =
      element.scrollWidth > element.clientWidth;
    const yAxisHasScrollableOverflow =
      element.scrollHeight > element.clientHeight;

    const xAxisIsScrollable =
      xAxisIsPotentiallyScrollable && xAxisHasScrollableOverflow;
    const yAxisIsScrollable =
      yAxisIsPotentiallyScrollable && yAxisHasScrollableOverflow;

    return {
      xAxisIsPotentiallyScrollable,
      xAxisHasScrollableOverflow,
      xAxisIsScrollable,
      xAxisOverflow,
      yAxisIsPotentiallyScrollable,
      yAxisHasScrollableOverflow,
      yAxisIsScrollable,
      yAxisOverflow,
    };
  }
}

export function showCaughtErrorsOnScreen() {
  addEventListener("error", (event) => {
    const errorScreen = document.createElement("div");
    errorScreen.setAttribute(
      "style",
      "background: white; color: red; display: grid; font-size: 24px; height: 100vh; left: 0; padding: 5%; place-content: center; position: fixed; top: 0; width: 100vw; z-index: 10000;"
    );
    errorScreen.textContent = event.message;
    document.documentElement.append(errorScreen);
  });
}

export class SimpleDate {
  #date;
  #year;
  #month;
  #monthName;
  #day;
  #dayName;

  constructor(date = new Date()) {
    validateArgument("date", date, {
      allowedPrototypes: [Date],
    });

    this.#date = date;
    this.#year = date.getFullYear();
    this.#month = date.getMonth() + 1;
    this.#monthName = date.toLocaleDateString("en-US", { month: "long" });
    this.#day = date.getDate();
    this.#dayName = date.toLocaleDateString("en-US", { weekday: "long" });
  }

  get date() {
    return this.#date;
  }

  get year() {
    return this.#year;
  }

  get month() {
    return this.#month;
  }

  get day() {
    return this.#day;
  }

  get dayName() {
    return this.#dayName;
  }

  get monthName() {
    return this.#monthName;
  }
}

export function validateArgument(
  parameterName = "",
  argument,
  {
    allowedTypes = [],
    allowedPrototypes = [],
    allowedValues = null,
    allowedMin = NaN,
    allowedMinIsInclusive = true,
    allowedMax = NaN,
    allowedMaxIsInclusive = true,
    allowIntegerNumbersOnly = false,
    allowFiniteNumbersOnly = false,
    allowNonNaNNumbersOnly = true,
    customErrorMessage = "",
  } = {}
) {
  if (typeof parameterName !== "string")
    throw new TypeError("parameterName must be a String");
  if (parameterName.length === 0)
    throw new TypeError("parameterName must be at least 1 character");
  if (!Array.isArray(allowedTypes))
    throw new TypeError("allowedTypes must be an Array");
  if (!Array.isArray(allowedPrototypes))
    throw new TypeError("allowedPrototypes must be an Array");
  if (allowedValues !== null && !Array.isArray(allowedValues))
    throw new TypeError("allowedValues must be null or an Array");
  if (typeof allowedMin !== "number")
    throw new TypeError("allowedMin must be a Number");
  if (typeof allowedMax !== "number")
    throw new TypeError("allowedMax must be a Number");
  if (typeof allowedMinIsInclusive !== "boolean")
    throw new TypeError("allowedMinIsInclusive must be a Boolean");
  if (typeof allowedMaxIsInclusive !== "boolean")
    throw new TypeError("allowedMaxIsInclusive must be a Boolean");
  if (typeof allowIntegerNumbersOnly !== "boolean")
    throw new TypeError("allowIntegerNumbersOnly must be a Boolean");
  if (typeof allowFiniteNumbersOnly !== "boolean")
    throw new TypeError("allowFiniteNumbersOnly must be a Boolean");
  if (typeof allowNonNaNNumbersOnly !== "boolean")
    throw new TypeError("allowNonNaNNumbersOnly must be a Boolean");
  if (typeof customErrorMessage !== "string")
    throw new TypeError("customErrorMessage must be a String");

  const argumentType = getControlledType(argument);

  function getControlledType(data) {
    const controlledTypes = new Set([
      "array",
      "boolean",
      "bigint",
      "function",
      "map",
      "null",
      "number",
      "object",
      "regexp",
      "set",
      "string",
      "symbol",
      "undefined",
      "weakmap",
      "weakset",
    ]);
    const uncontrolledType = Object.prototype.toString
      .call(data)
      .slice(8, -1)
      .toLowerCase();

    return controlledTypes.has(uncontrolledType)
      ? uncontrolledType
      : typeof data;
  }

  // allowedTypes
  if (allowedTypes.length > 0) {
    const argumentIsNotAnAllowedType = !allowedTypes.includes(argumentType);

    if (argumentIsNotAnAllowedType)
      throw new TypeError(
        customErrorMessage ||
          `${parameterName} must be one of the following types: ${allowedTypes.join(
            ", "
          )}`
      );
  }

  // allowedNumbers
  const argumentIsANumber = argumentType === "number";
  if (argumentIsANumber) {
    const argumentIsAnInteger = Number.isInteger(argument);
    const argumentIsFinite = Number.isFinite(argument);
    const argumentIsNaN = Number.isNaN(argument);

    if (allowIntegerNumbersOnly && !argumentIsAnInteger)
      throw new TypeError(
        customErrorMessage || `${parameterName} must be an integer Number`
      );
    if (allowFiniteNumbersOnly && !argumentIsFinite)
      throw new TypeError(
        customErrorMessage || `${parameterName} must be a finite Number`
      );
    if (allowNonNaNNumbersOnly && argumentIsNaN)
      throw new TypeError(
        customErrorMessage || `${parameterName} must not be NaN`
      );

    const allowedMinIsNotNaN = !Number.isNaN(allowedMin);
    const allowedMaxIsNotNaN = !Number.isNaN(allowedMax);

    if (allowedMinIsNotNaN || allowedMaxIsNotNaN) {
      if (
        allowedMinIsNotNaN &&
        !Number.isFinite(allowedMin) &&
        allowedMinIsInclusive &&
        allowFiniteNumbersOnly
      )
        throw new TypeError(
          `allowedMin cannot be ${allowedMin} with allowedMinIsInclusive set to true and allowFiniteNumbersOnly set to true`
        );
      if (
        allowedMaxIsNotNaN &&
        !Number.isFinite(allowedMax) &&
        allowedMaxIsInclusive &&
        allowFiniteNumbersOnly
      )
        throw new TypeError(
          `allowedMax cannot be ${allowedMax} with allowedMaxIsInclusive set to true and allowFiniteNumbersOnly set to true`
        );

      if (
        allowedMinIsNotNaN &&
        allowedMaxIsNotNaN &&
        allowedMinIsInclusive &&
        allowedMaxIsInclusive &&
        (argument < allowedMin || argument > allowedMax)
      )
        throw new RangeError(
          customErrorMessage ||
            `${parameterName} must be within the interval [${allowedMin}, ${allowedMax}]`
        );

      if (
        allowedMinIsNotNaN &&
        allowedMaxIsNotNaN &&
        !allowedMinIsInclusive &&
        !allowedMaxIsInclusive &&
        (argument <= allowedMin || argument >= allowedMax)
      )
        throw new RangeError(
          customErrorMessage ||
            `${parameterName} must be within the interval (${allowedMin}, ${allowedMax})`
        );

      if (
        allowedMinIsNotNaN &&
        allowedMaxIsNotNaN &&
        allowedMinIsInclusive &&
        !allowedMaxIsInclusive &&
        (argument < allowedMin || argument >= allowedMax)
      )
        throw new RangeError(
          customErrorMessage ||
            `${parameterName} must be within the interval [${allowedMin}, ${allowedMax})`
        );

      if (
        allowedMinIsNotNaN &&
        allowedMaxIsNotNaN &&
        !allowedMinIsInclusive &&
        allowedMaxIsInclusive &&
        (argument <= allowedMin || argument > allowedMax)
      )
        throw new RangeError(
          customErrorMessage ||
            `${parameterName} must be within the interval (${allowedMin}, ${allowedMax}]`
        );

      if (
        allowedMinIsNotNaN &&
        !allowedMaxIsNotNaN &&
        allowedMinIsInclusive &&
        argument < allowedMin
      )
        throw new RangeError(
          customErrorMessage ||
            `${parameterName} must be within the interval [${allowedMin}, +Infinity${
              allowedMaxIsInclusive && !allowFiniteNumbersOnly ? "]" : ")"
            }`
        );

      if (
        allowedMinIsNotNaN &&
        !allowedMaxIsNotNaN &&
        !allowedMinIsInclusive &&
        argument <= allowedMin
      )
        throw new RangeError(
          customErrorMessage ||
            `${parameterName} must be within the interval (${allowedMin}, +Infinity${
              allowedMaxIsInclusive && !allowFiniteNumbersOnly ? "]" : ")"
            }`
        );

      if (
        !allowedMinIsNotNaN &&
        allowedMaxIsNotNaN &&
        allowedMaxIsInclusive &&
        argument > allowedMax
      )
        throw new RangeError(
          customErrorMessage ||
            `${parameterName} must be within the interval ${
              allowedMinIsInclusive && !allowFiniteNumbersOnly ? "[" : "("
            }-Infinity, ${allowedMax}]`
        );

      if (
        !allowedMinIsNotNaN &&
        allowedMaxIsNotNaN &&
        !allowedMaxIsInclusive &&
        argument >= allowedMax
      )
        throw new RangeError(
          customErrorMessage ||
            `${parameterName} must be within the interval ${
              allowedMinIsInclusive && !allowFiniteNumbersOnly ? "[" : "("
            }-Infinity, ${allowedMax})`
        );
    }
  }

  // allowedPrototypes
  if (allowedPrototypes.length > 0) {
    const argumentIsNotFromAnAllowedPrototype = allowedPrototypes.every(
      (prototype) => !(argument instanceof prototype)
    );

    if (argumentIsNotFromAnAllowedPrototype)
      throw new TypeError(
        customErrorMessage ||
          `${parameterName} must have one of the following prototypes in its prototype chain: ${allowedPrototypes
            .map((prototype) => prototype.name)
            .join(", ")}`
      );
  }

  // allowedValues
  if (Array.isArray(allowedValues)) {
    const argumentIsNotAnAllowedValue = !allowedValues.includes(argument);

    if (argumentIsNotAnAllowedValue) {
      throw new TypeError(
        customErrorMessage ||
          `${parameterName} must be one of the following values: ${allowedValues.join(
            ", "
          )}`
      );
    }
  }

  return argument;
}
