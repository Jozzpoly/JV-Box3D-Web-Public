const RELEASE_COMMAND = Object.freeze({ throttle: 0, brake: 0 });

function assertFiniteTime(value, label) {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${label} must be finite.`);
  }
}

function assertUnit(value, label) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${label} must be in [0, 1].`);
  }
}

function assertSourceId(sourceId) {
  if (typeof sourceId !== "string" || sourceId.length === 0) {
    throw new TypeError("Analog longitudinal sourceId must be a non-empty string.");
  }
}

export class AnalogLongitudinalTimeline {
  #cursorTimeMs;
  #events = [];
  #sequence = 0;
  #throttleSources = new Map();
  #brakeSources = new Map();

  constructor(startTimeMs) {
    assertFiniteTime(startTimeMs, "Analog longitudinal startTimeMs");
    this.#cursorTimeMs = startTimeMs;
  }

  get cursorTimeMs() {
    return this.#cursorTimeMs;
  }

  enqueuePosition(control, value, timestampMs, sourceId = "analog-longitudinal") {
    if (control !== "THROTTLE" && control !== "BRAKE") {
      throw new RangeError(`Unknown analog longitudinal control: ${String(control)}.`);
    }
    assertUnit(value, `${control} position`);
    assertFiniteTime(timestampMs, "Analog longitudinal timestampMs");
    assertSourceId(sourceId);
    this.#assertNotPast(timestampMs);
    this.#events.push(Object.freeze({
      kind: "POSITION",
      control,
      value,
      timestampMs,
      sourceId,
      sequence: this.#sequence++,
    }));
    this.#sortEvents();
  }

  enqueueRelease(control, timestampMs, sourceId = "analog-longitudinal") {
    if (control !== "THROTTLE" && control !== "BRAKE") {
      throw new RangeError(`Unknown analog longitudinal control: ${String(control)}.`);
    }
    assertFiniteTime(timestampMs, "Analog longitudinal timestampMs");
    assertSourceId(sourceId);
    this.#assertNotPast(timestampMs);
    this.#events.push(Object.freeze({
      kind: "RELEASE",
      control,
      timestampMs,
      sourceId,
      sequence: this.#sequence++,
    }));
    this.#sortEvents();
  }

  enqueueReleaseAll(timestampMs, sourceId = "analog-longitudinal") {
    assertFiniteTime(timestampMs, "Analog longitudinal timestampMs");
    assertSourceId(sourceId);
    this.#assertNotPast(timestampMs);
    this.#events.push(Object.freeze({
      kind: "RELEASE_ALL",
      timestampMs,
      sourceId,
      sequence: this.#sequence++,
    }));
    this.#sortEvents();
  }

  consumeInterval(startTimeMs, endTimeMs) {
    this.#assertInterval(startTimeMs, endTimeMs);
    const durationMs = endTimeMs - startTimeMs;
    let integratedThrottle = 0;
    let integratedBrake = 0;
    let segmentStartMs = startTimeMs;
    let eventCount = 0;

    while (this.#events.length > 0 && this.#events[0].timestampMs < endTimeMs) {
      const event = this.#events.shift();
      const eventTimeMs = Math.max(startTimeMs, event.timestampMs);
      const segmentMs = Math.max(0, eventTimeMs - segmentStartMs);
      const command = this.#currentCommand();
      integratedThrottle += command.throttle * segmentMs;
      integratedBrake += command.brake * segmentMs;
      segmentStartMs = eventTimeMs;
      this.#applyEvent(event);
      eventCount += 1;
    }

    const tailMs = Math.max(0, endTimeMs - segmentStartMs);
    const tailCommand = this.#currentCommand();
    integratedThrottle += tailCommand.throttle * tailMs;
    integratedBrake += tailCommand.brake * tailMs;
    this.#cursorTimeMs = endTimeMs;

    const command = durationMs > 0
      ? Object.freeze({
          throttle: integratedThrottle / durationMs,
          brake: integratedBrake / durationMs,
        })
      : RELEASE_COMMAND;
    const endCommand = this.#currentCommand();
    return Object.freeze({
      command,
      throttleAtEnd: endCommand.throttle,
      brakeAtEnd: endCommand.brake,
      eventCount,
    });
  }

  skipInterval(startTimeMs, endTimeMs) {
    this.#assertInterval(startTimeMs, endTimeMs);
    while (this.#events.length > 0 && this.#events[0].timestampMs < endTimeMs) {
      this.#applyEvent(this.#events.shift());
    }
    this.#cursorTimeMs = endTimeMs;
  }

  #applyEvent(event) {
    if (event.kind === "RELEASE_ALL") {
      this.#throttleSources.delete(event.sourceId);
      this.#brakeSources.delete(event.sourceId);
      return;
    }
    const sources = event.control === "THROTTLE"
      ? this.#throttleSources
      : this.#brakeSources:
    if (event.kind === "RELEASE" || event.value <= 0) {
      sources.delete(event.sourceId);
      return;
    }
    sources.set(event.sourceId, Object.freeze({
      value: event.value,
      sequence: event.sequence,
    }));
  }

  #currentCommand() {
    return Object.freeze({
      throttle: this.#latestValue(this.#throttleSources),
      brake: this.#latestValue(this.#brakeSources),
    });
  }

  #latestValue(sources) {
    let sequence = -1;
    let value = 0;
    for (const state of sources.values()) {
      if (state.sequence > sequence) {
        sequence = state.sequence;
        value = state.value;
      }
    }
    return value;
  }

  #assertNotPast(timestampMs) {
    if (timestampMs < this.#cursorTimeMs) {
      throw new RangeError(
        `Analog longitudinal event at ${timestampMs} ms is before consumed cursor ${this.#cursorTimeMs} ms.`,
      );
    }
  }

  #assertInterval(startTimeMs, endTimeMs) {
    assertFiniteTime(startTimeMs, "Analog longitudinal interval start");
    assertFiniteTime(endTimeMs, "Analog longitudinal interval end");
    if (Math.abs(startTimeMs - this.#cursorTimeMs) > 1e-9) {
      throw new RangeError(
        `Analog longitudinal interval must start at cursor ${this.#cursorTimeMs} ms, got ${startTimeMs} ms.`,
      );
    }
    if (endTimeMs < startTimeMs) {
      throw new RangeError("Analog longitudinal interval end must not precede start.");
    }
  }

  #sortEvents() {
    this.#events.sort((a, b) =>
      a.timestampMs - b.timestampMs || a.sequence - b.sequence
    );
  }
}
