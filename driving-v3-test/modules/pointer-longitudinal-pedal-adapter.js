const DEFAULT_DEAD_ZONE = 0.025;
const MIN_TRAVEL_PX = 48;
const TRAVEL_HEIGHT_RATIO = 0.82;

function pointerButtonIsSupported(event) {
  return event.button === 0 || event.button === -1;
}

export function resolveRelativePedalPosition(
  clientY,
  originY,
  travelPx,
  deadZone = DEFAULT_DEAD_ZONE,
) {
  if (
    !Number.isFinite(clientY) ||
    !Number.isFinite(originY) ||
    !Number.isFinite(travelPx) ||
    travelPx <= 0
  ) {
    throw new RangeError("Pedal gesture geometry must be finite and positive.");
  }
  if (!Number.isFinite(deadZone) || deadZone < 0 || deadZone >= 1) {
    throw new RangeError("Pedal dead zone must be in [0, 1).");
  }
  const raw = Math.max(0, Math.min(1, (originY - clientY) / travelPx));
  if (raw <= deadZone) {
    return 0;
  }
  return (raw - deadZone) / (1 - deadZone);
}

export class PointerLongitudinalPedalAdapter {
  #windowTarget;
  #documentTarget;
  #isDocumentHidden;
  #timeline;
  #now;
  #onStateChange;
  #bindings;
  #listeners = [];
  #owners = new Map();
  #activePointerByControl = new Map();
  #disposed = false;

  #onBlur = () => this.#neutralizeAll();
  #onVisibilityChange = () => {
    if (this.#isDocumentHidden()) this.#neutralizeAll();
  };
  #onPageHide = () => this.#neutralizeAll();

  constructor(options) {
    this.#windowTarget = options.windowTarget;
    this.#documentTarget = options.documentTarget;
    this.#isDocumentHidden = options.isDocumentHidden;
    this.#timeline = options.timeline;
    this.#now = options.now;
    this.#onStateChange = options.onStateChange;
    this.#bindings = Object.freeze([
      Object.freeze({
        control: "THROTTLE",
        target: options.targets.throttle,
        sourceId: `${options.sourceIdPrefix ?? "pointer-pedal"}:throttle`,
      }),
      Object.freeze({
        control: "BRAKE",
        target: options.targets.brake,
        sourceId: `${options.sourceIdPrefix ?? "pointer-pedal"}:brake`,
      }),
    ]);
    if (this.#bindings[0].target === this.#bindings[1].target) {
      throw new Error("Throttle and brake pedals require distinct targets.");
    }
    for (const binding of this.#bindings) this.#install(binding);
    this.#listen(this.#windowTarget, "blur", this.#onBlur);
    this.#listen(this.#windowTarget, "pagehide", this.#onPageHide);
    this.#listen(this.#documentTarget, "visibilitychange", this.#onVisibilityChange);
  }

  dispose() {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#neutralizeAll();
    for (const { target, type, listener } of this.#listeners.reverse()) {
      target.removeEventListener(type, listener);
    }
    this.#listeners.length = 0;
  }

  #install(binding) {
    this.#listen(binding.target, "pointerdown", (event) =>
      this.#handlePointerDown(binding, event));
    this.#listen(binding.target, "pointermove", (event) =>
      this.#handlePointerMove(event));
    this.#listen(binding.target, "pointerup", (event) =>
      this.#releasePointer(event, true));
    this.#listen(binding.target, "pointercancel", (event) =>
      this.#releasePointer(event, true));
    this.#listen(binding.target, "lostpointercapture", (event) =>
      this.#releasePointer(event, false));
  }

  #listen(target, type, listener) {
    target.addEventListener(type, listener);
    this.#listeners.push({ target, type, listener });
  }

  #handlePointerDown(binding, event) {
    if (
      this.#disposed ||
      !pointerButtonIsSupported(event) ||
      this.#owners.has(event.pointerId) ||
      this.#activePointerByControl.has(binding.control)
    ) return;

    let rect;
    try {
      rect = binding.target.getBoundingClientRect();
    } catch {
      return;
    }
    if (!Number.isFinite(rect.height) || rect.height <= 0) return;
    event.preventDefault();
    event.stopPropagation();
    try {
      binding.target.setPointerCapture(event.pointerId);
    } catch {
      return;
    }

    const owner = Object.freeze({
      binding,
      originY: event.clientY,
      travelPx: Math.max(MIN_TRAVEL_PX, rect.height * TRAVEL_HEIGHT_RATIO),
    });
    this.#owners.set(event.pointerId, owner);
    this.#activePointerByControl.set(binding.control, event.pointerId);
    this.#timeline.enqueuePosition(
      binding.control,
      0,
      this.#safeTimestamp(),
      binding.sourceId,
    );
    this.#onStateChange?.(binding.control, 0, true);
  }

  #handlePointerMove(event) {
    const owner = this.#owners.get(event.pointerId);
    if (this.#disposed || owner === undefined) return;
    const value = resolveRelativePedalPosition(
      event.clientY,
      owner.originY,
      owner.travelPx,
    );
    event.preventDefault();
    event.stopPropagation();
    this.#timeline.enqueuePosition(
      owner.binding.control,
      value,
      this.#safeTimestamp(),
      owner.binding.sourceId,
    );
    this.#onStateChange?.(owner.binding.control, value, true);
  }

  #releasePointer(event, releaseCapture) {
    const owner = this.#owners.get(event.pointerId);
    if (owner === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    this.#owners.delete(event.pointerId);
    this.#activePointerByControl.delete(owner.binding.control);
    this.#timeline.enqueueRelease(
      owner.binding.control,
      this.#safeTimestamp(),
      owner.binding.sourceId,
    );
    if (releaseCapture) {
      try {
        if (owner.binding.target.hasPointerCapture(event.pointerId)) {
          owner.binding.target.releasePointerCapture(event.pointerId);
        }
      } catch {}
    }
    this.#onStateChange?.(owner.binding.control, 0, false);
  }

  #neutralizeAll() {
    if (this.#owners.size === 0) return;
    const timestamp = this.#safeTimestamp();
    for (const [pointerId, owner] of this.#owners) {
      this.#timeline.enqueueRelease(
        owner.binding.control,
        timestamp,
        owner.binding.sourceId,
      );
      try {
        if (owner.binding.target.hasPointerCapture(pointerId)) {
          owner.binding.target.releasePointerCapture(pointerId);
        }
      } catch {}
      this.#onStateChange?.(owner.binding.control, 0, false);
    }
    this.#owners.clear();
    this.#activePointerByControl.clear();
  }

  #safeTimestamp() {
    return Math.max(this.#now(), this.#timeline.cursorTimeMs);
  }
}
