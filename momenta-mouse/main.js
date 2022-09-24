import { MomentaMouse } from "/scripts/modules/momenta-mouse.js";
import { SmoothScroller } from "/scripts/modules/smooth-scroller.js";
import { Heuristics } from "/scripts/modules/utilities.js";

document.querySelector(".date-year").textContent = new Date().getFullYear();

const createAndAddCarouselItemNumberDiv = (element, number) => {
  const carouselItemNumber = document.createElement("div");
  carouselItemNumber.classList.add("carousel-item-number");
  carouselItemNumber.textContent = number;
  element.insertAdjacentElement("afterbegin", carouselItemNumber);
};

document.querySelectorAll(".carousel.vertical").forEach((verticalCarousel) => {
  let hue = 0;
  let number = 0;

  verticalCarousel
    .querySelectorAll(".carousel-item")
    .forEach((carouselItem) => {
      carouselItem.style.setProperty("background", `hsl(${hue}, 100%, 50%)`);
      hue += 27;
      createAndAddCarouselItemNumberDiv(carouselItem, number++);
    });
});

let hue = 0;
let number = 0;
document
  .querySelectorAll(".carousel.horizontal > .carousel-item")
  .forEach((carouselItem) => {
    carouselItem.style.setProperty("background", `hsl(${hue}, 100%, 50%)`);
    hue += 5;
    createAndAddCarouselItemNumberDiv(carouselItem, number++);
  });

const kitteh = document.querySelector(".kitteh");
kitteh.addEventListener("pointerdown", () => {
  kitteh.querySelectorAll(".eyelid-down").forEach((element) => {
    element.beginElement();
  });
});

const openEyes = () => {
  kitteh.querySelectorAll(".eyelid-up").forEach((element) => {
    element.beginElement();
  });
};

["pointercancel", "pointerup"].forEach((eventType) =>
  kitteh.addEventListener(eventType, () => openEyes())
);

["contextmenu", "momentaMouseScrollerPointerRoute"].forEach((eventType) =>
  document.addEventListener(eventType, (event) => {
    if (
      event.type === "momentaMouseScrollerPointerRoute" &&
      event.detail.routeFrom !== kitteh
    )
      return;

    openEyes();
  })
);

addEventListener("blur", () => openEyes());

document
  .querySelector(".combination-reset-button")
  .addEventListener("click", () => {
    let wait = 0;
    document.querySelectorAll(".carousel.vertical").forEach((scroller) => {
      setTimeout(
        () =>
          SmoothScroller.scroll({
            scrollContainer: scroller,
            y: 0,
          }),
        wait
      );
      wait += 34;
    });
  });

document.querySelectorAll("select").forEach((element) =>
  element.addEventListener("input", (event) => {
    const option = event.target.name;
    const value = event.target.value;
    if (option === "deceleration") {
      MomentaMouse.getAllScrollers().forEach((scroller) =>
        scroller.setDecelerationLevel(value)
      );
    } else if (option === "bounciness") {
      MomentaMouse.getAllScrollers().forEach((scroller) =>
        scroller.setBorderBouncinessLevel(value)
      );
    } else if (option === "activation-state") {
      if (value === "on") {
        MomentaMouse.getAllScrollers().forEach((scroller) =>
          scroller.activate()
        );
      } else if (value === "off") {
        MomentaMouse.getAllScrollers().forEach((scroller) =>
          scroller.deactivate()
        );
      }
    } else if (option === "reactive-cursor") {
      if (value === "on") {
        MomentaMouse.getAllScrollers().forEach((scroller) =>
          scroller.setAllowReactiveCursor(true)
        );
      } else if (value === "off") {
        MomentaMouse.getAllScrollers().forEach((scroller) =>
          scroller.setAllowReactiveCursor(false)
        );
      }
    } else if (option === "quick-toggle-key") {
      if (value === "on") {
        MomentaMouse.setAllowQuickToggleKey(true);
      } else if (value === "off") {
        MomentaMouse.setAllowQuickToggleKey(false);
      }
    }
  })
);

