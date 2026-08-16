import { MobileDrivingV3Ui } from "jv/mobile-driving-v3-ui.js";
import {
  resolvePointerPedalTravelPx,
  resolvePointerPedalValue,
} from "jv/input/pointer-vehicle-control-adapter.js";
import { resolvePointerSteeringPosition } from "jv/input/pointer-steering-joystick-adapter.js";

const REQUIRED = Object.freeze({
  steering: "[data-steering-joystick]",
  steerLeft: '[data-pointer-control="STEER_LEFT"]',
  steerRight: '[data-pointer-control="STEER_RIGHT"]',
  throttle: '[data-pointer-control="FORWARD"]',
  brake: '[data-pointer-control="BRAKE"]',
  direction: '[data-pointer-control="REVERSE"]',
});

function pointerButtonIsSupported(event) {
  return event.button === 0 || event.button === -1;
}

function findTargets() {
  const targets = {};
  for (const [key, selector] of Object.entries(REQUIRED)) {
    const element = document.querySelector(selector);
    if (!(element instanceof HTMLElement)) return null;
    targets[key] = element;
  }
  return targets;
}

function install() {
  const targets = findTargets();
  if (targets === null) return false;
  if (document.documentElement.hasAttribute("data-jv-driving-v31-ui")) return true;
  document.documentElement.setAttribute("data-jv-driving-v31-ui", "");

  const ui = new MobileDrivingV3Ui({
    steeringJoystick: targets.steering,
    steerLeft: targets.steerLeft,
    steerRight: targets.steerRight,
    throttle: targets.throttle,
    brake: targets.brake,
    direction: targets.direction,
  });

  const pedalStates = new Map();

  function installPedal(target, control) {
    const release = (event) => {
      const state = pedalStates.get(control);
      if (state === undefined || state.pointerId !== event.pointerId) return;
      pedalStates.delete(control);
      ui.setPointerControlState(control, false, 0);
    };

    target.addEventListener("pointerdown", (event) => {
      if (!pointerButtonIsSupported(event) || pedalStates.has(control)) return;
      const pointerId = event.pointerId;
      const originY = event.clientY;
      queueMicrotask(() => {
        if (pedalStates.has(control) || !target.hasPointerCapture(pointerId)) return;
        try {
          pedalStates.set(control, {
            pointerId,
            originY,
            travelPx: resolvePointerPedalTravelPx(target.getBoundingClientRect().height),
          });
        } catch {
          return;
        }
        ui.setPointerControlState(control, true, 0);
      });
    });

    target.addEventListener("pointermove", (event) => {
      const state = pedalStates.get(control);
      if (state === undefined || state.pointerId !== event.pointerId) return;
      let value;
      try {
        value = resolvePointerPedalValue(
          event.clientY,
          state.originY,
          state.travelPx,
        );
      } catch {
        return;
      }
      ui.setPointerControlState(control, true, value);
    });

    target.addEventListener("pointerup", release);
    target.addEventListener("pointercancel", release);
    target.addEventListener("lostpointercapture", release);

    const observer = new MutationObserver(() => {
      if (!target.hasAttribute("data-active") && pedalStates.has(control)) {
        pedalStates.delete(control);
        ui.setPointerControlState(control, false, 0);
      }
    });
    observer.observe(target, { attributes: true, attributeFilter: ["data-active"] });
  }

  installPedal(targets.throttle, "FORWARD");
  installPedal(targets.brake, "BRAKE");

  let steeringPointerId = null;
  function steeringValue(event) {
    const rect = targets.steering.getBoundingClientRect();
    return resolvePointerSteeringPosition(event.clientX, rect.left, rect.width);
  }
  function releaseSteering(event) {
    if (event.pointerId !== steeringPointerId) return;
    steeringPointerId = null;
    ui.setSteeringJoystickState(0, false);
  }
  targets.steering.addEventListener("pointerdown", (event) => {
    if (!pointerButtonIsSupported(event) || steeringPointerId !== null) return;
    const pointerId = event.pointerId;
    const clientX = event.clientX;
    queueMicrotask(() => {
      if (steeringPointerId !== null || !targets.steering.hasPointerCapture(pointerId)) return;
      steeringPointerId = pointerId;
      ui.setSteeringJoystickState(
        steeringValue({ clientX }),
        true,
      );
    });
  });
  targets.steering.addEventListener("pointermove", (event) => {
    if (event.pointerId !== steeringPointerId) return;
    ui.setSteeringJoystickState(steeringValue(event), true);
  });
  targets.steering.addEventListener("pointerup", releaseSteering);
  targets.steering.addEventListener("pointercancel", releaseSteering);
  targets.steering.addEventListener("lostpointercapture", releaseSteering);

  let lastDirection = null;
  function syncDirection() {
    const reverse = targets.direction.getAttribute("aria-pressed") === "true";
    if (reverse === lastDirection) return;
    lastDirection = reverse;
    ui.setPointerControlState("REVERSE", reverse, reverse ? 1 : 0);
  }
  targets.direction.addEventListener("click", () => queueMicrotask(syncDirection));
  const directionObserver = new MutationObserver(syncDirection);
  directionObserver.observe(targets.direction, {
    attributes: true,
    attributeFilter: ["aria-pressed"],
  });
  syncDirection();

  const steeringObserver = new MutationObserver(() => {
    if (!targets.steering.hasAttribute("data-active") && steeringPointerId === null) {
      ui.setSteeringJoystickState(0, false);
    }
  });
  steeringObserver.observe(targets.steering, {
    attributes: true,
    attributeFilter: ["data-active"],
  });

  const neutralizeVisuals = () => {
    pedalStates.clear();
    steeringPointerId = null;
    ui.setPointerControlState("FORWARD", false, 0);
    ui.setPointerControlState("BRAKE", false, 0);
    ui.setSteeringJoystickState(0, false);
    syncDirection();
  };
  window.addEventListener("blur", neutralizeVisuals);
  window.addEventListener("pagehide", neutralizeVisuals, { once: true });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") neutralizeVisuals();
  });

  globalThis.__JV_DRIVING_V31_UI_READY__ = Object.freeze({
    input: "PRIVATE_TYPED_SOURCE_OVERLAY",
    presentation: "DEVICE_UI_BRIDGE",
  });
  return true;
}

if (!install()) {
  const observer = new MutationObserver(() => {
    if (install()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setTimeout(() => {
    observer.disconnect();
    if (globalThis.__JV_DRIVING_V31_UI_READY__ !== undefined) return;
    const boot = document.querySelector("[data-joystick-gate-boot]");
    const badge = document.querySelector("[data-joystick-gate-badge]");
    if (boot instanceof HTMLElement) {
      boot.hidden = false;
      boot.textContent = "DRIVING V3.1 UI BRIDGE FAILED\nRequired control DOM did not become ready within 15 seconds.";
    }
    if (badge instanceof HTMLElement) {
      badge.textContent = "DRIVING V3.1 · UI FAILED";
    }
  }, 15_000);
}
