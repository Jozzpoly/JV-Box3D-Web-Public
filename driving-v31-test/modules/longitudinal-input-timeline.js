import { longitudinalCommand, } from "jv/input/longitudinal-command.js";
function compareEvents(left, right) {
    if (left.timestampMs !== right.timestampMs) {
        return left.timestampMs - right.timestampMs;
    }
    return left.sequence - right.sequence;
}
function assertFiniteTimestamp(timestampMs) {
    if (!Number.isFinite(timestampMs)) {
        throw new RangeError("Input event timestamp must be finite.");
    }
}
function assertNormalizedThrottle(value) {
    if (!Number.isFinite(value) || value < -1 || value > 1) {
        throw new RangeError("Analog throttle must be finite and normalized to [-1, 1].");
    }
}
function assertNormalizedBrake(value) {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
        throw new RangeError("Analog brake must be finite and normalized to [0, 1].");
    }
}
export class LongitudinalInputTimeline {
    #events = [];
    #forwardSources = new Set();
    #reverseSources = new Set();
    #brakeSources = new Set();
    #analogThrottleSources = new Map();
    #analogBrakeSources = new Map();
    #nextSequence = 0;
    #cursorTimeMs;
    constructor(startTimeMs) {
        assertFiniteTimestamp(startTimeMs);
        this.#cursorTimeMs = startTimeMs;
    }
    get cursorTimeMs() {
        return this.#cursorTimeMs;
    }
    enqueueButton(control, pressed, timestampMs, sourceId) {
        assertFiniteTimestamp(timestampMs);
        this.#insertEvent({
            kind: "LONGITUDINAL_BUTTON",
            control,
            pressed,
            timestampMs,
            sourceId,
            sequence: this.#nextSequence++,
        });
    }
    enqueueAnalogThrottle(value, timestampMs, sourceId) {
        assertFiniteTimestamp(timestampMs);
        assertNormalizedThrottle(value);
        this.#insertEvent({
            kind: "LONGITUDINAL_ANALOG_THROTTLE",
            value,
            timestampMs,
            sourceId,
            sequence: this.#nextSequence++,
        });
    }
    enqueueAnalogBrake(value, timestampMs, sourceId) {
        assertFiniteTimestamp(timestampMs);
        assertNormalizedBrake(value);
        this.#insertEvent({
            kind: "LONGITUDINAL_ANALOG_BRAKE",
            value,
            timestampMs,
            sourceId,
            sequence: this.#nextSequence++,
        });
    }
    enqueueReleaseAll(timestampMs, reason, sourceId) {
        assertFiniteTimestamp(timestampMs);
        this.#insertEvent({
            kind: "RELEASE_ALL",
            reason,
            timestampMs,
            sourceId,
            sequence: this.#nextSequence++,
        });
    }
    consumeInterval(startTimeMs, endTimeMs) {
        assertFiniteTimestamp(startTimeMs);
        assertFiniteTimestamp(endTimeMs);
        if (endTimeMs <= startTimeMs) {
            throw new RangeError("Input interval must have positive duration.");
        }
        if (Math.abs(startTimeMs - this.#cursorTimeMs) > 1e-7) {
            throw new Error(`Timeline interval must be contiguous. Expected ${this.#cursorTimeMs}, got ${startTimeMs}.`);
        }
        const consumedEvents = [];
        let segmentStartMs = startTimeMs;
        let integratedThrottleMs = 0;
        let integratedBrakeMs = 0;
        while (this.#events.length > 0) {
            const event = this.#events[0];
            if (event === undefined || event.timestampMs >= endTimeMs) {
                break;
            }
            this.#events.shift();
            const clampedEventTimeMs = Math.max(segmentStartMs, event.timestampMs);
            const durationMs = clampedEventTimeMs - segmentStartMs;
            integratedThrottleMs += this.#currentThrottle() * durationMs;
            integratedBrakeMs += this.#currentBrake() * durationMs;
            segmentStartMs = clampedEventTimeMs;
            this.#applyEvent(event);
            consumedEvents.push(event);
        }
        const tailDurationMs = endTimeMs - segmentStartMs;
        integratedThrottleMs += this.#currentThrottle() * tailDurationMs;
        integratedBrakeMs += this.#currentBrake() * tailDurationMs;
        this.#cursorTimeMs = endTimeMs;
        const intervalDurationMs = endTimeMs - startTimeMs;
        return {
            startTimeMs,
            endTimeMs,
            command: longitudinalCommand(integratedThrottleMs / intervalDurationMs, integratedBrakeMs / intervalDurationMs),
            integratedThrottleMs,
            integratedBrakeMs,
            forwardPressedAtEnd: this.#forwardSources.size > 0,
            reversePressedAtEnd: this.#reverseSources.size > 0,
            brakePressedAtEnd: this.#brakeSources.size > 0,
            consumedEvents,
        };
    }
    skipInterval(startTimeMs, endTimeMs) {
        this.consumeInterval(startTimeMs, endTimeMs);
    }
    #insertEvent(event) {
        if (event.timestampMs < this.#cursorTimeMs - 1e-7) {
            throw new Error(`Cannot enqueue input event in the consumed past (${event.timestampMs} < ${this.#cursorTimeMs}).`);
        }
        const insertionIndex = this.#events.findIndex((candidate) => compareEvents(event, candidate) < 0);
        if (insertionIndex === -1) {
            this.#events.push(event);
        }
        else {
            this.#events.splice(insertionIndex, 0, event);
        }
    }
    #applyEvent(event) {
        if (event.kind === "RELEASE_ALL") {
            this.#forwardSources.delete(event.sourceId);
            this.#reverseSources.delete(event.sourceId);
            this.#brakeSources.delete(event.sourceId);
            this.#analogThrottleSources.delete(event.sourceId);
            this.#analogBrakeSources.delete(event.sourceId);
            return;
        }
        if (event.kind === "LONGITUDINAL_ANALOG_THROTTLE") {
            if (Math.abs(event.value) <= 1e-12) {
                this.#analogThrottleSources.delete(event.sourceId);
            }
            else {
                this.#analogThrottleSources.set(event.sourceId, {
                    value: event.value,
                    sequence: event.sequence,
                });
            }
            return;
        }
        if (event.kind === "LONGITUDINAL_ANALOG_BRAKE") {
            if (event.value <= 1e-12) {
                this.#analogBrakeSources.delete(event.sourceId);
            }
            else {
                this.#analogBrakeSources.set(event.sourceId, event.value);
            }
            return;
        }
        const sources = this.#sourcesFor(event.control);
        if (event.pressed) {
            sources.add(event.sourceId);
        }
        else {
            sources.delete(event.sourceId);
        }
    }
    #sourcesFor(control) {
        switch (control) {
            case "FORWARD":
                return this.#forwardSources;
            case "REVERSE":
                return this.#reverseSources;
            case "BRAKE":
                return this.#brakeSources;
        }
    }
    #currentThrottle() {
        const forward = this.#forwardSources.size > 0 ? 1 : 0;
        const reverse = this.#reverseSources.size > 0 ? 1 : 0;
        if (forward !== 0 || reverse !== 0) {
            return forward - reverse;
        }
        let selected = null;
        for (const state of this.#analogThrottleSources.values()) {
            if (selected === null || state.sequence > selected.sequence) {
                selected = state;
            }
        }
        return selected?.value ?? 0;
    }
    #currentBrake() {
        if (this.#brakeSources.size > 0) {
            return 1;
        }
        let strongest = 0;
        for (const value of this.#analogBrakeSources.values()) {
            strongest = Math.max(strongest, value);
        }
        return strongest;
    }
}
