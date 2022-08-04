import {
  awaitTimeout,
  cancelAllElementAnimations,
  DateTools,
  flashAnimation,
  getBrowserHeuristics,
  getDeviceHeuristics,
  getRandomNumber,
  isPrimaryInput,
  SimpleDate,
  validateArgument,
} from "./modules/utilities.js";
import { MomentumScroller } from "./modules/momentum-scroller.js";
import { SmoothScroller } from "./modules/smooth-scroller.js";

addEventListener(
  "load",
  async () => {
    const startOpeningAnimationSequenceAndKittehIntroduction = async () => {
      await openingAnimationSequence();
      loadingScreen.remove();
      document
        .querySelectorAll("#article-selector, #project-selector")
        .forEach((selector) => selector.setAttribute("tabindex", "0"));
      await awaitTimeout({ milliseconds: 400 });
      kittehBlinkAnimation.blink();
      await awaitTimeout({ milliseconds: 200 });
      await kittehBlinkAnimation.blink("long");
      kittehMessageLibrary.submitMessagesToKittehMessages({
        preferHoliday: true,
      });
    };

    startOpeningAnimationSequenceAndKittehIntroduction();

    document
      .querySelector("#overflow-button")
      .style.setProperty("pointer-events", "auto");

    const loadingScreen = document.querySelector("#loading-screen");
    await loadingScreen.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 800,
      easing: "ease",
      fill: "forwards",
    }).finished;
  },
  { once: true }
);

const browserHeuristics = getBrowserHeuristics();
const deviceHeuristics = getDeviceHeuristics();

const today = new SimpleDate();

const snowGlobeAnimation = {
  playing: false,
  requestToStop: false,

  play() {
    if (this.playing) return;

    this.playing = true;
    this.requestToStop = false;

    const generateSnowAnimation = async ({
      element,
      xPosition,
      radius,
      opacity,
      delay,
      duration,
      easing,
      keyframes,
    }) => {
      element.style.setProperty("cx", `${xPosition}`);
      element.style.setProperty("r", `${radius}`);
      element.style.setProperty("opacity", `${opacity}`);

      const timing = {
        delay: delay,
        duration: duration,
        easing: easing,
      };

      try {
        await element.animate(keyframes, timing).finished;
        if (snowGlobeAnimation.requestToStop) return;
        generateSnowAnimation({
          element,
          xPosition,
          radius,
          opacity,
          delay,
          duration,
          easing,
          keyframes,
        });
      } catch (error) {
        null;
      }
    };

    document.querySelectorAll(".foreground-snow *").forEach((element) => {
      const radius = getRandomNumber({ min: 15, max: 30 });
      generateSnowAnimation({
        element: element,
        xPosition: getRandomNumber({ min: -150, max: 325 }),
        radius: radius,
        opacity: (1 / 300) * radius + 0.9,
        delay: getRandomNumber({ min: 0, max: 20000 }),
        duration: -1000 * radius + 35000,
        easing: "ease",
        keyframes: [{ cy: "-70" }, { cy: "500" }],
      });
    });

    document.querySelectorAll(".background-snow *").forEach((element) => {
      const radius = getRandomNumber({ min: 7.5, max: 15 });
      generateSnowAnimation({
        element: element,
        xPosition: getRandomNumber({ min: -250, max: 425 }),
        radius: radius,
        opacity: (1 / 150) * radius + 0.85,
        delay: getRandomNumber({ min: 0, max: 45000 }),
        duration: ((40000 - 20000) / (7.5 - 15)) * radius + 60000,
        easing: "ease",
        keyframes: [{ cy: "-70" }, { cy: "500" }],
      });
    });
  },

  async stop() {
    this.requestToStop = true;

    await new Promise((resolve) => {
      const allSnow = Array.from(
        document.querySelectorAll(".background-snow *, .foreground-snow *")
      );
      allSnow.forEach((element) =>
        element.getAnimations().forEach((animation) => animation.cancel())
      );
      const checkInterval = setInterval(() => {
        const allSnowAnimations = allSnow.map((element) =>
          element.getAnimations()
        );
        const allSnowHasStopped = allSnowAnimations.every(
          (element) => !element.length
        );
        if (allSnowHasStopped) {
          clearInterval(checkInterval);
          resolve();
        }
      });
    });
    this.playing = false;
  },
};

class PumpkinLights {
  #leftPumpkin;
  #leftPumpkinOriginalFillColor;
  #rightPumpkin;
  #rightPumpkinOriginalFillColor;

  constructor({ leftPumpkin, rightPumpkin }) {
    this.#leftPumpkin = leftPumpkin;
    this.#leftPumpkinOriginalFillColor =
      leftPumpkin[0].style.getPropertyValue("fill");
    this.#rightPumpkin = rightPumpkin;
    this.#rightPumpkinOriginalFillColor =
      rightPumpkin[0].style.getPropertyValue("fill");
  }

  #requestToStop = false;
  #playing = false;

