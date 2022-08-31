import { getDeviceHeuristics } from "/scripts/modules/utilities.js";
import { MomentaMouse } from "/scripts/modules/momenta-mouse.js";

document.querySelector(".date-year").textContent = new Date().getFullYear();

let hue = -5;
document
  .querySelectorAll(".carousel-item")
  .forEach((element) =>
    element.style.setProperty("background", `hsl(${(hue += 5)}, 50%, 50%)`)
  );

let number = 0;
document.querySelectorAll(".carousel-item").forEach((element) => {
  const carouselItemNumber = document.createElement("div");
  carouselItemNumber.classList.add("carousel-item-number");
  carouselItemNumber.textContent = number += 1;
  element.insertAdjacentElement("afterbegin", carouselItemNumber);
});

const { isTouchScreen } = getDeviceHeuristics();
if (!isTouchScreen) {
  MomentaMouse.autoCreateScrollers({
    considerOverflowHiddenAxesNonScrollable: false,
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
} else if (isTouchScreen) {
  document
    .querySelector(".touch-screen-modal")
    .style.setProperty("display", "grid");
}
