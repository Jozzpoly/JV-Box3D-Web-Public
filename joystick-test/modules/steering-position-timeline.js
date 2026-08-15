import {
  positionSteering,
  RELEASE_STEERING,
} from "jv/input/steering-command.js";

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

export class SteeringPositionTimeline {
  #events = [];
  #activeSources = new Map();
  #nextSequence = 0;
  #cursorTimeMs;

  constructor(startTimeMs) {
    assertFiniteTimestamp(startTimeMs);
    this.#cursorTimeMs = startTimeMs;
  }

  get cursorTimeMs() {
    return this.#cursorTimeMs;
  }

  enqueuePosition(value, timestampMs, sourceId) {
    assertFiniteTimestamp(timestampMs);
    const normalized = positionSteering(value);
    if (normalized.mode !== "POSITION") {
      throw new Error("Position steering normalization failed.");
    }
    this.#insertEvent({
      kind: "STEERING_POSITION",
      value: normalized.value,
      timestampMs,
      sourceId,
      sequence: this.#nextSequence++,
    });
  }

  enqueueRelease(timestampMs, reason, sourceId) {
    assertFiniteTimestamp(timestampMs);
    this.#insertEvent({
      kind: "STEERING_POSITION_RELEASE",
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
      throw new Error(
        `Timeline interval must be contiguous. Expected ${this.#cursorTimeMs}, got ${startTimeMs}.`,
      );
    }

    const consumedEvents = [];
    while (this.#events.length > 0) {
      const event = this.#events[0];
      if (event === undefined || event.timestampMs >= endTimeMs) {
        break;
      }
      this.#events.shift();
      this.#applyEvent(event);
      consumedEvents.push(event);
    }
    this.#cursorTimeMs = endTimeMs;

    const active = this.#latestActiveSource();
    const positionAtEnd = active?.state.value ?? 0;
    return {
      startTimeMs,
      endTimeMs,
      command:
        active === null
          ? RELEASE_STEERING
          : positionSteering(positionAtEnd),
      activeSourceIdAtEnd: active?.sourceId ?? null,
      positionAtEnd,
      consumedEvents,
    };
  }

  skipInterval(startTimeMs, endTimeMs) {
    this.consumeInterval(startTimeMs, endTimeMs);
  }

  #insertEvent(event) {
    if (event.timestampMs < this.#cursorTimeMs - 1e-7) {
      throw new Error(
        `Cannot enqueue input event in the consumed past (${event.timestampMs} < ${this.#cursorTimeMs}).`,
      );
    }

    const insertionIndex = this.#events.findIndex(
      (candidate) => compareEvents(event, candidate) < 0,
    );
    if (insertionIndex === -1) {
      this.#events.push(event);
    } else {
      this.#events.splice(insertionIndex, 0, event);
    }
  }

  #applyEvent(event) {
    if (event.kind === "STEERING_POSITION_RELEASE") {
      this.#activeSources.delete(event.sourceId);
      return;
    }
    this.#activeSources.set(event.sourceId, {
      value: event.value,
      sequence: event.sequence,
    });
  }

  #latestActiveSource() {
    let latest = null;
    for (const [sourceId, state] of this.#activeSources) {
      if (latest === null || state.sequence > latest.state.sequence) {
        latest = { sourceId, state };
      }
    }
    return latest;
  }
}