  play() {
    if (this.#playing) return;

    this.#playing = true;
    this.#requestToStop = false;

    this.changeLightColor({
      elements: this.#leftPumpkin,
      delayRange: [34, 300],
      hueRange: [29, 49],
      lightnessRange: [50, 90],
    });

    this.changeLightColor({
      elements: this.#rightPumpkin,
      delayRange: [100, 300],
      hueRange: [38, 58],
      lightnessRange: [60, 90],
    });
  }

  async changeLightColor({
    elements,
    delayRange: [delayMin, delayMax],
    hueRange: [hueMin, hueMax],
    lightnessRange: [lightnessMin, lightnessMax],
  }) {
    if (this.#requestToStop) return;

    const delay = getRandomNumber({ min: delayMin, max: delayMax });
    const hue = getRandomNumber({ min: hueMin, max: hueMax });
    const lightness = getRandomNumber({
      min: lightnessMin,
      max: lightnessMax,
    });

    elements.forEach((element) => {
      element.style.setProperty("fill", `hsl(${hue}, 100%, ${lightness}%)`);
    });

    setTimeout(() => {
      this.changeLightColor({
        elements,
        delayRange: [delayMin, delayMax],
        hueRange: [hueMin, hueMax],
        lightnessRange: [lightnessMin, lightnessMax],
      });
    }, delay);
  }

  async stop() {
    this.#requestToStop = true;
    await Promise.all(
      [...this.#leftPumpkin, ...this.#rightPumpkin].map((element) => {
        const originalColor = Array.from(this.#leftPumpkin).includes(element)
          ? this.#leftPumpkinOriginalFillColor
          : this.#rightPumpkinOriginalFillColor;
        return new Promise((resolve) => {
          element.style.setProperty("fill", originalColor);
          resolve();
        });
      })
    );
    return (this.#playing = false);
  }
}
const logoPumpkinLights = new PumpkinLights({
  leftPumpkin: document.querySelectorAll(".inside-left-pumpkin"),
  rightPumpkin: document.querySelectorAll(".inside-right-pumpkin"),
});

const kittehAppointerAndThemer = {
  appointedKitteh: null,
  appointedKittehElement: null,
  appointedKittehTheme: null,
  availableKittehs: ["charm", "shelby"],
  availableThemes: ["december", "halloween", "none", "november", "october"],
  onChangeKitteh: null,

  getRandomKitteh() {
    return this.availableKittehs[
      getRandomNumber({
        min: 0,
        max: this.availableKittehs.length - 1,
        randomIntegersOnly: true,
      })
    ];
  },

  setInitialKitteh() {
    return (this.initialKitteh = this.getRandomKitteh());
  },

  async appointKitteh({ kitteh = "same", theme = "same" } = {}) {
    if (
      !this.appointedKitteh &&
      !this.appointedKittehElement &&
      !this.appointedKittehTheme
    ) {
      kitteh = this.initialKitteh || this.getRandomKitteh();
      theme = this.getAutoTheme();
    } else if (
      this.appointedKitteh &&
      this.appointedKittehElement &&
      this.appointedKittehTheme
    ) {
      if (kitteh !== "same") {
        const availableKittehFound = this.availableKittehs.includes(
          kitteh.toLowerCase()
        );
        if (
          !availableKittehFound ||
          (availableKittehFound && this.appointedKitteh === kitteh)
        )
          kitteh = "same";
      }

      if (theme === "auto") theme = this.getAutoTheme();

      if (theme !== "same") {
        const availableThemeFound = this.availableThemes.includes(
          theme.toLowerCase()
        );
        if (
          !availableThemeFound ||
          (availableThemeFound && this.appointedKittehTheme === theme)
        )
          theme = "same";
      }
    }

    if (kitteh !== "same") {
      this.appointedKitteh = kitteh;
      this.appointedKittehElement = document.querySelector(
        `#logo #${kitteh}-logo`
      );
      this.changeKitteh();
    }
    if (theme !== "same") {
      this.appointedKittehTheme = theme;
      this.changeKittehTheme();
    }

    if (
      theme === "same" &&
      this.appointedKittehTheme === "halloween" &&
      kitteh !== "same"
    ) {
      this.switchHalloweenFangs();
    }

    return { kitteh: kitteh, theme: theme };
  },

  getAutoTheme() {
    if (today.month === 10) {
      if (today.day === 31) {
        return "halloween";
      } else if (today.day !== 31) {
        return "october";
      }
    } else if (today.month === 11) {
      return "november";
    } else if (today.month === 12) {
      return "december";
    } else {
      return "none";
    }
  },

  changeKitteh() {
    const allKittehs = document.querySelectorAll("#logo .subject > g");
    allKittehs.forEach((kitteh) => {
      if (kitteh !== this.appointedKittehElement) {
        kitteh.style.setProperty("visibility", "hidden");
      }
    });

    this.appointedKittehElement.style.setProperty("visibility", "visible");

    document
      .querySelector(":root")
      .style.setProperty(
        "--kitteh-grab-cursor",
        `url(${getCursorDataUri("grab")}) 16 9.6, grab`
      );

    document
      .querySelector(":root")
      .style.setProperty(
        "--kitteh-grabbing-cursor",
        `url(${getCursorDataUri("grabbing")}) 16 9.6, grabbing`
      );

    if (this.onChangeKitteh) this.onChangeKitteh();
  },

  switchHalloweenFangs() {
    const allKittehs = document.querySelectorAll("#logo .subject > g");
    allKittehs.forEach((kitteh) => {
      if (kitteh !== this.appointedKittehElement)
        kitteh
          .querySelectorAll(".halloween")
          .forEach((element) =>
            element.style.setProperty("visibility", "hidden")
          );
    });

    this.appointedKittehElement
      .querySelectorAll(".halloween")
      .forEach((element) => element.style.setProperty("visibility", "visible"));
  },

  async changeKittehTheme() {
    document
      .querySelectorAll(".october, .halloween, .november, .december")
      .forEach((item) => item.style.setProperty("visibility", "hidden"));

    document.querySelector("#logo").removeAttribute("title");

    await Promise.all([snowGlobeAnimation.stop(), logoPumpkinLights.stop()]);

    if (this.appointedKittehTheme === "none") return;

    if (this.appointedKittehTheme === "october") {
      applyOctoberTheme();
    } else if (this.appointedKittehTheme === "halloween") {
      applyHalloweenTheme();
    } else if (this.appointedKittehTheme === "november") {
      applyNovemberTheme();
    } else if (this.appointedKittehTheme === "december") {
      applyDecemberTheme();
    }

    function applyOctoberTheme() {
      document
        .querySelectorAll(".october")
        .forEach((item) => item.style.setProperty("visibility", "visible"));
    }

    function applyHalloweenTheme() {
      applyOctoberTheme();
      logoPumpkinLights.play();
      document
        .querySelectorAll(
          `#logo g.background .halloween, #logo g.foreground .halloween, #logo g.subject #${kittehAppointerAndThemer.appointedKitteh}-logo .halloween`
        )
        .forEach((item) => item.style.setProperty("visibility", "visible"));
      document
        .querySelector("#logo")
        .setAttribute("title", "\u{1F383} It is Halloween \u{1F383}");
    }

    function applyNovemberTheme() {
      document
        .querySelectorAll(".november")
        .forEach((item) => item.style.setProperty("visibility", "visible"));

      if (DateTools.getDateHolidayName(today.date) === "thanksgiving")
        document
          .querySelector("#logo")
          .setAttribute("title", "\u{1F967} It is Thanksgiving \u{1F967}");
    }

    function applyDecemberTheme() {
      const randomNumber = Math.random();

      const scarfLargeBlockFill =
        randomNumber < 0.5 ? "hsl(0, 100%, 63%)" : "hsl(212, 90.7%, 62%)";
      const scarfSmallBlockFill =
        randomNumber < 0.5 ? "hsl(0, 0%, 74%)" : "hsl(281, 100%, 75.1%)";
      const scarfSmallBlockStroke =
        randomNumber < 0.5 ? "hsl(108, 91%, 35%)" : "hsl(234, 95.5%, 35.1%)";

      const scarfLargeBlocks = document.querySelectorAll(
        "#logo > svg > g.foreground > g.december > g.scarf > path:nth-child(1), #logo > svg > g.foreground > g.december > g.scarf > path:nth-child(3)"
      );
      scarfLargeBlocks.forEach((element) => {
        element.style.setProperty("fill", scarfLargeBlockFill);
      });

      const scarfSmallBlocks = document.querySelectorAll("#logo g.scarf rect");
      scarfSmallBlocks.forEach((element) => {
        element.style.setProperty("fill", scarfSmallBlockFill);
        element.style.setProperty("stroke", scarfSmallBlockStroke);
      });

      document
        .querySelectorAll(".december")
        .forEach((item) => item.style.setProperty("visibility", "visible"));
      snowGlobeAnimation.play();
    }
  },
};

kittehAppointerAndThemer.setInitialKitteh();
kittehAppointerAndThemer.appointKitteh();

document.addEventListener("momentumScrollerActivate", (event) => {
  const scrollContainer = event.detail.scrollContainer;
  if (scrollContainer === document.querySelector("main")) {
    localStorage.setItem("momentumScrollerPreference", "on");
    document.querySelector("#touch-app-button").dataset.toggleButtonState =
      "on";
  } else if (
    scrollContainer ==
    document.querySelector("#momentum-scroller-demo-container")
  ) {
    const demoContainer = scrollContainer.closest(".demo-container");
    demoContainer.dataset.disabledDemo = "false";
    const demoContainerAlert = demoContainer.querySelector(
      ".demo-container-alert"
    );
    demoContainerAlert.dataset.activeAlert = "false";
    enableOrDisableDemoMomentumScrollerSelectors("enable");
  }
});

document.addEventListener("momentumScrollerDeactivate", (event) => {
  const scrollContainer = event.detail.scrollContainer;
  if (scrollContainer === document.querySelector("main")) {
    localStorage.setItem("momentumScrollerPreference", "off");
    document.querySelector("#touch-app-button").dataset.toggleButtonState =
      "off";
  } else if (
    scrollContainer ==
    document.querySelector("#momentum-scroller-demo-container")
  ) {
    const demoContainer = scrollContainer.closest(".demo-container");
    demoContainer.dataset.disabledDemo = "true";
    const demoContainerAlert = demoContainer.querySelector(
      ".demo-container-alert"
    );
    demoContainerAlert.dataset.activeAlert = "true";
    enableOrDisableDemoMomentumScrollerSelectors("disable");
  }
});

document.addEventListener("momentumScrollerScrollStart", (event) => {
  const scrollContainer = event.detail.scrollContainer;
  if (
    scrollContainer ==
    document.querySelector("#momentum-scroller-demo-container")
  ) {
    enableOrDisableDemoMomentumScrollerSelectors("disable");
  }
});

document.addEventListener("momentumScrollerScrollStop", (event) => {
  const scrollContainer = event.detail.scrollContainer;
  if (
    scrollContainer ==
    document.querySelector("#momentum-scroller-demo-container")
  ) {
    if (
      event.detail.interruptedBy ==
      "Scroll distance is below minimum scrollable distance"
    )
      return enableOrDisableDemoMomentumScrollerSelectors("enable");

    if (
      !(
        event.detail.interruptedBy === "Momentum scroller deactivation" ||
        event.detail.interruptedBy === "Pointer down on scroll container"
      )
    ) {
      enableOrDisableDemoMomentumScrollerSelectors("enable");
      const demoContainer = scrollContainer.closest(".demo-container");

      const distance = event.detail.distance.toFixed(1);
      const elapsedTime = Math.round(event.detail.elapsedTime);

      demoContainer.querySelector(
        "[data-label='distance']"
      ).textContent = `${distance} px`;
      demoContainer.querySelector(
        "[data-label='elapsed-time']"
      ).textContent = `${elapsedTime} ms`;

      demoContainer.querySelectorAll("[data-label]").forEach((element) =>
        flashAnimation(
          element,
          [
            ["color", "var(--text-color)", "hsl(60, 100%, 50%)"],
            ["transform", "scale(1)", "scale(1.2)"],
          ],
          400,
          "linear"
        )
      );
    }
  }
});

lightDarkAppearanceSwitcher.updateOnApplyAppearanceHandler(() => {
  document
    .querySelector(":root")
    .style.setProperty(
      "--kitteh-grab-cursor",
      `url(${getCursorDataUri("grab")}) 16 9.6, grab`
    );

  document
    .querySelector(":root")
    .style.setProperty(
      "--kitteh-grabbing-cursor",
      `url(${getCursorDataUri("grabbing")}) 16 9.6, grabbing`
    );
});

async function openingAnimationSequence() {
  const backgroundAnimation = document
    .querySelector("#article-selector")
    .animate(
      [
        { background: "transparent" },
        { background: "var(--button-background-color-active)" },
      ],
      { delay: 1200, duration: 400, fill: "forwards" }
    );

  document
    .querySelectorAll("#article-selector .selector-item")
    .forEach((element) => {
      setTimeout(() => {
        articleSelectorObserver.observe(element);
      }, 1100);
    });

  document
    .querySelectorAll("#project-selector .selector-item")
    .forEach((element) => {
      setTimeout(() => {
        projectSelectorObserver.observe(element);
      }, 1100);
    });

  await backgroundAnimation.finished;

  document
    .querySelector("#article-selector")
    .style.setProperty("background", "var(--button-background-color-active)");

  setTimeout(() => {
    backgroundAnimation.cancel();
  });

  const allAnimationsFinished = Promise.all(
    Array.from(
      document.querySelectorAll("#article-selector .selector-item")
    ).map(async (item) => {
      const itemAnimation = item.animate(
        [
          {
            transform: "translateY(0)",
          },
          {
            transform: "translateY(-180px)",
            easing: "cubic-bezier(0.68, -0.55, 0.87, 1.5)",
            offset: 0.33,
          },
          {
            transform: "translateY(0)",
            easing: "cubic-bezier(0.68, -0.55, 0.87, 1.05)",
          },
        ],
        {
          delay: 500,
          duration: 2000,
          easing: "cubic-bezier(0.25, -0.5, 0.02, 1.0)",
          fill: "forwards",
          iterations: 1,
        }
      );

      return itemAnimation.finished;
    })
  );

  setTimeout(() => {
    document.querySelector("#article-selector-projects").textContent =
      "Projects";
    document
      .querySelectorAll("#slogan-end, #slogan-spacer")
      .forEach((element) => {
        element.style.setProperty("width", "0");
      });
  }, 1500);

  await allAnimationsFinished;

  document
    .querySelectorAll("#slogan-end, #slogan-spacer")
    .forEach((element) => {
      element.remove();
    });

  document.querySelectorAll("article, .project-section").forEach((element) => {
    mainArticleObserver.observe(element);
  });

  document
    .querySelector("#article-selector")
    .style.setProperty("pointer-events", "auto");
}

function getCursorDataUri(cursorType, fillColor) {
  fillColor = fillColor || getFillColor();

  function getFillColor() {
    const kitteh =
      kittehAppointerAndThemer.appointedKitteh ||
      kittehAppointerAndThemer.initialKitteh;
    const appearance = lightDarkAppearanceSwitcher.currentAppearance;

    if (kitteh === "shelby") {
      return "hsl(28, 53.6%, 27.1%)";
    } else if (kitteh === "charm" && appearance === "dark") {
      return "hsl(0, 0%, 0%)";
    } else if (kitteh === "charm" && appearance === "light") {
      return "hsl(0, 0%, 20%)";
    }
  }

  if (cursorType === "grab") {
    return `'data:image/svg+xml,<svg viewBox="0 0 100 100" width="32px" height="32px" xmlns="http://www.w3.org/2000/svg"><g fill="${fillColor}"><rect x="30" width="40" height="72.311" y="27.689"></rect><ellipse cx="35" cy="47.615" rx="15.272" ry="24.031" transform="matrix(0.5, -0.866025, 0.866025, 0.5, -30.288789, 42.249315)"></ellipse><ellipse cx="35.585" cy="47.898" rx="15.272" ry="24.031" transform="matrix(0.866025, -0.5, 0.5, 0.866025, -12.56623, -1.28844)"></ellipse><ellipse cx="57.544" cy="55.893" rx="15.272" ry="24.031" transform="matrix(0.866025, 0.5, -0.5, 0.866025, 35.903162, -54.729734)"></ellipse><ellipse cx="53.171" cy="70.887" rx="15.272" ry="24.031" transform="matrix(0.5, 0.866025, -0.866025, 0.5, 106.357134, -45.745589)"></ellipse></g></svg>'`;
  } else if (cursorType === "grabbing") {
    return `'data:image/svg+xml,<svg viewBox="0 0 100 100" width="32px" height="32px" xmlns="http://www.w3.org/2000/svg"><g fill="${fillColor}"><rect x="30" width="40" height="72.311" y="27.689"></rect><ellipse cx="35" cy="47.615" rx="15.272" ry="24.031" transform="matrix(0.5, -0.866025, 0.866025, 0.5, -22.288949, 44.249315)"></ellipse><ellipse cx="57.544" cy="55.893" rx="15.272" ry="24.031" transform="matrix(0.866025, 0.5, -0.5, 0.866025, 33.903124, -50.729856)"></ellipse><ellipse cx="53.171" cy="70.887" rx="15.272" ry="24.031" transform="matrix(0.5, 0.866025, -0.866025, 0.5, 98.35721, -43.745818)"></ellipse><ellipse cx="57.929" cy="56.061" rx="15.272" ry="24.031" transform="matrix(0.866025, -0.5, 0.5, 0.866025, -33.998213, 6.814154)"></ellipse></g></svg>'`;
  }
}

const kittehMessageLibrary = {
  kittehMessages: [
    {
      kitteh: "charm",
      messagePackages: [
        {
          submissions: 0,
          messagePackage: [
            {
              message: "I don't like you.{300}{longblink}",
              options: {
                audioSource: "/audio/charm/i-dont-like-you.mp3",
                delayStart: 1000,
                delayBetweenChars: 90,
              },
            },
          ],
        },
        {
          submissions: 0,
          messagePackage: [
            {
              message: "{blink}I'm a big boy.",
              options: {
                audioSource: "/audio/charm/im-a-big-boy.mp3",
                delayStart: 1000,
                delayBetweenChars: 90,
              },
            },
            {
              message: "I like fish.{blink}",
              options: {
                audioSource: "/audio/charm/i-like-fish.mp3",
                delayBetweenChars: 90,
              },
            },
          ],
        },
        {
          submissions: 0,
          messagePackage: [
            {
              message: "My name is Charm.{250} {blink}I am a{200} cat.",
              options: {
                audioSource: "/audio/charm/my-name-is-charm.mp3",
                delayStart: 1000,
                delayEnd: 1000,
                delayBetweenChars: 100,
              },
            },
            {
              message: "This is a website.{blink}",
              options: {
                audioSource: "/audio/charm/this-is-a-website.mp3",
                delayStart: 500,
                delayBetweenChars: 100,
              },
            },
          ],
        },
        {
          submissions: 0,
          messagePackage: [
            {
              message: "Can I have a snack?{blink}",
              options: {
                audioSource: "/audio/charm/can-i-have-a-snack.mp3",
                delayStart: 1000,
                delayBetweenChars: 110,
              },
            },
          ],
        },
        {
          submissions: 0,
          messagePackage: [
            {
              message: "I hate{200} Dr.{100} Norsworthy.{blink}",
              options: {
                audioSource: "/audio/charm/i-hate-dr-norsworthy.mp3",
                delayStart: 1000,
                delayBetweenChars: 120,
              },
            },
          ],
        },
        {
          submissions: 0,
          messagePackage: [
            {
              message:
                "I like to eat{600} chicken.{blink} Do you have any chicken?{longblink}",
              options: {
                audioSource: "/audio/charm/i-like-to-eat-chicken.mp3",
                delayStart: 1000,
                delayBetweenChars: 110,
              },
            },
          ],
        },
        {
          submissions: 0,
          messagePackage: [
            {
              message: "My sister is Shelby.{1600}{blink} She is good.",
              options: {
                audioSource: "/audio/charm/my-sister-is-shelby.mp3",
                delayStart: 1000,
                delayBetweenChars: 120,
              },
            },
          ],
        },
        {
          submissions: 0,
          messagePackage: [
            {
              message: "{blink}I like to eat{400} corn.",
              options: {
                audioSource: "/audio/charm/i-like-to-eat-corn.mp3",
                delayStart: 1000,
                delayBetweenChars: 110,
              },
            },
          ],
        },
        {
          submissions: 0,
          messagePackage: [
            {
              message: "I love{400} mama.{400}{blink} He is good.",
              options: {
                audioSource: "/audio/charm/i-love-mama-he-is-good.mp3",
                delayStart: 1000,
                delayBetweenChars: 120,
              },
            },
          ],
        },
        {
          submissions: 0,
          messagePackage: [
            {
              message: "I love{400} my mama.{longblink}",
              options: {
                audioSource: "/audio/charm/i-love-my-mama.mp3",
                delayStart: 1000,
                delayBetweenChars: 120,
              },
            },
          ],
        },
        {
          submissions: 0,
          messagePackage: [
            {
              message: "This is safe.{blink}",
              options: {
                audioSource: "/audio/charm/this-is-safe.mp3",
                delayStart: 1000,
                delayBetweenChars: 120,
              },
            },
          ],
        },
        {
          submissions: 0,
          holiday: "halloween",
          messagePackage: [
            {
              message:
                "Today{200} is Halloween.{800}{blink} It is{600} bad.{blink}",
              options: {
                audioSource: "/audio/charm/today-is-halloween-it-is-bad.mp3",
                delayStart: 1000,
                delayBetweenChars: 120,
              },
            },
          ],
        },
      ],
    },
    {
      kitteh: "shelby",
      messagePackages: [
        {
          submissions: 0,
          messagePackage: [
            {
              message:
                "{blink}My name is Shelby.{700} Charm is my brother.{blink}",
              options: {
                audioSource: "/audio/shelby/my-name-is-shelby.mp3",
                delayStart: 1000,
              },
            },
          ],
        },
        {
          submissions: 0,
          messagePackage: [
            {
              message: "{blink}I am not a Chantilly-Tiffany.{longblink}",
              options: {
                audioSource: "/audio/shelby/not-a-chantilly-tiffany.mp3",
                delayStart: 1000,
                delayBetweenChars: 105,
              },
            },
          ],
        },
        {
          submissions: 0,
          messagePackage: [
            {
              message: "My favorite food is kibble.{longblink} ❤️",
              options: {
                audioSource: "/audio/shelby/my-favorite-food.mp3",
                delayStart: 1000,
                delayBetweenChars: 100,
              },
            },
          ],
        },

        {
          submissions: 0,
          messagePackage: [
            {
              message: "What's happening?{250} I don't understand.{blink}",
              options: {
                audioSource: "/audio/shelby/whats-happening.mp3",
                delayStart: 1000,
              },
            },
          ],
        },
        {
          submissions: 0,
          messagePackage: [
            {
              message: "<grumble>",
              options: {
                audioSource: "/audio/shelby/grumble.mp3",
                delayStart: 1000,
              },
            },
          ],
        },
        {
          submissions: 0,
          messagePackage: [
            {
              message: "Please don't push. I don't like it.{blink}",
              options: {
                audioSource: "/audio/shelby/please-dont-push.mp3",
                delayStart: 1000,
              },
            },
          ],
        },
        {
          submissions: 0,
          messagePackage: [
            {
              message: "Have you seen Beauty and the Beast?{blink}",
              options: {
                audioSource: "/audio/shelby/have-you-seen-beauty.mp3",
                delayStart: 1000,
              },
            },
          ],
        },
        {
          submissions: 0,
          messagePackage: [
            {
              message: "I like you.{250} ❤️{longblink}",
              options: {
                audioSource: "/audio/shelby/i-like-you.mp3",
                delayStart: 1000,
                delayBetweenChars: 110,
              },
            },
          ],
        },
        {
          submissions: 0,
          messagePackage: [
            {
              message:
                "Charm is my brother.{600}{blink} Sometimes he bothers me.{blink}",
              options: {
                audioSource: "/audio/shelby/charm-is-my-brother.mp3",
                delayStart: 1000,
                delayBetweenChars: 90,
              },
            },
          ],
        },
        {
          submissions: 0,
          holiday: "halloween",
          messagePackage: [
            {
              message:
                "Happy Halloween! Give me a treat,{0} please.{longblink}",
              options: {
                audioSource: "/audio/shelby/happy-halloween.mp3",
                delayStart: 1000,
                delayBetweenChars: 100,
              },
            },
          ],
        },
        {
          submissions: 0,
          messagePackage: [
            {
              message: "<nervous breathing>",
              options: {
                audioSource: "/audio/shelby/heavy-breathing.mp3",
                delayStart: 1000,
              },
            },
          ],
        },
        {
          submissions: 0,
          messagePackage: [
            {
              message: "I like to clean my brother's face.{blink}",
              options: {
                audioSource:
                  "/audio/shelby/i-like-to-clean-my-brothers-face.mp3",
                delayStart: 1000,
                delayBetweenChars: 90,
              },
            },
          ],
        },
        {
          submissions: 0,
          messagePackage: [
            {
              message: "I'm hungry.{blink} Is it dinner time?{blink}",
              options: {
                audioSource: "/audio/shelby/im-hungry-is-it-dinner-time.mp3",
                delayStart: 1000,
                delayBetweenChars: 95,
              },
            },
          ],
        },
        {
          submissions: 0,
          messagePackage: [
            {
              message: "I used to be in a movie.{longblink}",
              options: {
                audioSource: "/audio/shelby/i-used-to-be-in-a-movie.mp3",
                delayStart: 1000,
                delayBetweenChars: 110,
              },
            },
          ],
        },
        {
          submissions: 0,
          messagePackage: [
            {
              message: "I used to live in a castle.{blink}",
              options: {
                audioSource: "/audio/shelby/i-used-to-live-in-a-castle.mp3",
                delayStart: 1000,
                delayBetweenChars: 100,
              },
            },
          ],
        },
        {
          submissions: 0,
          messagePackage: [
            {
              message: "My name is Shelby.{1000} What is your name?{longblink}",
              options: {
                audioSource:
                  "/audio/shelby/my-name-is-shelby-what-is-your-name.mp3",
                delayStart: 1000,
                delayBetweenChars: 100,
              },
            },
          ],
        },
        {
          submissions: 0,
          messagePackage: [
            {
              message: "Where is my kibble? It's kibble time.{blink}",
              options: {
                audioSource: "/audio/shelby/where-is-my-kibble.mp3",
                delayStart: 1000,
              },
            },
          ],
        },
      ],
    },
  ],

  submitMessagesToKittehMessages({ index, preferHoliday = false } = {}) {
    const messagePackages = this.kittehMessages.find(
      (kittehMessagePackages) =>
        kittehMessagePackages.kitteh ===
        kittehAppointerAndThemer.appointedKitteh
    ).messagePackages;

    if (!messagePackages.length) return;

    const todaysHolidayName = DateTools.getDateHolidayName(today.date);

    const messagePackagesMinusInappropriateHolidays = messagePackages.filter(
      (messagePackage) =>
        !messagePackage.holiday || messagePackage.holiday === todaysHolidayName
    );

    if (preferHoliday && todaysHolidayName) {
      const holidayMessageIndex =
        messagePackagesMinusInappropriateHolidays.findIndex(
          (messagePackage) => messagePackage.holiday === todaysHolidayName
        );
      if (holidayMessageIndex !== -1) index = holidayMessageIndex;
    }

    if (index === undefined) {
      const messagePackageSubmissions =
        messagePackagesMinusInappropriateHolidays.map(
          (messagePackage, index) => {
            return {
              index: index,
              submissions: messagePackage.submissions,
            };
          }
        );
      messagePackageSubmissions.sort((a, b) => a.submissions - b.submissions);
      const leastSubmittedMessagePackages = messagePackageSubmissions.filter(
        (messagePackage) =>
          messagePackage.submissions ===
          messagePackageSubmissions[0].submissions
      );

      index =
        leastSubmittedMessagePackages[
          getRandomNumber({
            min: 0,
            max: leastSubmittedMessagePackages.length - 1,
            randomIntegersOnly: true,
          })
        ].index;
    }

    validateArgument("index", index, {
      allowedTypes: ["number"],
      allowedMin: 0,
      allowedMax: messagePackagesMinusInappropriateHolidays.length - 1,
      allowIntegerNumbersOnly: true,
    });

    messagePackagesMinusInappropriateHolidays[index].submissions++;

    return messagePackagesMinusInappropriateHolidays[index].messagePackage.map(
      (messagePackage) =>
        kittehMessages.submitMessage(
          messagePackage.message,
          messagePackage.options
        )
    );
  },
};

const kittehBlinkAnimation = {
  animationRaf: null,
  pointerIsDown: false,
  eyelidAnimationPromises: null,
  startTime: null,

  async blink(blink = "short") {
    if (this.pointerIsDown) return;

    const eyelidAnimationPromises = Array.from(
      kittehAppointerAndThemer.appointedKittehElement.querySelectorAll(
        `.${blink}-blink`
      )
    ).map((element) => {
      return new Promise((resolve) => {
        element.addEventListener("endEvent", resolve, { once: true });
      });
    });

    kittehAppointerAndThemer.appointedKittehElement
      .querySelectorAll(`.${blink}-blink`)
      .forEach((element) => {
        element.beginElement();
      });

    this.eyelidAnimationPromises = await Promise.all(eyelidAnimationPromises);
  },

  reset() {
    cancelAnimationFrame(this.animationRaf);
    this.startTime = null;
  },
};

const themedLogoAnimationDemo = {
  requestToLoop: null,

  async play({ loop = false } = {}) {
    if (loop) this.requestToLoop = true;

    try {
      const halloweenDemoElements =
        document.querySelectorAll(".halloween-demo");

      await this.waveAnimation({
        elements: Array.from(document.querySelectorAll(".month-day")),
      });

      halloweenDemoElements.forEach((halloweenDemoElement) =>
        halloweenDemoElement.style.setProperty("opacity", "1")
      );

      demoPumpkinLights.play();

      await this.holidayPulsingAnimation({
        element: document.querySelector(".halloween-day"),
      });

      this.reset();

      if (this.requestToLoop) {
        this.play();
      }
    } catch (error) {
      null;
    }
  },

  reset() {
    const elementsWithPotentialAnimationsToCancel = document.querySelectorAll(
      ".month-day, .halloween-day"
    );
    elementsWithPotentialAnimationsToCancel.forEach((element) =>
      cancelAllElementAnimations(element)
    );
    const halloweenDemoElements = document.querySelectorAll(".halloween-demo");
    halloweenDemoElements.forEach((halloweenDemoElement) =>
      halloweenDemoElement.style.setProperty("opacity", "0")
    );
    demoPumpkinLights.stop();
  },

  stop() {
    this.requestToLoop = false;
    this.reset();
  },

  async waveAnimation({
    initialAnimationDelay = 0,
    elements,
    easing = "linear",
    duration = 400,
    delayBetweenAnimations = 200,
  }) {
    let delay = initialAnimationDelay;

    const finishedAnimations = Promise.all(
      elements.map((element) => {
        const keyframes = [
          { filter: "brightness(100%)", transform: "scale(1)" },
          { filter: "brightness(110%)", transform: "scale(calc(2 / 3))" },
          { filter: "brightness(100%)", transform: "scale(1)" },
        ];

        const timing = {
          delay,
          duration,
          easing,
          fill: "forwards",
        };

        delay += delayBetweenAnimations;

        return element.animate(keyframes, timing).finished;
      })
    );

    await finishedAnimations;
    return finishedAnimations;
  },

  async holidayPulsingAnimation({
    element,
    delay = 0,
    easing = "linear",
    duration = 1000,
  }) {
    const keyframes = [
      { filter: "brightness(100%)", transform: "scale(1)" },
      { filter: "brightness(110%)", transform: "scale(1.5)" },
      { filter: "brightness(100%)", transform: "scale(1)" },
    ];

    const timing = {
      delay,
      duration,
      easing,
      fill: "forwards",
      iterations: 6,
    };

    const animationFinished = await element.animate(keyframes, timing).finished;
    return animationFinished;
  },
};

if (browserHeuristics.isSafari)
  document.querySelector("#slogan-end").style.setProperty("width", "220px");

const demoPumpkinLights = new PumpkinLights({
  leftPumpkin: document.querySelectorAll(".inside-left-pumpkin-demo"),
  rightPumpkin: document.querySelectorAll(".inside-right-pumpkin-demo"),
});

document.querySelector("#current-kitteh-text").textContent =
  kittehAppointerAndThemer.appointedKitteh.charAt(0).toUpperCase() +
  kittehAppointerAndThemer.appointedKitteh.slice(1);
document.querySelector("#current-kitteh-theme-text").textContent =
  kittehAppointerAndThemer.appointedKittehTheme.charAt(0).toUpperCase() +
  kittehAppointerAndThemer.appointedKittehTheme.slice(1);

const articleSelectorObserver = new IntersectionObserver(
  selectorObserverProcessor,
  {
    root: document.querySelector("#article-selector"),
    threshold: 0.5,
  }
);

const projectSelectorObserver = new IntersectionObserver(
  selectorObserverProcessor,
  {
    root: document.querySelector("#project-selector"),
    threshold: 0.5,
  }
);

const scrollerTypeSelectorObserver = new IntersectionObserver(
  selectorObserverProcessor,
  {
    root: document.querySelector("#scroller-type-selector"),
    threshold: 0.5,
  }
);
document
  .querySelectorAll("#scroller-type-selector .selector-item")
  .forEach((element) => scrollerTypeSelectorObserver.observe(element));

const decelerationSelectorObserver = new IntersectionObserver(
  selectorObserverProcessor,
  {
    root: document.querySelector("#deceleration-selector"),
    threshold: 0.5,
  }
);
document
  .querySelectorAll("#deceleration-selector .selector-item")
  .forEach((element) => decelerationSelectorObserver.observe(element));

const elasticScrollBouncinessSelectorObserver = new IntersectionObserver(
  selectorObserverProcessor,
  {
    root: document.querySelector("#bounciness-selector"),
    threshold: 0.5,
  }
);
document
  .querySelectorAll("#bounciness-selector .selector-item")
  .forEach((element) =>
    elasticScrollBouncinessSelectorObserver.observe(element)
  );

const easingSelectorObserver = new IntersectionObserver(
  selectorObserverProcessor,
  {
    root: document.querySelector("#easing-selector"),
    threshold: 0.5,
  }
);
document
  .querySelectorAll("#easing-selector .selector-item")
  .forEach((element) => easingSelectorObserver.observe(element));

const kittehSelectorObserver = new IntersectionObserver(
  selectorObserverProcessor,
  {
    root: document.querySelector("#kitteh-selector"),
    threshold: 0.5,
  }
);
document
  .querySelectorAll("#kitteh-selector .selector-item")
  .forEach((element) => kittehSelectorObserver.observe(element));

const kittehThemeSelectorObserver = new IntersectionObserver(
  selectorObserverProcessor,
  {
    root: document.querySelector("#kitteh-theme-selector"),
    threshold: 0.5,
  }
);
document
  .querySelectorAll("#kitteh-theme-selector .selector-item")
  .forEach((element) => kittehThemeSelectorObserver.observe(element));

function selectorObserverProcessor(entries) {
  const incoming = entries.find((incomingItem) => incomingItem.isIntersecting);

  if (incoming) {
    this.incoming = incoming.target;
    if (incoming.target.closest("#project-selector")) return;

    const incomingWidth = incoming.target.clientWidth;
    const padding = 12;
    this.root.style.setProperty("width", `${incomingWidth + padding}px`);
  }
}

const mainArticleObserver = new IntersectionObserver(
  (entries) => {
    const incoming = entries.find(
      (item) =>
        (item.target.matches("article") ||
          item.target.matches(".project-section")) &&
        item.isIntersecting
    );
    const outgoingProjectsArticle = entries.find(
      (item) => item.target.matches("#projects-article") && !item.isIntersecting
    );

    if (outgoingProjectsArticle) {
      const projectSelector = document.querySelector("#project-selector");
      projectSelector.dataset.hidden = "true";
      projectSelector.setAttribute("tabindex", "-1");
      projectSelector.blur();
    }

    if (incoming) {
      const matchingSelectorItemOffsetTop = incoming.target.dataset.selectorId
        ? document.querySelector(incoming.target.dataset.selectorId).offsetTop
        : 0;

      if (incoming.target.matches("article")) {
        mainArticleObserver.currentArticleSelectorItemOffsetTop =
          matchingSelectorItemOffsetTop;
      } else if (incoming.target.matches(".project-section")) {
        mainArticleObserver.currentProjectSelectorItemOffsetTop =
          matchingSelectorItemOffsetTop;
      }

      if (incoming.target.matches("#projects-article")) {
        const projectSelector = document.querySelector("#project-selector");
        projectSelector.dataset.hidden = "false";
        projectSelector.setAttribute("tabindex", "0");
      }

      if (mainArticleObserver.requestToPause) return;

      if (incoming.target.matches("article")) {
        SmoothScroller.scroll({
          scrollContainer: document.querySelector("#article-selector"),
          y: matchingSelectorItemOffsetTop,
        });
      } else if (incoming.target.matches(".project-section")) {
        SmoothScroller.scroll({
          scrollContainer: document.querySelector("#project-selector"),
          y: matchingSelectorItemOffsetTop,
        });
      }
    }
  },
  {
    root: document.querySelector("main"),
    rootMargin: "0% 0% -100% 0%",
    threshold: 0,
  }
);

const insideMainViewport = new IntersectionObserver(
  async (entries) => {
    const incoming = entries.find((entry) => entry.isIntersecting);

    const incomingTargetIsAVideo = incoming && incoming.target.matches("video");
    const incomingTargetIsTheCharmCursor =
      incoming && incoming.target.matches("#charm-cursor");
    const incomingTargetIsTheCalendar =
      incoming &&
      incoming.target.matches("#overlap-gallery-calendar-container");

    if (incomingTargetIsAVideo) {
      const incomingVideo = incoming.target;
      const videoGalleryIsScrollingToTheNextVideo = SmoothScroller.getScroller(
        incomingVideo.closest(".video-gallery")
      )?.getScrollerData().scrolling;

      if (
        incomingVideo.paused &&
        !VideoGalleryObservers.aVideoGalleryIsActive &&
        !videoGalleryIsScrollingToTheNextVideo
      ) {
        try {
          await incomingVideo.play();
        } catch (error) {
          console.log(error);
        }
      }
    } else if (incomingTargetIsTheCharmCursor) {
      if (!charmCursorDemo.requestToLoop) charmCursorDemo.play({ loop: true });
    } else if (incomingTargetIsTheCalendar) {
      if (!themedLogoAnimationDemo.requestToLoop)
        themedLogoAnimationDemo.play({ loop: true });
    }
  },
  {
    root: document.querySelector("main"),
    rootMargin: "-40% 0% -60% 0%",
    threshold: 0,
  }
);
insideMainViewport.observe(
  document.querySelector("#overlap-gallery-calendar-container")
);

const outsideMainViewport = new IntersectionObserver(
  (entries) => {
    const outgoing = entries.find((entry) => !entry.isIntersecting);

    if (outgoing?.target.matches("video")) {
      outgoing.target.pause();
      insideMainViewport.observe(outgoing.target);
    } else if (outgoing?.target.matches("#charm-cursor")) {
      charmCursorDemo.stop();
    } else if (
      outgoing?.target.matches("#overlap-gallery-calendar-container")
    ) {
      themedLogoAnimationDemo.stop();
    }

    for (const entry of entries) {
      if (entry.intersectionRatio === 0) {
        insideMainViewport.observe(entry.target);
      }
    }
  },
  {
    root: document.querySelector("main"),
    threshold: 0,
  }
);
outsideMainViewport.observe(
  document.querySelector("#overlap-gallery-calendar-container")
);

const videos = Array.from(document.querySelectorAll(".video-gallery video"));

videos.forEach((video) => {
  insideMainViewport.observe(video);
  outsideMainViewport.observe(video);
});

videos.forEach((video) => {
  video.addEventListener("contextmenu", (event) => {
    if (deviceHeuristics.isTouchScreen) event.preventDefault();
  });

  video.addEventListener("timeupdate", () => {
    const percentProgress =
      video.currentTime > 0.1 ? (video.currentTime * 100) / video.duration : 0;

    const videoIndex = videos.findIndex((videoInList) => videoInList === video);

    document
      .querySelectorAll(".video-progress-bar")
      [videoIndex].style.setProperty("width", `calc(${percentProgress}%)`);
  });

  video.addEventListener("play", () => {
    const videoIndex = videos.findIndex((videoInList) => videoInList === video);

    insideMainViewport.unobserve(video);

    document
      .querySelectorAll(".video-progress-bar-container")
      [videoIndex].style.setProperty("width", "calc(750px / 34)");

    videos.forEach((otherVideo) => {
      if (otherVideo !== video) {
        otherVideo.pause();
        if (!VideoGalleryObservers.aVideoGalleryIsActive) {
          insideMainViewport.observe(otherVideo);
        }
      }
    });
  });

  video.addEventListener("pause", () => {
    video.currentTime = 0.1;
    const videoIndex = videos.findIndex((videoInList) => videoInList === video);

    document
      .querySelectorAll(".video-progress-bar-container")
      [videoIndex].style.setProperty("width", "calc(750px / 17 / 6)");
  });

  video.addEventListener("ended", async () => {
    insideMainViewport.unobserve(video);

    const videoIndex = videos.findIndex((videoInList) => videoInList === video);

    document
      .querySelectorAll(".video-progress-bar-container")
      [videoIndex].style.setProperty("width", "calc(750px / 17 / 6)");
    video.currentTime = 0.1;

    const nextVideo = video.nextElementSibling?.matches("video")
      ? video.nextElementSibling
      : null;

    if (nextVideo && !VideoGalleryObservers.aVideoGalleryIsActive) {
      const nextVideoPosition = nextVideo.offsetLeft;

      try {
        await nextVideo.play();
      } catch (error) {
        console.log(error);
      }

      SmoothScroller.scroll({
        scrollContainer: nextVideo.closest(".video-gallery"),
        x: nextVideoPosition,
      });
    }
  });
});

document.addEventListener("smoothScrollerScrollStop", (event) => {
  if (event.detail.scrollContainer === document.querySelector("main")) {
    if (event.detail.interruptedBy === "New smooth scroll") return;

    SmoothScroller.scroll({
      scrollContainer: document.querySelector("#article-selector"),
      y: mainArticleObserver.currentArticleSelectorItemOffsetTop,
    });
    SmoothScroller.scroll({
      scrollContainer: document.querySelector("#project-selector"),
      y: mainArticleObserver.currentProjectSelectorItemOffsetTop,
    });
  }
});

SmoothScroller.scroll({
  scrollContainer: document.querySelector("#easing-selector"),
  y: document.querySelector(
    "#easing-selector .selector-item[data-easing='ease']"
  ).offsetTop,
  duration: 0,
});

SmoothScroller.scroll({
  scrollContainer: document.querySelector("#kitteh-selector"),
  y: document.querySelector(
    `#kitteh-selector .selector-item[data-kitteh="${kittehAppointerAndThemer.appointedKitteh}"]`
  ).offsetTop,
  duration: 0,
});

SmoothScroller.scroll({
  scrollContainer: document.querySelector("#kitteh-theme-selector"),
  y: document.querySelector(
    `#kitteh-theme-selector .selector-item[data-theme="${kittehAppointerAndThemer.appointedKittehTheme}"]`
  ).offsetTop,
  duration: 0,
});

class VideoGalleryObservers {
  static videoGalleryObserverMap = new Map();
  static aVideoGalleryIsActive = false;

  #root;
  #lastObservedVideo;
  #observer;

  constructor(root) {
    this.#root = root;
    this.#lastObservedVideo = this.#root.querySelector("video");
    this.#observer = new IntersectionObserver(
      async (entries) => {
        const incomingVideo = entries.find((video) => video.isIntersecting);

        if (incomingVideo) {
          this.#lastObservedVideo = incomingVideo.target;

          const downloadVideoButton = incomingVideo.target
            .closest(".media-container")
            .querySelector(".download-video-button");
          downloadVideoButton.setAttribute(
            "href",
            incomingVideo.target.getAttribute("src").replace(/#t=[\d.]+/, "")
          );

          if (VideoGalleryObservers.aVideoGalleryIsActive) {
            try {
              await incomingVideo.target.play();
            } catch (error) {
              console.log(error);
            }
          }
        }
      },
      {
        root: this.#root,
        rootMargin: "0px -50% 0px -50%",
        threshold: 0,
      }
    );
    this.#root
      .querySelectorAll("video")
      .forEach((video) => this.#observer.observe(video));
    VideoGalleryObservers.videoGalleryObserverMap.set(root, this);
  }

  get lastObservedVideo() {
    return this.#lastObservedVideo;
  }

  get root() {
    return this.#root;
  }
}

document
  .querySelectorAll(".video-gallery")
  .forEach((videoGallery) => new VideoGalleryObservers(videoGallery));

class InputEventDelegator {
  constructor() {
    document.addEventListener("pointerdown", (event) => this.delegate(event));
    document.addEventListener("pointerup", (event) => this.delegate(event));
    document.addEventListener("pointercancel", (event) => this.delegate(event));
    document.addEventListener("keydown", (event) => this.delegate(event));
    document.addEventListener("keyup", (event) => this.delegate(event));
    document.addEventListener("contextmenu", (event) => this.delegate(event));
    document.addEventListener("dragstart", (event) => event.preventDefault());
  }

  #isAlreadyHandlingInput = false;

  get isAlreadyHandlingInput() {
    return this.#isAlreadyHandlingInput;
  }

  #inputDownEvent;
  #handlers;
  #inputUpAbortController = new AbortController();

  delegate(event) {
    if (event.repeat) return;
    const inputIsAnAcceptableInput = isPrimaryInput(event);
    if (!inputIsAnAcceptableInput) return;

    const inputState = this.getInputState(event);
    if (!inputState) return;

    if (inputState === "pressed") {
      if (this.#isAlreadyHandlingInput) return event.preventDefault();

      this.#isAlreadyHandlingInput = true;

      const inputDownTarget = event.target;
      const handlers = this.getHandlers(inputDownTarget);

      if (!handlers) return this.reset();

      if (!(!browserHeuristics.isChromium && inputDownTarget.closest("a")))
        event.preventDefault();

      this.#inputDownEvent = event;
      this.#handlers = handlers;

      handlers.inputDownHandler(event);
    } else if (inputState === "activated") {
      this.#isAlreadyHandlingInput = false;
      this.#handlers.inputUpHandler({
        event,
        target: this.#inputDownEvent.target,
        targetsMatch: true,
      });
      this.reset();
    } else if (inputState === "canceled") {
      this.#inputDownEvent.target.releasePointerCapture(event.pointerId);
      this.#inputDownEvent.target.dispatchEvent(
        new PointerEvent("pointercancel", {
          bubbles: true,
        })
      );

      this.#handlers.inputUpHandler({
        event,
        target: this.#inputDownEvent.target,
        targetsMatch: false,
      });
      this.reset();
      this.#isAlreadyHandlingInput = false;
    }
  }

