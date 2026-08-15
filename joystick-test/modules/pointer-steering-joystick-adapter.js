const DEFAULT_DEAD_ZONE = 0.08;

function pointerButtonIsSupported(event) {
  return event.button === 0 || event.button === -1;
}

export function resolvePointerSteeringPosition(
  clientX,
  left,
  width,
  deadZone = DEFAULT_DEAD_ZONE,
) {
  if (
    !Number.isFinite(clientX) ||
    !Number.isFinite(left) ||
    !Number.isFinite(width) ||
    width <= 0
  ) {
    throw new RangeError(
      "Steering joystick geometry must be finite and positive.",
    );
  }
  if (!Number.isFinite(deadZone) || deadZone < 0 || deadZone >= 1) {
    throw new RangeError("Steering joystick dead zone must be in [0, 1).");
  }

  const centerX = left + width / 2;
  const raw = Math.max(
    -1,
    Math.min(1, (centerX - clientX) / (width / 2)),
  );
  const magnitude = Math.abs(raw);
  if (magnitude <= deadZone) {
    return 0;
  }
  const rescaled = (magnitude - deadZone) / (1 - deadZone);
  return Math.sign(raw) * rescaled;
}

export class PointerSteeringJoystickAdapter {
  #windowTarget;
  #documentTarget;
  #target;
  #timeline;
  #now;
  #isDocumentHidden;
  #sourceId;
  #deadZone;
  #onStateChange;
  #listeners = [];
  #activePointerId = null;
  #hasActivated = false;
  #disposed = false;

  #onPointerDown = (event) => {
    this.#handlePointerDown(event);
  };

  #onPointerMove = (event) => {
    this.#handlePointerMove(event);
  };

  #onPointerUp = (event) => {
    this.#releasePointer(event, true);
  };

  #onPointerCancel = (event) => {
    this.#releasePointer(event, true);
  };

  #onLostPointerCapture = (event) => {
    this.#releasePointer(event, false);
  };

  #onBlur = () => {
    this.#neutralize("BLUR");
  };

  #onVisibilityChange = () => {
    if (this.#isDocumentHidden()) {
      this.#neutralize("VISIBILITY_HIDDEN");
    }
  };

  #onPageHide = () => {
    this.#neutralize("PAGE_HIDE");
  };

  constructor(options) {
    this.#windowTarget = options.windowTarget;
    this.#documentTarget = options.documentTarget;
    this.#target = options.target;
    this.#timeline = options.timeline;
    this.#now = options.now;
    this.#isDocumentHidden = options.isDocumentHidden;
    this.#sourceId = options.sourceId ?? "pointer-steering-joystick";
    this.#deadZone = options.deadZone ?? DEFAULT_DEAD_ZONE;
    resolvePointerSteeringPosition(0, -1, 2, this.#deadZone);
    this.#onStateChange = options.onStateChange;

    this.#listen(this.#target, "pointerdown", this.#onPointerDown);
    this.#listen(this.#target, "pointermove", this.#onPointerMove);
    this.#listen(this.#target, "pointerup", this.#onPointerUp);
    this.#listen(this.#target, "pointercancel", this.#onPointerCancel);
    this.#listen(
      this.#target,
      "lostpointercapture",
      this.#onLostPointerCapture,
    );
    this.#listen(this.#windowTarget, "blur", this.#onBlur);
    this.#listen(this.#windowTarget, "pagehide", this.#onPageHide);
    this.#listen(
      this.#documentTarget,
      "visibilitychange",
      this.#onVisibilityChange,
    );
  }

  dispose() {
    if (this.#disposed) {
      return;
    }
    this.#disposed = true;
    this.#releaseCapture();
    if (this.#hasActivated) {
      this.#timeline.enqueueRelease(
        this.#safeTimestamp(),
        "DISPOSE",
        this.#sourceId,
      );
    }
    this.#activePointerId = null;
    this.#onStateChange?.(0, false);
    for (const { target, type, listener } of this.#listeners.reverse()) {
      target.removeEventListener(type, listener);
    }
    this.#listeners.length = 0;
  }

  #listen(target, type, listener) {
    target.addEventListener(type, listener);
    this.#listeners.push({ target, type, listener });
  }

  #handlePointerDown(event) {
    if (
      this.#disposed ||
      this.#activePointerId !== null ||
      !pointerButtonIsSupported(event)
    ) {
      return;
    }

    const value = this.#positionFor(event.clientX);
    if (value === null) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();

    try {
      this.#target.setPointerCapture(event.pointerId);
    } catch {
      return;
    }

    this.#activePointerId = event.pointerId;
    this.#hasActivated = true;
    this.#timeline.enqueuePosition(
      value,
      this.#safeTimestamp(),
      this.#sourceId,
    );
    this.#onStateChange?.(value, true);
  }

  #handlePointerMove(event) {
    if (this.#disposed || event.pointerId !== this.#activePointerId) {
      return;
    }
    const value = this.#positionFor(event.clientX);
    if (value === null) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.#timeline.enqueuePosition(
      value,
      this.#safeTimestamp(),
      this.#sourceId,
    );
    this.#onStateChange?.(value, true);
  }

  #releasePointer(event, releaseCapture) {
    if (event.pointerId !== this.#activePointerId) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.#activePointerId = null;
    this.#timeline.enqueuePosition(0, this.#safeTimestamp(), this.#sourceId);
    if (releaseCapture) {
      this.#releaseCapture(event.pointerId);
    }
    this.#onStateChange?.(0, false);
  }

  #neutralize(_reason) {
    if (this.#disposed || !this.#hasActivated) {
      return;
    }
    this.#releaseCapture();
    this.#activePointerId = null;
    this.#timeline.enqueuePosition(0, this.#safeTimestamp(), this.#sourceId);
    this.#onStateChange?.(0, false);
  }

  #releaseCapture(pointerId = this.#activePointerId) {
    if (pointerId === null) {
      return;
    }
    try {
      if (this.#target.hasPointerCapture(pointerId)) {
        this.#target.releasePointerCapture(pointerId);
      }
    } catch {
      // Semantic neutralization is independent from browser capture teardown.
    }
  }

  #positionFor(clientX) {
    try {
      const rect = this.#target.getBoundingClientRect();
      return resolvePointerSteeringPosition(
        clientX,
        rect.left,
        rect.width,
        this.#deadZone,
      );
    } catch {
      return null;
    }
  }

  #safeTimestamp() {
    return Math.max(this.#now(), this.#timeline.cursorTimeMs);
  }
}
