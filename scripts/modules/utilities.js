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

    if (month === 10 && day === 31) {
      return "halloween";
    } else if (month === 11 && day >= 22 && dayName === "Thursday") {
      const daysOfTheMonth = this.getDaysOfTheMonth(date);
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

  static getDaysOfTheMonth(date = new Date()) {
    validateArgument("date", date, {
      allowedPrototypes: [Date],
    });

    const numberOfDaysInTheMonth = this.getNumberOfDaysInTheMonth(date);
    const year = date.getFullYear();
    const month = date.getMonth();

    const daysOfTheMonth = [];
    for (let dayNumber = 1; dayNumber <= numberOfDaysInTheMonth; dayNumber++) {
      const dayName = new Date(year, month, dayNumber).toLocaleDateString(
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

  static getNumberOfDaysInTheMonth(date = new Date()) {
    validateArgument("date", date, {
      allowedPrototypes: [Date],
    });

    const month = date.getMonth() + 1;

    const monthsWithThirtyDays = [4, 6, 9, 11];
    const monthsWithThirtyOneDays = [1, 3, 5, 7, 8, 10, 12];

    if (monthsWithThirtyDays.includes(month)) {
      return 30;
    } else if (monthsWithThirtyOneDays.includes(month)) {
      return 31;
    } else if (!this.yearIsLeapYear()) {
      return 28;
    } else if (this.yearIsLeapYear()) {
      return 29;
    }
  }

  static yearIsLeapYear(date = new Date()) {
    validateArgument("date", date, {
      allowedPrototypes: [Date],
    });

    const year = date.getFullYear();

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

export function getBrowserHeuristics() {
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

export function getDeviceHeuristics() {
  const isTouchScreen = matchMedia("(any-pointer: coarse)").matches;

  const deviceHeuristics = {
    isTouchScreen,
  };

  return deviceHeuristics;
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

export function getTransformProperties(element) {
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

export function isPrimaryInput(event) {
  validateArgument("event", event, {
    allowedPrototypes: [Event],
  });
  if (event instanceof PointerEvent) {
    if (event.type === "contextmenu") return true;
    const isPrimaryPointer = event.isPrimary;
    const isPrimaryButton = event.button === 0 || event.button === -1;
    return isPrimaryPointer && isPrimaryButton;
  } else if (event instanceof KeyboardEvent) {
    const isEnterOrEscapeKey = event.key === "Enter" || event.key === "Escape";
    return isEnterOrEscapeKey;
  }
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

export class ScrollContainerTools {
  static getEdgeStatus(scrollContainer) {
    validateArgument("scrollContainer", scrollContainer, {
      allowedPrototypes: [Element],
    });

    const atLeftEdge = scrollContainer.scrollLeft === 0;
    const atRightEdge =
      scrollContainer.scrollWidth -
        scrollContainer.scrollLeft -
        scrollContainer.clientWidth <=
      1;
    const atTopEdge = scrollContainer.scrollTop === 0;
    const atBottomEdge =
      scrollContainer.scrollHeight -
        scrollContainer.scrollTop -
        scrollContainer.clientHeight <=
      1;

    return {
      atLeftEdge,
      atRightEdge,
      atTopEdge,
      atBottomEdge,
    };
  }

  static getScrollableAxes(scrollContainer) {
    validateArgument("scrollContainer", scrollContainer, {
      allowedPrototypes: [Element],
    });

    const scrollableOverflows = ["auto", "overlay", "scroll"];
    const scrollContainerOverflowX =
      getComputedStyle(scrollContainer).overflowX;
    const scrollContainerOverflowY =
      getComputedStyle(scrollContainer).overflowY;

    const xAxisIsScrollable =
      scrollableOverflows.includes(scrollContainerOverflowX) &&
      scrollContainer.scrollWidth > scrollContainer.clientWidth;
    const yAxisIsScrollable =
      scrollableOverflows.includes(scrollContainerOverflowY) &&
      scrollContainer.scrollHeight > scrollContainer.clientHeight;

    return {
      xAxisIsScrollable: xAxisIsScrollable,
      yAxisIsScrollable: yAxisIsScrollable,
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
    document.querySelector(":root").append(errorScreen);
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
