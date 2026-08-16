function clamp01(value) {
    if (!Number.isFinite(value)) {
        return 0;
    }
    return Math.max(0, Math.min(1, value));
}
export class MobileDrivingV3Ui {
    #steeringJoystick;
    #steerLeft;
    #steerRight;
    #throttle;
    #brake;
    #direction;
    constructor(targets) {
        this.#steeringJoystick = targets.steeringJoystick;
        this.#steerLeft = targets.steerLeft;
        this.#steerRight = targets.steerRight;
        this.#throttle = targets.throttle;
        this.#brake = targets.brake;
        this.#direction = targets.direction;
        this.#installPedal(this.#throttle, "THROTTLE", "mobile-pedal-throttle");
        this.#installPedal(this.#brake, "BRAKE", "mobile-pedal-brake");
        this.#installDirectionSelector();
        this.setSteeringJoystickState(0, false);
        this.setPointerControlState("FORWARD", false, 0);
        this.setPointerControlState("BRAKE", false, 0);
        this.setPointerControlState("REVERSE", false, 0);
    }
    setPointerControlState(control, active, value) {
        if (control === "FORWARD" || control === "BRAKE") {
            const target = control === "FORWARD" ? this.#throttle : this.#brake;
            const normalized = clamp01(value ?? (active ? 1 : 0));
            const percentage = Math.round(normalized * 100);
            target.style.setProperty("--pedal-value", normalized.toFixed(4));
            target.toggleAttribute("data-active", active);
            target.setAttribute("aria-pressed", String(active));
            target.setAttribute("data-value-text", `${percentage}%`);
            target.setAttribute("aria-valuenow", String(percentage));
            target.setAttribute("aria-valuetext", `${percentage}%`);
            const readout = target.querySelector("[data-pedal-value]");
            if (readout !== null) {
                readout.textContent = `${percentage}%`;
            }
            this.#updatePedalPeers();
            return;
        }
        if (control === "REVERSE") {
            const direction = active ? "R" : "D";
            this.#direction.setAttribute("data-direction", direction);
            this.#direction.setAttribute("aria-pressed", String(active));
            this.#direction.setAttribute("aria-label", `Touch drive direction ${direction}. Tap to switch D/R.`);
            return;
        }
        const button = control === "STEER_LEFT" ? this.#steerLeft : this.#steerRight;
        button.setAttribute("aria-pressed", String(active));
        button.toggleAttribute("data-active", active);
    }
    setSteeringJoystickState(value, active) {
        const normalized = Math.max(-1, Math.min(1, value));
        this.#steeringJoystick.style.setProperty("--steering-x", `${(-normalized * 34).toFixed(2)}%`);
        this.#steeringJoystick.style.setProperty("--steering-angle", `${(-normalized * 112).toFixed(2)}deg`);
        this.#steeringJoystick.style.setProperty("--steering-strength", Math.abs(normalized).toFixed(4));
        this.#steeringJoystick.toggleAttribute("data-active", active);
        this.#steeringJoystick.setAttribute("aria-valuenow", String(Math.round(normalized * 100)));
        const magnitude = Math.round(Math.abs(normalized) * 100);
        this.#steeringJoystick.setAttribute("aria-valuetext", normalized > 0
            ? `LEFT ${magnitude}%`
            : normalized < 0
                ? `RIGHT ${magnitude}%`
                : "CENTER");
    }
    #installPedal(target, label, className) {
        target.classList.add("mobile-pedal", className);
        target.setAttribute("role", "slider");
        target.setAttribute("aria-valuemin", "0");
        target.setAttribute("aria-valuemax", "100");
        target.setAttribute("aria-label", `${label === "THROTTLE" ? "Analog throttle" : "Analog brake"}. Slide thumb upward for more input.`);
        target.innerHTML = `
      <span class="mobile-pedal-surface" aria-hidden="true">
        <span class="mobile-pedal-fill"></span>
        <span class="mobile-pedal-face"></span>
      </span>
      <strong class="mobile-pedal-value" data-pedal-value>0%</strong>
      <small>${label}</small>
    `;
    }
    #installDirectionSelector() {
        this.#direction.classList.add("mobile-direction-selector");
        this.#direction.innerHTML = `
      <span data-direction-option="D">D</span>
      <span class="mobile-direction-divider" aria-hidden="true">/</span>
      <span data-direction-option="R">R</span>
    `;
    }
    #updatePedalPeers() {
        const throttleActive = this.#throttle.hasAttribute("data-active");
        const brakeActive = this.#brake.hasAttribute("data-active");
        this.#throttle.toggleAttribute("data-peer-active", brakeActive && !throttleActive);
        this.#brake.toggleAttribute("data-peer-active", throttleActive && !brakeActive);
    }
}
