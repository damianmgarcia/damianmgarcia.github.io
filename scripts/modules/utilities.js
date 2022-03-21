export function awaitElement({ selector } = {}) {
  if (typeof selector != "string")
    throw new TypeError("selector must be of type string");

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

export function awaitTimeout({ milliseconds = 0 } = {}) {
  if (!Number.isFinite(milliseconds))
    throw new TypeError("milliseconds must be a finite number");
  if (milliseconds < 0) throw new RangeError("milliseconds must be >= 0");

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
    if (this.month == 10 && this.day == 31) {
      return "halloween";
    } else if (this.month == 11) {
      const daysOfTheMonth = this.getDaysOfTheMonth();
      const thursdaysOfTheMonth = daysOfTheMonth.filter(
        ({ dayName }) => dayName == "Thursday"
      );
      const dayNumberOfFourthThursday = thursdaysOfTheMonth[3].dayNumber;
      if (this.day == dayNumberOfFourthThursday) return "thanksgiving";
    } else if (this.month == 12 && this.day == 1) {
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
    if (this.year % 4 != 0) {
      return false;
    } else if (this.year % 100 != 0) {
      return true;
    } else if (thi.syear % 400 != 0) {
      return false;
    } else {
      return true;
    }
  }
}

export function cancelAllElementAnimations(element) {
  const animations = element.getAnimations();
  if (animations.length) {
    animations.forEach((animation) => animation.cancel());
  }
}

export function getBrowserHeuristics() {
  const userAgent = navigator.userAgent.toLowerCase();

  const isChromium =
    navigator?.userAgentData?.brands.some(
      (brandInformation) => brandInformation.brand == "Chromium"
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

export function getRandomNumber({ min, max, randomIntegersOnly = false } = {}) {
  if (!Number.isFinite(min) || !Number.isFinite(max))
    throw new TypeError("min and max must be finite numbers");
  if (min >= max) throw new RangeError("min must be less than max");
  if (typeof randomIntegersOnly != "boolean")
    throw new TypeError("randomIntegersOnly must be of type boolean");

  const randomNumber = !randomIntegersOnly
    ? Math.random() * (max - min) + min
    : Math.floor(Math.random() * (max - min + 1) + min);
  return randomNumber;
}

export function isPrimaryInput(event) {
  if (event.type.includes("pointer")) {
    const isPrimaryPointer = event.isPrimary;
    const isPrimaryButton = event.button == 0 || event.button == -1;
    return isPrimaryPointer && isPrimaryButton;
  } else if (event.type.includes("key")) {
    const isEnterOrEscapeKey = event.key == "Enter" || event.key == "Escape";
    return isEnterOrEscapeKey;
  }
}

export class MetaViewportWidthPreserver {
  #metaViewportElement;
  #width;

  constructor(width) {
    if (!Number.isFinite(width))
      return TypeError("width argument must be a finite number");
    if (width < 0) return RangeError("width must be >= 0");

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

    if (orientation == "portrait") {
      if (availWidth < this.#width) {
        return (this.#metaViewportElement.content = `width=${
          this.#width
        }, shrink-to-fit=no`);
      } else if (availWidth >= this.#width) {
        return (this.#metaViewportElement.content = `width=${availWidth}, shrink-to-fit=no`);
      }
    } else if (orientation == "landscape") {
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

export function setBulkStyleProperties({
  selectorsPropertiesValues = [],
  constantSelector,
  constantProperty,
} = {}) {
  if (!Array.isArray(selectorsPropertiesValues))
    throw new TypeError("selectorsPropertiesValues must be of type array");

  selectorsPropertiesValues.forEach(({ selector, property, value }) => {
    document
      .querySelectorAll(constantSelector || selector)
      .forEach((item) =>
        item.style.setProperty(constantProperty || property, value)
      );
  });
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