  getInputState(event) {
    if (
      event.type === "pointerdown" ||
      (event.type === "keydown" && event.key === "Enter")
    ) {
      return "pressed";
    } else if (
      this.#inputDownEvent &&
      event.target === this.#inputDownEvent.target &&
      !(
        deviceHeuristics.isTouchScreen &&
        this.#inputDownEvent.target.hasPointerCapture(event.pointerId) &&
        (visualViewport.width + visualViewport.offsetLeft - event.clientX <
          10 ||
          event.clientX < 10 ||
          visualViewport.height + visualViewport.offsetTop - event.clientY <
            10 ||
          event.clientY < 10)
      ) &&
      (event.type === "pointerup" ||
        (event.type === "keyup" && event.key === "Enter"))
    ) {
      return "activated";
    } else if (
      this.#inputDownEvent &&
      (event.type === "pointerup" ||
        event.type === "pointercancel" ||
        (event.type === "keydown" && event.key === "Escape") ||
        event.type === "contextmenu")
    ) {
      return "canceled";
    }
  }

  getHandlers(target) {
    const handlers = this.#targetHandlerMaps.find((targetHandlerMap) =>
      target.matches(targetHandlerMap.selectors)
    )?.handlers;

    return handlers;
  }

  forceInputUpHandler(event) {
    if (!this.#handlers) return;
    this.#handlers.inputUpHandler({
      event,
      target: this.#inputDownEvent.target,
      targetsMatch: false,
    });
    this.reset();
  }

  reset() {
    this.#inputUpAbortController.abort();
    this.#inputUpAbortController = new AbortController();
    this.#inputDownEvent = null;
    this.#handlers = null;
    this.#isAlreadyHandlingInput = false;
  }

  animationLibrary = {
    ripple(target, { x, y, duration = 800 } = {}) {
      validateArgument("target", target, {
        allowedPrototypes: [Element],
      });

      const camelCaseTargetId = convertHyphenCaseToCamelCase(target.id);

      this[`rippleAnimationFor${camelCaseTargetId}`]?.cancel();
      this[`derippleAnimationFor${camelCaseTargetId}`]?.cancel();

      const targetRects = target.getBoundingClientRect();

      const rippleContainer = target.querySelector(".ripple-container");

      if (!x || !y) {
        x = targetRects.left + 0.5 * targetRects.width;
        y = targetRects.top + 0.5 * targetRects.height;
      }

      const left = x - scrollX - targetRects.left - rippleContainer.offsetLeft;

      const top = y - scrollY - targetRects.top - rippleContainer.offsetTop;

      const hypotenuse = Math.hypot(targetRects.width, targetRects.height);

      const rippleElement = target.querySelector(".ripple");

      this[`rippleAnimationFor${camelCaseTargetId}`] = rippleElement.animate(
        [
          {
            left: `${left}px`,
            opacity: "1",
            top: `${top}px`,
            transform: "scale(0)",
          },
          {
            left: `${left}px`,
            opacity: "1",
            top: `${top}px`,
            transform: `scale(${hypotenuse})`,
          },
        ],

        {
          duration,
          easing: "ease",
          fill: "forwards",
        }
      );
    },

    async deripple(elementToDerippleOver) {
      const camelCaseTargetId = convertHyphenCaseToCamelCase(
        elementToDerippleOver.id
      );

      const rippleElement = elementToDerippleOver.querySelector(".ripple");

      this[`derippleAnimationFor${camelCaseTargetId}`] = rippleElement.animate(
        [{ opacity: "1" }, { opacity: "0" }],

        {
          duration: 400,
          easing: "ease",
          fill: "forwards",
        }
      );

      const animationPromise = await new Promise((resolve) => {
        this[`derippleAnimationFor${camelCaseTargetId}`].onfinish = () => {
          resolve("finished");
        };

        this[`derippleAnimationFor${camelCaseTargetId}`].oncancel = () => {
          resolve("canceled");
        };
      });

      return animationPromise;
    },

    async flashUnderline(underlineElement) {
      const camelCaseTargetId = convertHyphenCaseToCamelCase(
        underlineElement.id
      );

      this[`flashUnderlineAnimationFor${camelCaseTargetId}`]?.cancel();
      this[`deflashUnderlineAnimationFor${camelCaseTargetId}`]?.cancel();

      this[`flashUnderlineAnimationFor${camelCaseTargetId}`] =
        underlineElement.animate(
          [
            {
              backgroundPosition: "left bottom, left bottom",
            },
            {
              backgroundPosition:
                "left calc(-750px / 34 / 3) bottom, left calc(-750px / 34 / 3) bottom",
            },
          ],
          {
            duration: 400,
            easing: "ease",
            fill: "forwards",
          }
        );
    },

    async deflashUnderline(underlineElement, targetsMatch) {
      const camelCaseTargetId = convertHyphenCaseToCamelCase(
        underlineElement.id
      );

      const linePosition = targetsMatch
        ? "left bottom, left calc(750px / 34 / 6) bottom"
        : "left bottom, left bottom";

      this[`deflashUnderlineAnimationFor${camelCaseTargetId}`] =
        underlineElement.animate(
          [
            {
              backgroundPosition: linePosition,
            },
          ],
          {
            duration: 400,
            easing: "ease",
            fill: "forwards",
          }
        );

      const animationPromise = await new Promise((resolve) => {
        this[`deflashUnderlineAnimationFor${camelCaseTargetId}`].onfinish =
          () => {
            resolve("finished");
          };

        this[`deflashUnderlineAnimationFor${camelCaseTargetId}`].oncancel =
          () => {
            resolve("canceled");
          };
      });

      return animationPromise;
    },
  };

  #targetHandlerMaps = [
    {
      selectors: ".selector",
      handlers: {
        pointerMoveAbortController: new AbortController(),
        inputDownHandler(event) {
          const target = event.target;

          const observer = [
            articleSelectorObserver,
            projectSelectorObserver,
            scrollerTypeSelectorObserver,
            decelerationSelectorObserver,
            elasticScrollBouncinessSelectorObserver,
            easingSelectorObserver,
            kittehSelectorObserver,
            kittehThemeSelectorObserver,
          ].find((observer) => observer.root === target);

          this.currentOffsetTop = observer.incoming.offsetTop;

          const isArticleSelector =
            target === document.querySelector("#article-selector");
          const isProjectSelector =
            target === document.querySelector("#project-selector");

          if (isArticleSelector || isProjectSelector) {
            if (browserHeuristics.isIOsSafari) {
              document
                .querySelector("main")
                .style.setProperty("overflow", "hidden");
            }
          }

          target.classList.toggle("pressed");

          if (event.type === "keydown") return;

          target.style.setProperty("cursor", "var(--kitteh-grabbing-cursor)");

          target.setPointerCapture(event.pointerId);

          let movementY = 0;
          let previousScreenY = event.screenY; // Safari returns undefined for event.movementY

          target.addEventListener(
            "pointermove",
            (event) => {
              movementY = event.screenY - previousScreenY;

              target.scrollTop -=
                movementY * (deviceHeuristics.isTouchScreen ? 4 : 1);

              previousScreenY = event.screenY;
            },
            { signal: this.pointerMoveAbortController.signal }
          );
        },

        async inputUpHandler({ event, target, targetsMatch }) {
          this.pointerMoveAbortController.abort();
          this.pointerMoveAbortController = new AbortController();

          target.style.setProperty("cursor", "var(--kitteh-grab-cursor)");

          const isArticleSelector =
            target === document.querySelector("#article-selector");

          const isProjectSelector =
            target === document.querySelector("#project-selector");

          const isKittehSelectorOrThemeSelector =
            target === document.querySelector("#kitteh-selector") ||
            target === document.querySelector("#kitteh-theme-selector");

          const isScrollerTypeSelector =
            target === document.querySelector("#scroller-type-selector");

          const isEasingSelector =
            target === document.querySelector("#easing-selector");

          const isDecelerationSelector =
            target === document.querySelector("#deceleration-selector");

          const isElasticScrollBouncinessSelector =
            target === document.querySelector("#bounciness-selector");

          const observer = [
            articleSelectorObserver,
            projectSelectorObserver,
            scrollerTypeSelectorObserver,
            decelerationSelectorObserver,
            elasticScrollBouncinessSelectorObserver,
            easingSelectorObserver,
            kittehSelectorObserver,
            kittehThemeSelectorObserver,
          ].find((observer) => observer.root === target);

          let matchingMainScrollTop;
          if (isArticleSelector || isProjectSelector) {
            if (browserHeuristics.isIOsSafari) {
              document.querySelector("main").style.removeProperty("overflow");
            }

            mainArticleObserver.requestToPause = true;

            const main = document.querySelector("main");
            const selectorItem =
              event.type === "pointerup"
                ? observer.incoming
                : observer.incoming.nextElementSibling && targetsMatch
                ? observer.incoming.nextElementSibling
                : target.querySelector(".selector-item") && targetsMatch
                ? target.querySelector(".selector-item")
                : observer.incoming;

            if (!selectorItem)
              return (mainArticleObserver.requestToPause = false);

            matchingMainScrollTop = selectorItem.dataset.idToScrollTo
              ? Math.abs(
                  document
                    .querySelector(selectorItem.dataset.idToScrollTo)
                    .getBoundingClientRect().top -
                    main.getBoundingClientRect().top +
                    main.scrollTop +
                    5 // The +5 is to account for small differences in user agent calculations
                )
              : 0;
          }

          const incomingOffsetTop =
            event.type === "pointerup" && targetsMatch
              ? observer.incoming.offsetTop
              : observer.incoming.nextElementSibling && targetsMatch
              ? observer.incoming.nextElementSibling.offsetTop
              : target.querySelector("div") && targetsMatch
              ? target.querySelector("div").offsetTop
              : this.currentOffsetTop;

          const smoothScrollerPromise = SmoothScroller.scroll({
            scrollContainer: target,
            y: incomingOffsetTop,
          });

          target.classList.toggle("pressed");

          if (isArticleSelector || isProjectSelector) {
            const mainSmoothScrollerPromise = targetsMatch
              ? SmoothScroller.scroll({
                  scrollContainer: document.querySelector("main"),
                  y: matchingMainScrollTop,
                })
              : null;
            await Promise.all([
              smoothScrollerPromise,
              mainSmoothScrollerPromise,
            ]);
            mainArticleObserver.requestToPause = false;
          } else if (isKittehSelectorOrThemeSelector) {
            await smoothScrollerPromise;
            kittehAppointerAndThemer.appointKitteh({
              kitteh: kittehSelectorObserver.incoming.dataset.kitteh,
              theme: kittehThemeSelectorObserver.incoming.dataset.theme,
            });
          } else if (isScrollerTypeSelector) {
            await smoothScrollerPromise;
            document.querySelector(
              "#momentum-scroller-demo-container"
            ).dataset.scrollerType =
              scrollerTypeSelectorObserver.incoming.dataset.scrollerType;
          } else if (isDecelerationSelector) {
            const demoMomentumScroller = MomentumScroller.getScroller(
              document.querySelector("#momentum-scroller-demo-container")
            );
            await smoothScrollerPromise;
            demoMomentumScroller.setDecelerationLevel(
              decelerationSelectorObserver.incoming.dataset.deceleration
            );
          } else if (isElasticScrollBouncinessSelector) {
            await smoothScrollerPromise;
            const demoMomentumScroller = MomentumScroller.getScroller(
              document.querySelector("#momentum-scroller-demo-container")
            );
            demoMomentumScroller.setBorderBouncinessLevel(
              elasticScrollBouncinessSelectorObserver.incoming.dataset
                .bounciness
            );
          } else if (isEasingSelector) {
            await smoothScrollerPromise;
          }
        },
      },
    },
    {
      selectors: ".video-gallery",
      handlers: {
        pointerMoveAbortController: new AbortController(),
        pointerMoveReleasePointerCaptureCriteriaAbortController:
          new AbortController(),
        inputDownHandler(event) {
          const target = event.target;

          const videoGalleryObserver =
            VideoGalleryObservers.videoGalleryObserverMap.get(target);

          this.lastObservedVideo = videoGalleryObserver.lastObservedVideo;

          target.style.setProperty("cursor", "var(--kitteh-grabbing-cursor)");
          target.style.setProperty("transform", "scale(1.1)");

          VideoGalleryObservers.aVideoGalleryIsActive = false;

          if (event.type === "keydown") return;

          VideoGalleryObservers.aVideoGalleryIsActive = true;

          event.target.setPointerCapture(event.pointerId);

          target.addEventListener(
            "momentumScrollerRoute",
            (event) => {
              const { routeTarget } = event.detail;
              if (target === routeTarget) return;
              target.dispatchEvent(new PointerEvent("pointercancel"));
              inputEventDelegator.forceInputUpHandler(event);
            },
            {
              signal:
                this.pointerMoveReleasePointerCaptureCriteriaAbortController
                  .signal,
            }
          );

          let movementX = 0;
          let previousScreenX = event.screenX; // Safari returns undefined for event.movementX

          target.addEventListener(
            "pointermove",
            (event) => {
              movementX = event.screenX - previousScreenX;

              target.scrollLeft -=
                movementX * (deviceHeuristics.isTouchScreen ? 4 : 1);

              previousScreenX = event.screenX;
            },
            { signal: this.pointerMoveAbortController.signal }
          );
        },

        async inputUpHandler({ event, target, targetsMatch }) {
          this.pointerMoveReleasePointerCaptureCriteriaAbortController.abort();
          this.pointerMoveReleasePointerCaptureCriteriaAbortController =
            new AbortController();

          this.pointerMoveAbortController.abort();
          this.pointerMoveAbortController = new AbortController();

          target.style.setProperty("cursor", "var(--kitteh-grab-cursor)");

          const videoGalleryObserver =
            VideoGalleryObservers.videoGalleryObserverMap.get(target);

          const lastObservedVideo =
            (event.type === "pointerup" || event.type === "pointermove") &&
            targetsMatch
              ? videoGalleryObserver.lastObservedVideo
              : videoGalleryObserver.lastObservedVideo.nextElementSibling &&
                targetsMatch
              ? videoGalleryObserver.lastObservedVideo.nextElementSibling
              : target.querySelector("video") && targetsMatch
              ? target.querySelector("video")
              : this.lastObservedVideo;

          const videoOffsetLeft = lastObservedVideo.offsetLeft;

          if (targetsMatch) {
            try {
              await lastObservedVideo.play();
            } catch (error) {
              console.log(error);
            }
          }

          target.style.removeProperty("transform");

          await SmoothScroller.scroll({
            scrollContainer: target,
            x: videoOffsetLeft,
          });

          VideoGalleryObservers.aVideoGalleryIsActive = false;
        },
      },
    },
    {
      selectors: ".link-container",
      handlers: {
        pointerMoveReleasePointerCaptureCriteriaAbortController:
          new AbortController(),
        inputDownHandler(event) {
          const target = event.target;

          if (event.type === "pointerdown") {
            target.releasePointerCapture(event.pointerId);
          }

          inputEventDelegator.animationLibrary.flashUnderline(
            target.querySelector(".link-content")
          );

          if (event.type === "pointerdown") {
            inputEventDelegator.animationLibrary.ripple(target, {
              x: event.pageX,
              y: event.pageY,
            });
          } else if (event.type === "keydown") {
            if (!browserHeuristics.isChromium && target.closest("a"))
              return (inputEventDelegator.#isAlreadyHandlingInput = false);

            inputEventDelegator.animationLibrary.ripple(target);
          }

          target.addEventListener(
            "momentumScrollerRoute",
            (event) => {
              const { routeTarget } = event.detail;
              if (target === routeTarget) return;
              inputEventDelegator.forceInputUpHandler(event);
            },
            {
              signal:
                this.pointerMoveReleasePointerCaptureCriteriaAbortController
                  .signal,
            }
          );
        },

        async inputUpHandler({ target, targetsMatch }) {
          this.pointerMoveReleasePointerCaptureCriteriaAbortController.abort();
          this.pointerMoveReleasePointerCaptureCriteriaAbortController =
            new AbortController();

          inputEventDelegator.animationLibrary.deflashUnderline(
            target.querySelector(".link-content"),
            targetsMatch
          );

          const derippled = await inputEventDelegator.animationLibrary.deripple(
            target
          );

          if (
            targetsMatch &&
            derippled === "finished" &&
            !inputEventDelegator.isAlreadyHandlingInput
          ) {
            if (target.href && browserHeuristics.isChromium) {
              if (target.href === location.href) return location.reload();
              open(target.href, target.id, "noreferrer");
            } else if (target.dataset.idToScrollTo) {
              const main = document.querySelector("main");
              const yPositionOfIdToScrollTo = Math.abs(
                document
                  .querySelector(target.dataset.idToScrollTo)
                  .getBoundingClientRect().top -
                  main.getBoundingClientRect().top +
                  main.scrollTop +
                  5
              );

              SmoothScroller.scroll({
                scrollContainer: document.querySelector("main"),
                y: yPositionOfIdToScrollTo,
              });
            }
          }
        },
      },
    },
    {
      selectors: ".button",
      handlers: {
        pointerMoveReleasePointerCaptureCriteriaAbortController:
          new AbortController(),
        async inputDownHandler(event) {
          const target = event.target;

          if (
            target.matches("#message-submit-button") &&
            target.dataset.validMessage === "false"
          )
            return;

          if (target.closest("main") && event.type === "pointerdown") {
            target.addEventListener(
              "momentumScrollerRoute",
              (event) => {
                const { routeTarget } = event.detail;
                if (target === routeTarget) return;
                inputEventDelegator.forceInputUpHandler(event);
              },
              {
                signal:
                  this.pointerMoveReleasePointerCaptureCriteriaAbortController
                    .signal,
              }
            );
          }

          if (event.type === "pointerdown")
            target.releasePointerCapture(event.pointerId);

          if (target.matches("#appearance-switcher-button")) {
            target.classList.add("pressed");
          }

          if (
            target.dataset.rippleAnimate === "true" &&
            (target.dataset.toggleButtonState === "off" ||
              !target.dataset.toggleButtonState)
          ) {
            if (event.type === "pointerdown") {
              inputEventDelegator.animationLibrary.ripple(target, {
                x: event.pageX,
                y: event.pageY,
              });
            } else if (event.type === "keydown") {
              if (!browserHeuristics.isChromium && target.closest("a"))
                return (inputEventDelegator.#isAlreadyHandlingInput = false);

              inputEventDelegator.animationLibrary.ripple(target);
            }
          } else if (
            target.dataset.rippleAnimate === "true" &&
            target.dataset.toggleButtonState === "on"
          ) {
            inputEventDelegator.animationLibrary.deripple(target);
          }
        },

        async inputUpHandler({ target, targetsMatch }) {
          if (
            target.matches("#message-submit-button") &&
            target.dataset.validMessage === "false"
          )
            return;

          if (target.closest("main")) {
            this.pointerMoveReleasePointerCaptureCriteriaAbortController.abort();
            this.pointerMoveReleasePointerCaptureCriteriaAbortController =
              new AbortController();
          }

          if (targetsMatch && target.matches("#appearance-switcher-button")) {
            target.classList.remove("pressed");
            return lightDarkAppearanceSwitcher.switchAppearance();
          } else if (targetsMatch && target.matches("#overflow-button")) {
            await switchOverflowMenu();
          } else if (targetsMatch && target.matches("#touch-app-button")) {
            MomentumScroller.getAllScrollers().forEach((momentumScroller) =>
              momentumScroller.toggleActivation()
            );
          } else if (targetsMatch && target.matches("#message-submit-button")) {
            const message = document.querySelector("#message-input").value;
            kittehMessages.submitMessage(message);
            document.querySelector("#message-input").value = "";
            messageValidator(document.querySelector("#message-input").value);
          } else if (
            targetsMatch &&
            target.matches("#kitteh-messages-sound-button")
          ) {
            target.dataset.userInteraction = "true";

            if (target.dataset.toggleButtonState === "on") {
              target
                .closest("#kitteh-messages-container")
                .querySelectorAll("audio, video")
                .forEach((element) => {
                  element.muted = true;
                  element.volume = 0;
                });
            } else if (target.dataset.toggleButtonState === "off") {
              target
                .closest("#kitteh-messages-container")
                .querySelectorAll("audio, video")
                .forEach((element) => {
                  element.muted = false;
                  element.volume = 0.25;
                });
            }

            target.dataset.toggleButtonState =
              target.dataset.toggleButtonState === "on" ? "off" : "on";
          } else if (
            targetsMatch &&
            target.matches("#smooth-scroller-go-button")
          ) {
            const demoContainer = target.closest(".demo-container");

            demoContainer
              .querySelectorAll("[data-label]")
              .forEach((data) => (data.textContent = "-"));

            const easing = easingSelectorObserver.incoming.dataset.easing;
            const duration = +document.querySelector(
              ".number-input[data-axis='duration']"
            ).value;
            const xValue = +document.querySelector(
              ".number-input[data-axis='x']"
            ).value;
            const yValue = +document.querySelector(
              ".number-input[data-axis='y']"
            ).value;

            const promise = SmoothScroller.scroll({
              scrollContainer: document.querySelector(
                "#smooth-scroller-demo-container"
              ),
              x: xValue,
              y: yValue,
              duration: duration,
              easing: easing,
            });

            promise.then((result) => {
              const elapsedTime = Math.round(result.elapsedTime);
              const endPointX = Math.round(result.endPoint[0]);
              const endPointY = Math.round(result.endPoint[1]);

              demoContainer.querySelector(
                "[data-label='interrupted']"
              ).textContent = result.interruptedBy ? "True" : "False";
              demoContainer.querySelector(
                "[data-label='elapsed-time']"
              ).textContent = `${elapsedTime} ms`;
              demoContainer.querySelector("[data-label='x']").textContent =
                endPointX;
              demoContainer.querySelector("[data-label='y']").textContent =
                endPointY;

              demoContainer
                .querySelectorAll("[data-label]")
                .forEach((element) =>
                  flashAnimation(
                    element,
                    [
                      ["color", "var(--text-color)", "hsl(60, 100%, 50%)"],
                      ["transform", "scale(1)", "scale(1.2)"],
                    ],
                    400,
                    "linear"
                  )
                );

              flashAnimation(
                demoContainer.querySelector(".progress-bar-content"),
                [
                  [
                    "background",
                    "linear-gradient(to right, var(--text-color) var(--progress), transparent var(--progress))",
                    "linear-gradient(to right, hsl(60, 100%, 50%) var(--progress), transparent var(--progress))",
                  ],
                ],
                400,
                "linear"
              );
            });
          } else if (
            targetsMatch &&
            target.matches("#smooth-scroller-randomize-button")
          ) {
            const demoContainer = target.closest(".demo-container");

            const maxScrollWidth = Math.floor(
              smoothScrollerDemoContentRects.width -
                smoothScrollerDemoContainerRects.width
            );
            const maxScrollHeight = Math.floor(
              smoothScrollerDemoContentRects.height -
                smoothScrollerDemoContainerRects.height
            );

            const numberOfEasingSelectorItems =
              document.querySelectorAll("#easing-selector .selector-item")
                .length - 1;
            SmoothScroller.scroll({
              scrollContainer: document.querySelector("#easing-selector"),
              y:
                60 *
                getRandomNumber({
                  min: 0,
                  max: numberOfEasingSelectorItems,
                  randomIntegersOnly: true,
                }),
              duration: 0,
            });

            demoContainer.querySelector("[data-axis='duration']").value =
              getRandomNumber({
                min: 0,
                max: 10000,
                randomIntegersOnly: true,
              });
            demoContainer.querySelector("[data-axis='x']").value =
              getRandomNumber({
                min: 0,
                max: maxScrollWidth,
                randomIntegersOnly: true,
              });
            demoContainer.querySelector("[data-axis='y']").value =
              getRandomNumber({
                min: 0,
                max: maxScrollHeight,
                randomIntegersOnly: true,
              });

            demoContainer
              .querySelectorAll(".number-input, #easing-selector")
              .forEach((element) =>
                flashAnimation(
                  element,
                  [["color", "var(--text-color)", "hsl(60, 100%, 50%)"]],
                  400,
                  "linear"
                )
              );
          }

          if (target.matches("#appearance-switcher-button") && !targetsMatch) {
            target.classList.remove("pressed");
          }

          let derippled;
          if (
            !targetsMatch &&
            target.dataset.rippleAnimate === "true" &&
            target.dataset.toggleButtonState === "off"
          ) {
            inputEventDelegator.animationLibrary.deripple(target);
          } else if (
            !targetsMatch &&
            target.dataset.rippleAnimate === "true" &&
            target.dataset.toggleButtonState === "on"
          ) {
            inputEventDelegator.animationLibrary.ripple(target);
          } else if (
            target.dataset.rippleAnimate === "true" &&
            !target.dataset.toggleButtonState
          ) {
            derippled = await inputEventDelegator.animationLibrary.deripple(
              target
            );
          }

          if (
            browserHeuristics.isChromium &&
            target.href &&
            targetsMatch &&
            derippled === "finished" &&
            !inputEventDelegator.isAlreadyHandlingInput
          ) {
            open(target.href, target.id, "noreferrer");
          }
        },
      },
    },
    {
      selectors: "#logo",
      handlers: {
        inputDownHandler(event) {
          if (event.type === "pointerdown")
            event.target.releasePointerCapture(event.pointerId);

          kittehBlinkAnimation.pointerIsDown = true;

          kittehAppointerAndThemer.appointedKittehElement
            .querySelectorAll(".eyelid-down")
            .forEach((element) => {
              element.beginElement();
            });
        },

        previousMessageIsDone: true,
        async inputUpHandler({ targetsMatch }) {
          kittehBlinkAnimation.pointerIsDown = false;

          kittehAppointerAndThemer.appointedKittehElement
            .querySelectorAll(".eyelid-up")
            .forEach((element) => {
              element.beginElement();
            });

          if (!targetsMatch || !this.previousMessageIsDone) return;

          this.previousMessageIsDone = false;
          this.previousMessageIsDonePromise = await Promise.allSettled(
            kittehMessageLibrary.submitMessagesToKittehMessages()
          );
          this.previousMessageIsDone = true;
        },
      },
    },
    {
      selectors: ".video-progress-bar-container",
      handlers: {
        inputDownHandler(event) {
          event.target.style.setProperty("filter", "invert(0.25)");
          if (event.type === "pointerdown")
            event.target.releasePointerCapture(event.pointerId);
        },

        async inputUpHandler({ target, targetsMatch }) {
          target.style.removeProperty("filter");

          if (!targetsMatch) return;

          const closestMediaElement = target.closest(".media-container");
          const progressBarIndex = Array.from(
            closestMediaElement.querySelector(".video-progress-bars-container")
              .children
          ).findIndex(
            (progressBarContainer) => progressBarContainer === target
          );

          const correspondingVideo =
            closestMediaElement.querySelectorAll("video")[progressBarIndex];

          try {
            await correspondingVideo.play();
          } catch (error) {
            console.log(error);
          }

          SmoothScroller.scroll({
            scrollContainer: correspondingVideo.closest(".video-gallery"),
            x: correspondingVideo.offsetLeft,
          });
        },
      },
    },
  ];
}
const inputEventDelegator = new InputEventDelegator();

