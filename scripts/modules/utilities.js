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

export class Calendar {
  #date = new Date();

  get date() {
    return this.#date;
  }

  get year() {
    return this.#date.getFullYear();
  }

  get month() {
    return this.#date.getMonth() + 1;
  }

  get day() {
    return this.#date.getDate();
  }

  get holiday() {
    if (this.month === 10 && this.day === 31) {
      return "halloween";
    } else if (this.month === 11) {
      const daysOfTheMonth = this.getDaysOfTheMonth();
      const thursdaysOfTheMonth = daysOfTheMonth.filter(
        ({ dayName }) => dayName === "Thursday"
      );
      const dayNumberOfFourthThursday = thursdaysOfTheMonth[3].dayNumber;
      if (this.day === dayNumberOfFourthThursday) return "thanksgiving";
    } else if (this.month === 12 && this.day === 1) {
      return "new-year";
    }
  }

  getDaysOfTheMonth() {
    const monthDayCount = this.getMonthDayCount();

    const daysOfTheMonth = [];

    for (let dayNumber = 1; dayNumber <= monthDayCount; dayNumber++) {
      const dayName = new Date(
        this.year,
        this.month - 1,
        dayNumber
      ).toLocaleDateString("en-US", { weekday: "long" });
      daysOfTheMonth.push({
        dayNumber: dayNumber,
        dayName: dayName,
      });
    }

    return daysOfTheMonth;
  }

  getMonthDayCount() {
    const monthsWithThirtyDays = [4, 6, 9, 11];
    const monthsWithThirtyOneDays = [1, 3, 5, 7, 8, 10, 12];

    if (monthsWithThirtyDays.includes(this.month)) {
      return 30;
    } else if (monthsWithThirtyOneDays.includes(this.month)) {
      return 31;
    } else if (!this.isLeapYear()) {
      return 28;
    } else if (this.isLeapYear()) {
      return 29;
    }
  }

  isLeapYear() {
    if (this.year % 4 !== 0) {
      return false;
    } else if (this.year % 100 !== 0) {
      return true;
    } else if (thi.syear % 400 !== 0) {
      return false;
    } else {
      return true;
    }
  }
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
    isChromium: isChromium,
    isSafari: isSafari,
    isIOsSafari: isIOsSafari,
  };

  return browserHeuristics;
}

export function getDeviceHeuristics() {
  const isTouchScreen = matchMedia("(any-pointer: coarse)").matches;

  const deviceHeuristics = {
    isTouchScreen: isTouchScreen,
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

export function isPrimaryInput(event) {
  validateArgument("event", event, {
    allowedPrototypes: [Event],
  });
  if (event.type.includes("pointer")) {
    const isPrimaryPointer = event.isPrimary;
    const isPrimaryButton = event.button === 0 || event.button === -1;
    return isPrimaryPointer && isPrimaryButton;
  } else if (event.type.includes("key")) {
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

export function validateArgument(
  parameterName = "",
  argument,
  {
    allowedTypes = [],
    allowedPrototypes = [],
    allowedValues = [],
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
  if (!Array.isArray(allowedValues))
    throw new TypeError("allowedValues must be an Array");
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
              allowedMaxIsInclusive ? "]" : ")"
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
              allowedMaxIsInclusive ? "]" : ")"
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
              allowedMinIsInclusive ? "[" : "("
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
              allowedMinIsInclusive ? "[" : "("
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
  if (allowedValues.length > 0) {
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
