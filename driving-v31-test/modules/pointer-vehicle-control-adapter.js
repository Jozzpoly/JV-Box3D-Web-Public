const PEDAL_TRAVEL_RATIO = 0.86;
const MIN_PEDAL_TRAVEL_PX = 64;
const MAX_PEDAL_TRAVEL_PX = 120;
const DEFAULT_PEDAL_START_SLOP_PX = 6;
function pointerButtonIsSupported(event) {
    return event.button === 0 || event.button === -1;
}
export function resolvePointerPedalTravelPx(height) {
    if (!Number.isFinite(height) || height <= 0) {
        throw new RangeError("Pedal target height must be finite and positive.");
    }
    return Math.max(MIN_PEDAL_TRAVEL_PX, Math.min(MAX_PEDAL_TRAVEL_PX, height * PEDAL_TRAVEL_RATIO));
}
export function resolvePointerPedalValue(clientY, originY, travelPx, startSlopPx = DEFAULT_PEDAL_START_SLOP_PX) {
    if (!Number.isFinite(clientY) ||
        !Number.isFinite(originY) ||
        !Number.isFinite(travelPx) ||
        travelPx <= 0) {
        throw new RangeError("Pedal gesture geometry must be finite and positive.");
    }
    if (!Number.isFinite(startSlopPx) ||
        startSlopPx < 0 ||
        startSlopPx >= travelPx) {
        throw new RangeError("Pedal start slop must be in [0, travelPx).");
    }
    const upwardTravelPx = originY - clientY;
    if (upwardTravelPx <= startSlopPx) {
        return 0;
    }
    return Math.max(0, Math.min(1, (upwardTravelPx - startSlopPx) / (travelPx - startSlopPx)));
}
export class PointerVehicleControlAdapter {
    #windowTarget;
    #documentTarget;
    #isDocumentHidden;
    #steeringTimeline;
    #longitudinalTimeline;
    #now;
    #sourceIdPrefix;
    #onControlStateChange;
    #bindings;
    #listeners = [];
    #pointerOwners = new Map();
    #pedalPointers = new Map();
    #activePointersByControl = new Map();
    #driveDirection = "D";
    #disposed = false;
    #onBlur = () => {
        this.#releaseAll("BLUR");
    };
    #onVisibilityChange = () => {
        if (this.#isDocumentHidden()) {
            this.#releaseAll("VISIBILITY_HIDDEN");
        }
    };
    #onPageHide = () => {
        this.#releaseAll("PAGE_HIDE");
    };
    constructor(options) {
        this.#windowTarget = options.windowTarget;
        this.#documentTarget = options.documentTarget;
        this.#isDocumentHidden = options.isDocumentHidden;
        this.#steeringTimeline = options.steeringTimeline;
        this.#longitudinalTimeline = options.longitudinalTimeline;
        this.#now = options.now;
        this.#sourceIdPrefix = options.sourceIdPrefix ?? "pointer";
        this.#onControlStateChange = options.onControlStateChange;
        this.#bindings = Object.freeze([
            {
                id: "STEER_LEFT",
                kind: "STEERING",
                value: "LEFT",
                target: options.controls.steerLeft,
            },
            {
                id: "STEER_RIGHT",
                kind: "STEERING",
                value: "RIGHT",
                target: options.controls.steerRight,
            },
            {
                id: "FORWARD",
                kind: "PEDAL",
                pedal: "THROTTLE",
                target: options.controls.forward,
            },
            {
                id: "BRAKE",
                kind: "PEDAL",
                pedal: "BRAKE",
                target: options.controls.brake,
            },
            {
                id: "REVERSE",
                kind: "DIRECTION",
                target: options.controls.reverse,
            },
        ]);
        const uniqueTargets = new Set(this.#bindings.map((binding) => binding.target));
        if (uniqueTargets.size !== this.#bindings.length) {
            throw new Error("Each pointer vehicle control requires a unique target.");
        }
        for (const binding of this.#bindings) {
            this.#installControl(binding);
        }
        this.#listen(this.#windowTarget, "blur", this.#onBlur);
        this.#listen(this.#windowTarget, "pagehide", this.#onPageHide);
        this.#listen(this.#documentTarget, "visibilitychange", this.#onVisibilityChange);
    }
    dispose() {
        if (this.#disposed) {
            return;
        }
        this.#disposed = true;
        this.#releaseAll("DISPOSE");
        for (const { target, type, listener } of this.#listeners.reverse()) {
            target.removeEventListener(type, listener);
        }
        this.#listeners.length = 0;
    }
    #installControl(binding) {
        if (binding.kind === "DIRECTION") {
            const onPointerDown = (event) => {
                event.stopPropagation();
            };
            const onClick = (event) => {
                this.#toggleDirection(event);
            };
            this.#listen(binding.target, "pointerdown", onPointerDown);
            this.#listen(binding.target, "click", onClick);
            return;
        }
        const onPointerDown = (event) => {
            this.#handlePointerDown(binding, event);
        };
        const onPointerMove = (event) => {
            if (binding.kind === "PEDAL") {
                this.#handlePedalMove(binding, event);
            }
        };
        const onPointerUp = (event) => {
            this.#releasePointer(event, true);
        };
        const onPointerCancel = (event) => {
            this.#releasePointer(event, true);
        };
        const onLostPointerCapture = (event) => {
            this.#releasePointer(event, false);
        };
        this.#listen(binding.target, "pointerdown", onPointerDown);
        if (binding.kind === "PEDAL") {
            this.#listen(binding.target, "pointermove", onPointerMove);
        }
        this.#listen(binding.target, "pointerup", onPointerUp);
        this.#listen(binding.target, "pointercancel", onPointerCancel);
        this.#listen(binding.target, "lostpointercapture", onLostPointerCapture);
    }
    #listen(target, type, listener) {
        target.addEventListener(type, listener);
        this.#listeners.push({ target, type, listener });
    }
    #handlePointerDown(binding, event) {
        if (this.#disposed ||
            !pointerButtonIsSupported(event) ||
            this.#pointerOwners.has(event.pointerId)) {
            return;
        }
        let pedalState = null;
        if (binding.kind === "PEDAL") {
            if (this.#activePointers(binding.id).size > 0) {
                return;
            }
            try {
                pedalState = {
                    binding,
                    originY: event.clientY,
                    travelPx: resolvePointerPedalTravelPx(binding.target.getBoundingClientRect().height),
                    value: 0,
                };
            }
            catch {
                return;
            }
        }
        event.preventDefault();
        event.stopPropagation();
        try {
            binding.target.setPointerCapture(event.pointerId);
        }
        catch {
            return;
        }
        this.#pointerOwners.set(event.pointerId, binding);
        const activePointers = this.#activePointers(binding.id);
        const wasActive = activePointers.size > 0;
        activePointers.add(event.pointerId);
        if (binding.kind === "STEERING") {
            this.#steeringTimeline.enqueueButton(binding.value, true, this.#safeTimestamp(binding), this.#sourceId(event.pointerId));
            if (!wasActive) {
                this.#onControlStateChange?.(binding.id, true);
            }
            return;
        }
        if (pedalState !== null) {
            this.#pedalPointers.set(event.pointerId, pedalState);
            this.#onControlStateChange?.(binding.id, true, 0);
        }
    }
    #handlePedalMove(binding, event) {
        if (this.#disposed ||
            this.#pointerOwners.get(event.pointerId) !== binding) {
            return;
        }
        const state = this.#pedalPointers.get(event.pointerId);
        if (state === undefined) {
            return;
        }
        let value;
        try {
            value = resolvePointerPedalValue(event.clientY, state.originY, state.travelPx);
        }
        catch {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        if (Math.abs(value - state.value) <= 1e-6) {
            return;
        }
        state.value = value;
        this.#enqueuePedalValue(binding, value, this.#safeTimestamp(binding), this.#sourceId(event.pointerId));
        this.#onControlStateChange?.(binding.id, true, value);
    }
    #releasePointer(event, releaseCapture) {
        const binding = this.#pointerOwners.get(event.pointerId);
        if (binding === undefined) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        this.#pointerOwners.delete(event.pointerId);
        const activePointers = this.#activePointers(binding.id);
        activePointers.delete(event.pointerId);
        const timestampMs = this.#safeTimestamp(binding);
        const sourceId = this.#sourceId(event.pointerId);
        if (binding.kind === "STEERING") {
            this.#steeringTimeline.enqueueButton(binding.value, false, timestampMs, sourceId);
        }
        else {
            this.#pedalPointers.delete(event.pointerId);
            this.#enqueuePedalValue(binding, 0, timestampMs, sourceId);
        }
        if (releaseCapture) {
            try {
                if (binding.target.hasPointerCapture(event.pointerId)) {
                    binding.target.releasePointerCapture(event.pointerId);
                }
            }
            catch {
                // Semantic release is already queued. Browser capture teardown may race
                // with pointercancel/lostpointercapture and must not re-arm input.
            }
        }
        if (activePointers.size === 0) {
            this.#onControlStateChange?.(binding.id, false, binding.kind === "PEDAL" ? 0 : undefined);
        }
    }
    #toggleDirection(event) {
        if (this.#disposed) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        this.#driveDirection = this.#driveDirection === "D" ? "R" : "D";
        const timestampMs = Math.max(this.#now(), this.#longitudinalTimeline.cursorTimeMs);
        for (const [pointerId, state] of this.#pedalPointers) {
            if (state.binding.pedal !== "THROTTLE" || state.value <= 1e-12) {
                continue;
            }
            this.#enqueuePedalValue(state.binding, state.value, timestampMs, this.#sourceId(pointerId));
        }
        this.#onControlStateChange?.("REVERSE", this.#driveDirection === "R", this.#driveDirection === "R" ? 1 : 0);
    }
    #releaseAll(reason) {
        if (this.#pointerOwners.size === 0) {
            return;
        }
        const timestampByKind = new Map();
        for (const [pointerId, binding] of this.#pointerOwners) {
            const timelineKind = binding.kind === "STEERING" ? "STEERING" : "LONGITUDINAL";
            const timestamp = timestampByKind.get(timelineKind) ?? this.#safeTimestamp(binding);
            timestampByKind.set(timelineKind, timestamp);
            const sourceId = this.#sourceId(pointerId);
            if (binding.kind === "STEERING") {
                this.#steeringTimeline.enqueueReleaseAll(timestamp, reason, sourceId);
            }
            else {
                this.#longitudinalTimeline.enqueueReleaseAll(timestamp, reason, sourceId);
            }
            try {
                if (binding.target.hasPointerCapture(pointerId)) {
                    binding.target.releasePointerCapture(pointerId);
                }
            }
            catch {
                // Capture state is already outside the semantic input contract.
            }
        }
        this.#pointerOwners.clear();
        this.#pedalPointers.clear();
        for (const binding of this.#bindings) {
            if (binding.kind === "DIRECTION") {
                continue;
            }
            const activePointers = this.#activePointers(binding.id);
            if (activePointers.size > 0) {
                activePointers.clear();
                this.#onControlStateChange?.(binding.id, false, binding.kind === "PEDAL" ? 0 : undefined);
            }
        }
    }
    #enqueuePedalValue(binding, value, timestampMs, sourceId) {
        if (binding.pedal === "THROTTLE") {
            const direction = this.#driveDirection === "D" ? 1 : -1;
            this.#longitudinalTimeline.enqueueAnalogThrottle(value * direction, timestampMs, sourceId);
        }
        else {
            this.#longitudinalTimeline.enqueueAnalogBrake(value, timestampMs, sourceId);
        }
    }
    #safeTimestamp(binding) {
        const cursorTimeMs = binding.kind === "STEERING"
            ? this.#steeringTimeline.cursorTimeMs
            : this.#longitudinalTimeline.cursorTimeMs;
        return Math.max(this.#now(), cursorTimeMs);
    }
    #sourceId(pointerId) {
        return `${this.#sourceIdPrefix}:${pointerId}`;
    }
    #activePointers(control) {
        let active = this.#activePointersByControl.get(control);
        if (active === undefined) {
            active = new Set();
            this.#activePointersByControl.set(control, active);
        }
        return active;
    }
}