if (browserHeuristics.isChromium)
  document.addEventListener("click", (event) => {
    if (event.pointerId === -1 && event.pointerType === "") return;
    event.preventDefault();
  });

function createTouchAppButton(toggleButtonState) {
  const button = document.createElement("div");
  button.setAttribute("aria-label", "Touch App Toggle");
  button.setAttribute("class", "button");
  button.setAttribute("data-ripple-animate", "true");
  button.setAttribute("data-toggle-button-state", toggleButtonState);
  button.setAttribute("id", "touch-app-button");
  button.setAttribute("role", "button");
  button.setAttribute("tabindex", "-1");

  const buttonIcon = document.createElement("div");
  buttonIcon.setAttribute("class", "button-icon");
  buttonIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="var(--text-color)"><g><rect fill="none" /></g><g><g><path d="M18.19,12.44l-3.24-1.62c1.29-1,2.12-2.56,2.12-4.32c0-3.03-2.47-5.5-5.5-5.5s-5.5,2.47-5.5,5.5c0,2.13,1.22,3.98,3,4.89 v3.26c-2.15-0.46-2.02-0.44-2.26-0.44c-0.53,0-1.03,0.21-1.41,0.59L4,16.22l5.09,5.09C9.52,21.75,10.12,22,10.74,22h6.3 c0.98,0,1.81-0.7,1.97-1.67l0.8-4.71C20.03,14.32,19.38,13.04,18.19,12.44z M17.84,15.29L17.04,20h-6.3 c-0.09,0-0.17-0.04-0.24-0.1l-3.68-3.68l4.25,0.89V6.5c0-0.28,0.22-0.5,0.5-0.5c0.28,0,0.5,0.22,0.5,0.5v6h1.76l3.46,1.73 C17.69,14.43,17.91,14.86,17.84,15.29z M8.07,6.5c0-1.93,1.57-3.5,3.5-3.5s3.5,1.57,3.5,3.5c0,0.95-0.38,1.81-1,2.44V6.5 c0-1.38-1.12-2.5-2.5-2.5c-1.38,0-2.5,1.12-2.5,2.5v2.44C8.45,8.31,8.07,7.45,8.07,6.5z"/></g></g></svg>`;

  const rippleContainer = document.createElement("div");
  rippleContainer.setAttribute("class", "ripple-container");

  const ripple = document.createElement("div");
  ripple.setAttribute("class", "ripple");

  button.insertAdjacentElement("beforeend", buttonIcon);
  button.insertAdjacentElement("beforeend", rippleContainer);
  rippleContainer.insertAdjacentElement("beforeend", ripple);

  document
    .querySelector("#download-resume-button")
    .insertAdjacentElement("afterend", button);
}

const createMomentumScrollers = ({ activateImmediately = false } = {}) => {
  MomentumScroller.autoCreateScrollers({ activateImmediately })
    .setSelectorsOfElementsScrollerShouldIgnore(["header", ".selector"])
    .setSelectorsOfClickableElements([".button", ".link-container"])
    .setSelectorsOfOtherTouchScrollers([".video-gallery"])
    .getAllScrollers()
    .forEach((scroller) =>
      scroller
        .setGrabCursor("var(--kitteh-grab-cursor)")
        .setGrabbingCursor("var(--kitteh-grabbing-cursor)")
    );
};

const momentumScrollerPreference = localStorage.getItem(
  "momentumScrollerPreference"
);

if (
  !deviceHeuristics.isTouchScreen &&
  (!momentumScrollerPreference || momentumScrollerPreference === "on")
) {
  createTouchAppButton("on");
  inputEventDelegator.animationLibrary.ripple(
    document.querySelector("#touch-app-button"),
    { duration: 0 }
  );
  createMomentumScrollers({ activateImmediately: true });
} else if (
  !deviceHeuristics.isTouchScreen &&
  momentumScrollerPreference === "off"
) {
  createTouchAppButton("off");
  createMomentumScrollers();
}

const momentumScrollerDemoContainer = document.querySelector(
  "#momentum-scroller-demo-container"
);
momentumScrollerDemoContainer.addEventListener("pointerdown", () => {
  enableOrDisableDemoMomentumScrollerSelectors("disable");
  const dataLabels = momentumScrollerDemoContainer
    .closest(".demo-container")
    .querySelectorAll("[data-label]");
  dataLabels.forEach((dataLabel) => (dataLabel.textContent = "-"));
});

momentumScrollerDemoContainer.addEventListener("pointerup", () => {
  enableOrDisableDemoMomentumScrollerSelectors("enable");
  const dataLabels = momentumScrollerDemoContainer
    .closest(".demo-container")
    .querySelectorAll("[data-label]");
  dataLabels.forEach((dataLabel) => (dataLabel.textContent = "-"));
});

document.addEventListener("smoothScrollerScroll", (event) => {
  if (
    event.detail.scrollContainer ==
    document.querySelector("#smooth-scroller-demo-container")
  ) {
    const progress = `${
      (event.detail.elapsedTime / event.detail.duration) * 100
    }%`;
    document
      .querySelector("#smooth-scroller-demo-progress-bar")
      .style.setProperty("--progress", progress);
  }
});

const smoothScrollerDemoContainerRects = document
  .querySelector("#smooth-scroller-demo-container")
  .getBoundingClientRect();

const smoothScrollerDemoContentRects = document
  .querySelector("#smooth-scroller-demo-content")
  .getBoundingClientRect();

SmoothScroller.scroll({
  scrollContainer: document.querySelector("#smooth-scroller-demo-container"),
  x:
    smoothScrollerDemoContentRects.width / 2 -
    smoothScrollerDemoContainerRects.width / 2 -
    (browserHeuristics.isIOsSafari
      ? (smoothScrollerDemoContainerRects.width - 320) / 2
      : 0),
  y:
    smoothScrollerDemoContentRects.height / 2 -
    smoothScrollerDemoContainerRects.height / 2,
  duration: 0,
});

function enableOrDisableDemoMomentumScrollerSelectors(request) {
  const selectors = document.querySelectorAll(
    "#demo-container-for-momentum-scroller .selector"
  );

  selectors.forEach((selector) => {
    request === "enable"
      ? (selector.dataset.disabledSelector = "false")
      : (selector.dataset.disabledSelector = "true");
    request === "enable"
      ? selector.setAttribute("tabindex", "0")
      : selector.setAttribute("tabindex", "-1");
    if (request === "disable") selector.blur();
  });
}

demoMomentumScrollerInitializer();
function demoMomentumScrollerInitializer() {
  const scrollContainer = document.querySelector(
    "#momentum-scroller-demo-container"
  );
  const scrollContainerRects = scrollContainer.getBoundingClientRect();

  const scrollContentRects = document
    .querySelector("#momentum-scroller-demo-content")
    .getBoundingClientRect();

  scrollContainer.scrollTo({
    left:
      scrollContentRects.width / 2 -
      scrollContainerRects.width / 2 -
      (browserHeuristics.isIOsSafari
        ? (scrollContainerRects.width - 320) / 2
        : 0),
    top: scrollContentRects.height / 2 - scrollContainerRects.height / 2,
  });

  SmoothScroller.scroll({
    scrollContainer: document.querySelector("#scroller-type-selector"),
    y: document.querySelector(
      "#scroller-type-selector .selector-item[data-scroller-type='horizontal-and-vertical']"
    ).offsetTop,
    duration: 0,
  });

  SmoothScroller.scroll({
    scrollContainer: document.querySelector("#deceleration-selector"),
    y: document.querySelector(
      "#deceleration-selector .selector-item[data-deceleration='medium']"
    ).offsetTop,
    duration: 0,
  });

  SmoothScroller.scroll({
    scrollContainer: document.querySelector("#bounciness-selector"),
    y: document.querySelector(
      "#bounciness-selector .selector-item[data-bounciness='medium']"
    ).offsetTop,
    duration: 0,
  });
}

function convertHyphenCaseToCamelCase(hyphenCase) {
  const hyphenPattern = /\-\w/;
  const hyphenMatch = hyphenCase.match(hyphenPattern);

  if (hyphenMatch) {
    return hyphenCase
      .replace(/[a-z]/, (match) => match.toUpperCase())
      .replaceAll(/\-\w/g, (match) => match.toUpperCase())
      .replaceAll(/\-/g, "");
  } else if (!hyphenMatch) {
    return hyphenCase.replace(/[a-z]/, (match) => match.toUpperCase());
  }
}

async function switchOverflowMenu() {
  const header = document.querySelector("header");
  const overflowButton = document.querySelector("#overflow-button");
  const overflowMenuButtons = document.querySelectorAll(
    "#overflow-menu .button"
  );
  const kittehMessagesDemoAlert = document.querySelector(
    "#demo-container-for-kitteh-messages .demo-container-alert"
  );

  const overflowMenuIsOpen =
    overflowButton.dataset.toggleButtonState === "on" ? true : false;
  overflowMenuIsOpen ? closeTheMenu() : openTheMenu();

  function closeTheMenu() {
    kittehMessages.unpauseTyping();
    kittehMessages.unhideMessageContainer();
    header.style.setProperty("height", `${(750 / 17) * 4}px`);
    overflowButton.dataset.toggleButtonState = "off";
    overflowMenuButtons.forEach((button) => {
      button.setAttribute("tabindex", "-1");
      button.blur();
    });
    kittehMessagesDemoAlert.dataset.activeAlert = "false";
  }

  function openTheMenu() {
    kittehMessages.pauseTyping();
    kittehMessages.hideMessageContainer();
    header.style.setProperty("height", `${(750 / 17) * 7}px`);
    overflowButton.dataset.toggleButtonState = "on";
    overflowMenuButtons.forEach((button) =>
      button.setAttribute("tabindex", "0")
    );
    kittehMessagesDemoAlert.dataset.activeAlert = "true";
  }
}

const dateRangeContainers = document.querySelectorAll(".date-range-container");
dateRangeContainers.forEach((dateRangeContainer) => {
  const startDateElement = dateRangeContainer.querySelector(".start-date");
  const statusElement = dateRangeContainer.querySelector(".status");
  const endDateElement = dateRangeContainer.querySelector(".end-date");

  const startDateYear = +startDateElement.dataset.year;
  validateArgument("start-date data-year", startDateYear, {
    allowedMax: today.year,
    allowIntegerNumbersOnly: true,
  });

  const startDateMonth = +startDateElement.dataset.month - 1;
  validateArgument("start-date data-month", startDateMonth, {
    allowedMin: 0,
    allowedMax: 11,
    allowIntegerNumbersOnly: true,
  });

  const startDateDay =
    startDateElement.dataset.day === "last"
      ? DateTools.getNumberOfDaysInTheMonth(
          new Date(startDateYear, startDateMonth)
        )
      : +startDateElement.dataset.day;
  validateArgument("start-date data-day", startDateDay, {
    allowedMin: 1,
    allowedMax: DateTools.getNumberOfDaysInTheMonth(
      new Date(startDateYear, startDateMonth)
    ),
    allowIntegerNumbersOnly: true,
  });

  const startDate = new Date(startDateYear, startDateMonth, startDateDay);
  startDateElement.textContent = DateTools.getDateInISOFormat(startDate);

  let endDate =
    endDateElement.dataset.date === "current"
      ? new Date(today.year, today.month - 1, today.day)
      : endDateElement.dataset.date === "indefinite"
      ? Infinity
      : null;
  if (!endDate) {
    const endDateYear =
      endDateElement.dataset.year === "current" ||
      endDateElement.dataset.year === "indefinite"
        ? today.year
        : +endDateElement.dataset.year;
    validateArgument("end-date data-year", endDateYear, {
      allowedMin: startDateYear,
      allowIntegerNumbersOnly: true,
    });

    const endDateMonth =
      endDateElement.dataset.month === "current" ||
      endDateElement.dataset.month === "indefinite"
        ? today.month - 1
        : +endDateElement.dataset.month - 1;
    validateArgument("end-date data-month", endDateMonth, {
      allowedMin: 0,
      allowedMax: 11,
      allowIntegerNumbersOnly: true,
    });

    const endDateDay =
      endDateElement.dataset.day === "current" ||
      endDateElement.dataset.day === "indefinite"
        ? today.day
        : endDateElement.dataset.day === "last"
        ? DateTools.getNumberOfDaysInTheMonth(
            new Date(endDateYear, endDateMonth)
          )
        : +endDateElement.dataset.day;
    validateArgument("end-date data-da`", endDateDay, {
      allowedMin: 1,
      allowedMax: DateTools.getNumberOfDaysInTheMonth(
        new Date(endDateYear, endDateMonth)
      ),
      allowIntegerNumbersOnly: true,
    });

    endDate = new Date(endDateYear, endDateMonth, endDateDay);
  }

  endDateElement.textContent =
    endDateElement.dataset.date === "current"
      ? "Current"
      : endDateElement.dataset.date === "indefinite"
      ? "Indefinite"
      : DateTools.getDateInISOFormat(endDate);

  const statusType = statusElement.dataset.statusType;
  const statusYes =
    statusElement.dataset.statusYes === "get-duration"
      ? getDuration()
      : statusElement.dataset.statusYes;
  const statusNo =
    statusElement.dataset.statusNo === "get-duration"
      ? getDuration()
      : statusElement.dataset.statusNo;

  if (statusType === "has-completed") {
    statusElement.textContent = endDate ? statusYes : statusNo;
  } else if (statusType === "has-expired") {
    statusElement.textContent =
      new Date(today.year, today.month - 1, today.day) > endDate
        ? statusYes
        : statusNo;
  }

  function getDuration() {
    const { breakpointQuantity, breakpointUnit } = DateTools.getBreakpointTime(
      endDate - startDate,
      "millisecond"
    );
    const roundedBreakpointQuantity = Math.round(breakpointQuantity);
    const grammaticalTimeUnit = DateTools.getGrammaticalTimeUnit(
      roundedBreakpointQuantity,
      breakpointUnit
    );
    return `${roundedBreakpointQuantity} ${grammaticalTimeUnit}`;
  }
});