const snapCarouselItemIntoAlignment = (verticalCarousel) => {
  if (!verticalCarousel.matches(".vertical")) return;

  const verticalCarouselScrollTop = verticalCarousel.scrollTop;

  const verticalCarouselItemOffsets = Array.from(
    verticalCarousel.querySelectorAll(".carousel-item")
  ).map(
    (carouseItem) =>
      carouseItem.offsetTop -
      Number.parseInt(getComputedStyle(carouseItem).marginTop)
  );

  const carouselItemDistancesFromScrollTop = verticalCarouselItemOffsets.map(
    (offset) => Math.abs(offset - verticalCarouselScrollTop)
  );

  const smallestDistanceFromScrollTop = Math.min(
    ...carouselItemDistancesFromScrollTop
  );

  const carouselItemClosestToScrollTop =
    carouselItemDistancesFromScrollTop.indexOf(smallestDistanceFromScrollTop);

  SmoothScroller.scroll({
    scrollContainer: verticalCarousel,
    y: verticalCarouselItemOffsets[carouselItemClosestToScrollTop],
  });
};

const selectElements = document.querySelectorAll("select");
const activationStateSelect = document.querySelector(
  "#activation-state-select"
);

const applyMouseFoundChanges = () => {
  selectElements.forEach((selectElement) =>
    selectElement.removeAttribute("disabled")
  );
  activationStateSelect.value = "on";
};

const applyMouseNotFoundChanges = () => {
  selectElements.forEach((selectElement) =>
    selectElement.setAttribute("disabled", "disabled")
  );
  activationStateSelect.value = "off";
};

const updatePageAccordingToMouseAvailability = (hasMouseOrTouchpad) => {
  if (hasMouseOrTouchpad) {
    applyMouseFoundChanges();
  } else if (!hasMouseOrTouchpad) {
    applyMouseNotFoundChanges();
  }
};

const { hasMouseOrTouchpad } = Heuristics.getDeviceHeuristics({
  listenForAndDispatchChanges: true,
});
updatePageAccordingToMouseAvailability(hasMouseOrTouchpad);

document.addEventListener("deviceHeuristicsChange", (event) => {
  if (event.detail.property !== "hasMouseOrTouchpad") return;

  const { newValue: hasMouseOrTouchpad } = event.detail;
  updatePageAccordingToMouseAvailability(hasMouseOrTouchpad);
});

document.addEventListener("momentaMouseScrollerActivate", (event) => {
  if (event.detail.scrollContainer !== document.documentElement) return;

  document.body.dataset.momentaMouseActive = "true";
});

document.addEventListener("momentaMouseScrollerDeactivate", (event) => {
  if (event.detail.scrollContainer !== document.documentElement) return;

  document.body.dataset.momentaMouseActive = "false";
});

document.addEventListener(
  "momentaMouseScrollerPointerHandlingStop",
  (event) => {
    if (!event.detail.scrollContainer.matches(".vertical")) return;

    if (event.detail.interruptedBy)
      snapCarouselItemIntoAlignment(event.detail.scrollContainer);
  }
);

document.addEventListener("momentaMouseScrollerScrollStop", (event) => {
  if (!event.detail.scrollContainer.matches(".vertical")) return;

  const scrollWasInterrupted =
    event.detail.interruptedBy !==
      "Scroll distance is below minimum scrollable distance" &&
    event.detail.interruptedBy;
  if (!scrollWasInterrupted)
    snapCarouselItemIntoAlignment(event.detail.scrollContainer);
});

MomentaMouse.autoCreateScrollers({
  considerOverflowHiddenAxesNonScrollable: false,
  selectorsToIgnore: [".carousel-container, svg"],
}).setSelectorsOfClickableElements([".kitteh"]);