function updateCopyrightYear() {
  document.querySelector("#copyright-year").textContent = today.year;
}
updateCopyrightYear();

class TypeAndTalk {
  #messageContainer;
  #messageSoundButton;
  #messageText;
  #pointerIsDown;

  constructor(messageContainer, messageSoundButton, messageText) {
    this.#messageContainer = messageContainer;
    this.#messageSoundButton = messageSoundButton;
    this.#messageText = messageText;
    this.#messageContainer.addEventListener("pointerdown", (event) => {
      if (event.target === this.#messageSoundButton) return;
      const inputIsAnAcceptableInput = isPrimaryInput(event);
      if (!inputIsAnAcceptableInput) return;
      this.#messageContainer.setPointerCapture(event.pointerId);
      this.#pointerIsDown = true;
      this.#messageContainer
        .querySelectorAll("audio, video")
        .forEach((element) => (element.playbackRate = 1 / 0.5));
    });
    this.#messageContainer.addEventListener("pointerup", () => {
      this.#pointerIsDown = false;
      this.#messageContainer
        .querySelectorAll("audio, video")
        .forEach((element) => (element.playbackRate = 1));
    });
    this.#messageContainer.addEventListener("pointercancel", () => {
      this.#pointerIsDown = false;
      this.#messageContainer
        .querySelectorAll("audio, video")
        .forEach((element) => (element.playbackRate = 1));
    });
  }

  #messageQueue = [];
  #messageLog = [];

  get messageContainerIsClear() {
    return (
      this.#messageText.textContent === "" &&
      (this.#messageContainer.style.getPropertyValue("opacity") === "0" ||
        getComputedStyle(this.#messageContainer).opacity === "0")
    );
  }
  get thereAreUntypedMessages() {
    return this.#messageLog.some((message) => message.status === "untyped");
  }

  submitMessage(
    message,
    {
      audioSource = "",
      delayStart = 0,
      delayEnd = 0,
      delayBetweenChars = 80,
    } = {}
  ) {
    validateArgument("message", message, {
      allowedTypes: ["string"],
    });
    validateArgument("audioSource", audioSource, {
      allowedTypes: ["string"],
    });
    validateArgument("delayStart", delayStart, {
      allowedTypes: ["number"],
    });
    validateArgument("delayEnd", delayEnd, {
      allowedTypes: ["number"],
    });
    validateArgument("delayBetweenChars", delayBetweenChars, {
      allowedTypes: ["number"],
    });

    const messageIsBlank =
      message
        .replaceAll(/{.*?}/g, "")
        .replaceAll(/\s/g, "")
        .replaceAll(/[{}]/g, "") === "";
    if (messageIsBlank) return;

    delayStart = delayStart < 0 ? 0 : delayStart > 5000 ? 5000 : delayStart;
    delayEnd = delayEnd < 0 ? 0 : delayEnd > 5000 ? 5000 : delayEnd;
    delayBetweenChars =
      delayBetweenChars < 0
        ? 0
        : delayBetweenChars > 120
        ? 120
        : delayBetweenChars;

    const messagePackage = {
      message,
      audioSource,
      delayStart,
      delayEnd,
      delayBetweenChars,
      dateSubmitted: new Date(),
      id: this.generator.next().value,
      status: "untyped",
      createPromise() {
        this.finishedTyping = new Promise((resolve) => {
          const recheckInterval = setInterval(() => {
            if (this.status === "typed") {
              clearInterval(recheckInterval);
              resolve(true);
            }
          });
        });
      },
    };
    messagePackage.createPromise();

    this.logMessagePackage(messagePackage);
    this.enqueueMessagePackage(messagePackage);
    this.startProcessingMessageQueueIfNecessary();
    return messagePackage.finishedTyping;
  }

  *idGenerator() {
    let id = 0;
    while (true) {
      yield id++;
    }
  }

  generator = this.idGenerator();

  logMessagePackage(messagePackage) {
    this.#messageLog.push(messagePackage);
  }

  enqueueMessagePackage(messagePackage) {
    this.#messageQueue.push(messagePackage);
  }

  startProcessingMessageQueueIfNecessary() {
    const typingCount = this.#messageLog.filter(
      (message) =>
        message.status === "typing" || message.status === "typing (paused)"
    ).length;
    if (typingCount === 0) this.processMessageQueue();
  }

  #autoClearTimer = {
    id: null,
    remainingTime: 5000,
    startTime: null,
    reset() {
      this.id = null;
      this.remainingTime = 5000;
    },
  };

  #currentMessagePackage;

  async processMessageQueue(messagePackage = this.dequeueMessagePackage()) {
    this.#currentMessagePackage = messagePackage;
    this.#currentMessagePackage.status = "typing";
    clearTimeout(this.#autoClearTimer.id);
    const { message, audioSource, delayStart, delayEnd, delayBetweenChars } =
      messagePackage;
    const messageCharacters = Array.from([...message]);
    const audio = this.getAudio(audioSource);
    await this.clearMessageContainer();
    if (delayStart) await awaitTimeout({ milliseconds: delayStart });
    await this.typeAndPlayMessage(messageCharacters, audio, delayBetweenChars);
    this.#currentMessagePackage.status = "typed";
    this.#currentMessagePackage = null;
    if (delayEnd) await awaitTimeout({ milliseconds: delayEnd });
    if (this.thereAreUntypedMessages) return this.processMessageQueue();
    this.#autoClearTimer.startTime = Date.now();
    this.#autoClearTimer.id = setTimeout(() => {
      this.clearMessageContainer();
    }, this.#autoClearTimer.remainingTime);
  }

  getAudio(audioSource) {
    if (!audioSource) return;

    const existingMediaElement = this.#messageContainer.querySelector(
      `audio[src="${audioSource}"], video[src="${audioSource}"]`
    );

    if (existingMediaElement) return existingMediaElement;

    const mediaElement =
      this.#messageSoundButton.dataset.userInteraction === "false"
        ? document.createElement("video")
        : document.createElement("audio"); // Muted autoplay works with video, but not with audio
    mediaElement.setAttribute("src", audioSource);
    mediaElement.volume =
      this.#messageSoundButton.dataset.toggleButtonState === "on" ? 0.25 : 0;
    mediaElement.muted =
      this.#messageSoundButton.dataset.toggleButtonState === "on"
        ? false
        : true;
    if (this.#messageSoundButton.dataset.userInteraction === "false") {
      mediaElement.muted = true;
      mediaElement.autoplay = true;
    }
    mediaElement.style.setProperty("display", "none");
    this.#messageContainer.append(mediaElement);

    return mediaElement;
  }

  dequeueMessagePackage() {
    return this.#messageQueue.shift();
  }

  #requestToPauseTyping = false;

  get soundButtonIsActive() {
    return this.#messageSoundButton.dataset.toggleButtonState === "on";
  }

  async typeAndPlayMessage(
    messageCharacters,
    audio,
    delayBetweenChars,
    beginningOfMessage = true,
    resolve
  ) {
    if (beginningOfMessage) {
      if (audio) {
        this.#messageSoundButton.style.removeProperty("display");
        this.#messageSoundButton.style.removeProperty("pointer-events");
        this.#messageText.style.removeProperty("padding-left");
        try {
          await audio.play();
        } catch (error) {
          console.log(error);
          audio = null;
          this.#messageSoundButton.style.setProperty("display", "none");
          this.#messageSoundButton.style.setProperty("pointer-events", "none");
          this.#messageText.style.setProperty(
            "padding-left",
            "calc(750px / 34 * 0.5 * 3)"
          );
        }
      } else if (!audio) {
        this.#messageSoundButton.style.setProperty("display", "none");
        this.#messageSoundButton.style.setProperty("pointer-events", "none");
        this.#messageText.style.setProperty(
          "padding-left",
          "calc(750px / 34 * 0.5 * 3)"
        );
      }
      return new Promise((resolve) => {
        this.typeAndPlayMessage(
          messageCharacters,
          audio,
          delayBetweenChars,
          false,
          resolve
        );
      });
    }

    if (messageCharacters.length === 0 && !audio) {
      return resolve();
    } else if (messageCharacters.length === 0 && audio) {
      if (audio.ended) {
        return resolve();
      } else if (!audio.ended) {
        await new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            if (audio.ended) {
              clearInterval(checkInterval);
              resolve();
            }
          });
        });
        return resolve();
      }
    }

    if (this.#requestToPauseTyping) {
      if (audio) audio.pause();
      await new Promise((resolve) => {
        const recheckInterval = setInterval(() => {
          if (!this.#requestToPauseTyping) {
            clearInterval(recheckInterval);
            resolve();
          }
        });
      });
      if (audio) await audio.play();
    }

    const character = messageCharacters.shift();

    const delayBeforeCharacter = (() => {
      const pointerDownDelayFactor = 0.5;

      const delayDictionary = [
        {
          pattern: /[.?!;—]/,
          delay: 1000,
        },
        {
          pattern: /[,]/,
          delay: 250,
        },
      ];

      const punctuation = delayDictionary.find(({ pattern }) =>
        character.match(pattern)
      );

      if (character === "{") {
        return this.#pointerIsDown
          ? intrastringCommandProcessor() * pointerDownDelayFactor
          : intrastringCommandProcessor();
      } else if (punctuation) {
        if (messageCharacters[0] === "{") {
          return this.#pointerIsDown
            ? intrastringCommandProcessor(punctuation.delay, 1) *
                pointerDownDelayFactor
            : intrastringCommandProcessor(punctuation.delay, 1);
        } else if (messageCharacters[0] !== "{") {
          return this.#pointerIsDown
            ? punctuation.delay * pointerDownDelayFactor
            : punctuation.delay;
        }
      } else {
        return this.#pointerIsDown
          ? delayBetweenChars * pointerDownDelayFactor
          : delayBetweenChars;
      }

      function intrastringCommandProcessor(
        customDelay = delayBetweenChars,
        startingIndexOfCommand = 0
      ) {
        const indexOfClosingBracket = messageCharacters.indexOf("}");
        if (indexOfClosingBracket === -1) {
          return customDelay;
        } else if (indexOfClosingBracket !== -1) {
          const command = messageCharacters
            .splice(
              startingIndexOfCommand,
              indexOfClosingBracket - startingIndexOfCommand
            )
            .join("");

          const parsedInteger = +command;

          const commandIsAnInteger = !Number.isNaN(parsedInteger);

          if (commandIsAnInteger) {
            const delay =
              parsedInteger < 0
                ? 0
                : parsedInteger > 5000
                ? 5000
                : parsedInteger;
            return delay;
          } else if (!commandIsAnInteger) {
            if (command.toLowerCase() === "blink") {
              kittehBlinkAnimation.blink();
            } else if (command.toLowerCase() === "longblink") {
              kittehBlinkAnimation.blink("long");
            } else if (command.toLowerCase() === "charm") {
              kittehAppointerAndThemer.appointKitteh({
                kitteh: "charm",
              });
            } else if (command.toLowerCase() === "shelby") {
              kittehAppointerAndThemer.appointKitteh({
                kitteh: "shelby",
              });
            }
            return customDelay;
          }
        }
      }
    })();

    if (!(character === "{" || character === "}"))
      this.#messageText.textContent += character;

    if (this.#messageText.textContent.length === 1)
      await this.unhideMessageContainer();

    setTimeout(() => {
      this.typeAndPlayMessage(
        messageCharacters,
        audio,
        delayBetweenChars,
        false,
        resolve
      );
    }, delayBeforeCharacter);
  }

  pauseTyping() {
    this.#requestToPauseTyping = true;
    if (this.#currentMessagePackage)
      this.#currentMessagePackage.status = "typing (paused)";
  }

  unpauseTyping() {
    this.#requestToPauseTyping = false;
    if (this.#currentMessagePackage)
      this.#currentMessagePackage.status = "typing";
  }

  #currentlyClearing;
  async hideMessageContainer({ clearing = false } = {}) {
    if (this.#currentlyClearing || this.messageContainerIsClear) return;

    if (clearing) this.#currentlyClearing = true;
    const hidingMessageContainerStatus = await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (
          getComputedStyle(this.#messageContainer).opacity === "0" &&
          this.#messageContainer.style.getPropertyValue("opacity") === "0"
        ) {
          clearInterval(checkInterval);
          resolve("finished");
        } else if (
          getComputedStyle(this.#messageContainer).opacity === "1" &&
          this.#messageContainer.style.getPropertyValue("opacity") === "1"
        ) {
          clearInterval(checkInterval);
          resolve("canceled");
        }
      });

      this.#messageContainer.style.setProperty("opacity", "0");
      this.#messageContainer.style.setProperty("pointer-events", "none");
      this.#messageSoundButton.setAttribute("tabindex", "-1");
      this.#messageSoundButton.blur();
    });
    this.updateAutoClearTimerIfNecessary();
    this.#currentlyClearing = false;
    return hidingMessageContainerStatus;
  }

  async clearMessageContainer() {
    if (this.messageContainerIsClear) return;
    const hidingMessageContainerStatus = await this.hideMessageContainer({
      clearing: true,
    });

    if (hidingMessageContainerStatus === "canceled") return;

    this.#autoClearTimer.reset();
    this.#messageText.textContent = "";
  }

  updateAutoClearTimerIfNecessary() {
    if (this.#autoClearTimer.id) {
      clearTimeout(this.#autoClearTimer.id);
      const pauseTime = Date.now();
      const remainingTime = Math.max(
        this.#autoClearTimer.remainingTime -
          (pauseTime - this.#autoClearTimer.startTime),
        0
      );
      this.#autoClearTimer.remainingTime = remainingTime;
    }
  }

  async unhideMessageContainer() {
    if (this.#currentlyClearing) return;
    if (this.#messageText.textContent.length > 0) {
      this.#messageContainer.style.setProperty("opacity", "1");
      this.#messageContainer.style.setProperty("pointer-events", "auto");
      this.#messageSoundButton.setAttribute("tabindex", "0");
    }

    if (this.#autoClearTimer.id) {
      clearTimeout(this.#autoClearTimer.id);
      const unpauseTime = Date.now();
      this.#autoClearTimer.startTime = unpauseTime;
      this.#autoClearTimer.id = setTimeout(() => {
        this.clearMessageContainer();
        this.#autoClearTimer.reset();
      }, this.#autoClearTimer.remainingTime);
    }
  }
}
const kittehMessages = new TypeAndTalk(
  document.querySelector("#kitteh-messages-container"),
  document.querySelector("#kitteh-messages-sound-button"),
  document.querySelector("#kitteh-messages-text")
);

document.querySelector("#message-input").addEventListener("input", (event) => {
  messageValidator(event.target.value);
});

function messageValidator(message) {
  const messageInput = document.querySelector("#message-input");
  const submitButton = document.querySelector("#message-submit-button");
  const messageIsBlank =
    message
      .replaceAll(/{.*?}/g, "")
      .replaceAll(/\s/g, "")
      .replaceAll(/[{}]/g, "") === "";

  if (messageIsBlank) {
    messageInput.dataset.validMessage = "false";
    submitButton.dataset.validMessage = "false";
    submitButton.setAttribute("tabindex", "-1");
    submitButton.blur();
    return "invalid";
  } else if (!messageIsBlank) {
    messageInput.dataset.validMessage = "true";
    submitButton.dataset.validMessage = "true";
    submitButton.setAttribute("tabindex", "0");
    return "valid";
  }
}

const charmCursorDemo = {
  container: document.querySelector("#charm-cursor"),
  currentCursor: "grab",
  loopTimeoutId: null,
  requestToLoop: null,

  play({ loop = false } = {}) {
    if (loop) this.requestToLoop = true;
    const nextCursor = this.currentCursor === "grab" ? "grabbing" : "grab";

    const nextCursorUri =
      this.currentCursor === "grab"
        ? getCursorDataUri("grabbing", "hsl(0, 0%, 20%)")
        : getCursorDataUri("grab", "hsl(0, 0%, 20%)");

    this.container.style.setProperty(
      "background",
      `url(${nextCursorUri}) no-repeat center/50% hsl(0, 0%, 85%)`
    );

    this.currentCursor = nextCursor;

    if (this.requestToLoop) {
      this.loopTimeoutId = setTimeout(() => {
        this.play();
      }, 1000);
    }
  },

  stop() {
    clearInterval(this.loopTimeoutId);
    this.requestToLoop = false;
  },
};
charmCursorDemo.play({ loop: false });
outsideMainViewport.observe(charmCursorDemo.container);
insideMainViewport.observe(charmCursorDemo.container);

document.querySelectorAll(".number-input").forEach((input) => {
  let oldValue = +input.value;

  const min = 0;
  const max =
    input.dataset.axis === "x"
      ? Math.floor(
          smoothScrollerDemoContentRects.width -
            smoothScrollerDemoContainerRects.width
        )
      : input.dataset.axis === "y"
      ? Math.floor(
          smoothScrollerDemoContentRects.height -
            smoothScrollerDemoContainerRects.height
        )
      : 10000;

  function getNewValue(replacement, selectionStart, selectionEnd) {
    const firstPartOfNewValue = input.value.slice(0, selectionStart);
    const lastPartOfNewValue = input.value.slice(selectionEnd);
    const newValue = firstPartOfNewValue + replacement + lastPartOfNewValue;
    return newValue;
  }

  function playInvalidFlashAnimation() {
    flashAnimation(input, [
      [
        "backgroundColor",
        lightDarkAppearanceSwitcher.currentAppearance === "dark"
          ? "hsl(0, 0%, 30%)"
          : "hsl(0, 0%, 90%)",
        lightDarkAppearanceSwitcher.currentAppearance === "dark"
          ? "hsl(0, 15%, 30%)"
          : "hsl(0, 45%, 90%)",
      ],
      ["transform", "scale(1)", "scale(1.2)"],
    ]);
  }

  function getValidValue(value) {
    if (Number.isNaN(+value) || value === "")
      return {
        valid: false,
        validatedValue: +oldValue,
      };
    if (+value < +min)
      return {
        valid: false,
        validatedValue: +min,
      };
    if (+value > +max)
      return {
        valid: false,
        validatedValue: +max,
      };
    return {
      valid: true,
      validatedValue: +value,
    };
  }

  input.addEventListener("focusin", () => {
    input.select();
  });

  input.addEventListener("focusout", () => {
    const validationResult = getValidValue(input.value);
    if (!validationResult.valid) playInvalidFlashAnimation();
    input.value = validationResult.validatedValue;
    oldValue = validationResult.validatedValue;
  });

  input.addEventListener("drop", (event) => {
    event.preventDefault();
  });

  input.addEventListener("paste", (event) => {
    event.preventDefault();
    const selectionStart = input.selectionStart;
    const selectionEnd = input.selectionEnd;
    const insertion = event.clipboardData.getData("text");
    const newValue = getNewValue(insertion, selectionStart, selectionEnd);
    const validationResult = getValidValue(newValue);
    if (!validationResult.valid) playInvalidFlashAnimation();
    input.value = validationResult.validatedValue;
    oldValue = validationResult.validatedValue;
    input.focus();
    input.selectionStart =
      input.value.length === max.toString().length
        ? input.value.length
        : selectionStart + 1;
    input.selectionEnd =
      input.value.length === max.toString().length
        ? input.value.length
        : selectionStart + 1;
  });

  input.addEventListener("keydown", async (event) => {
    if (event.key === "Enter") return event.preventDefault();
    if (event.ctrlKey && /v|c|a|x/.test(event.key)) return;
    if (event.ctrlKey && /z/.test(event.key)) return event.preventDefault();
    if (
      !input.value.length &&
      (event.key === "Backspace" || event.key === "Delete")
    )
      return playInvalidFlashAnimation();
    if (event.key.length !== 1) return;
    if (!/[0-9]/.test(event.key)) {
      event.preventDefault();
      return playInvalidFlashAnimation();
    }
    event.preventDefault();
    const selectionStart = input.selectionStart;
    const selectionEnd = input.selectionEnd;
    const insertion = event.key;
    const newValue = getNewValue(insertion, selectionStart, selectionEnd);
    const validationResult = getValidValue(newValue);
    if (!validationResult.valid) playInvalidFlashAnimation();
    input.value = validationResult.validatedValue;
    oldValue = validationResult.validatedValue;
    input.focus();
    input.selectionStart =
      input.value.length === max.toString().length
        ? input.value.length
        : selectionStart + 1;
    input.selectionEnd =
      input.value.length === max.toString().length
        ? input.value.length
        : selectionStart + 1;
  });
});

document.addEventListener("keydown", (event) => {
  const key = event.key;
  const keyIsRepeating = event.repeat;
  const target = event.target;
  const main = document.querySelector("main");
  const currentScrollTop = main.scrollTop;
  const pageHeight = document
    .querySelector("main")
    .getBoundingClientRect().height;

  if (key === "Enter" && target.matches("#message-input")) {
    event.preventDefault();
    if (
      document.querySelector("#message-submit-button").dataset.validMessage ==
        "true" &&
      !keyIsRepeating
    ) {
      const message = document.querySelector("#message-input").value;
      kittehMessages.submitMessage(message);
      document.querySelector("#message-input").value = "";
      return messageValidator(document.querySelector("#message-input").value);
    }
  } else if (key === " " && !target.matches("textarea")) {
    return event.preventDefault();
  } else if (keyIsRepeating) {
    if (key === "ArrowDown") {
      event.preventDefault();
      return (main.scrollTop += pageHeight * 0.1);
    } else if (key === "ArrowUp") {
      event.preventDefault();
      return (main.scrollTop -= pageHeight * 0.1);
    } else if (key === "PageDown") {
      event.preventDefault();
      return (main.scrollTop += pageHeight);
    } else if (key === "PageUp") {
      event.preventDefault();
      return (main.scrollTop -= pageHeight);
    }
  } else if (!keyIsRepeating) {
    if (key === "ArrowDown") {
      event.preventDefault();
      return SmoothScroller.scroll({
        scrollContainer: document.querySelector("main"),
        y: currentScrollTop + pageHeight * 0.1,
      });
    } else if (key === "ArrowUp") {
      event.preventDefault();
      return SmoothScroller.scroll({
        scrollContainer: document.querySelector("main"),
        y: currentScrollTop - pageHeight * 0.1,
      });
    } else if (key === "PageDown") {
      event.preventDefault();
      return SmoothScroller.scroll({
        scrollContainer: document.querySelector("main"),
        y: currentScrollTop + pageHeight,
      });
    } else if (key === "PageUp") {
      event.preventDefault();
      return SmoothScroller.scroll({
        scrollContainer: document.querySelector("main"),
        y: currentScrollTop - pageHeight,
      });
    } else if (key === "Home") {
      event.preventDefault();
      return SmoothScroller.scroll({
        scrollContainer: document.querySelector("main"),
        y: 0,
      });
    } else if (key === "End") {
      event.preventDefault();
      const bottomOfMain = main.scrollHeight - main.clientHeight;
      return SmoothScroller.scroll({
        scrollContainer: document.querySelector("main"),
        y: bottomOfMain,
      });
    }
  }
});
