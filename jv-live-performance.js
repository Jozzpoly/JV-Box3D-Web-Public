(() => {
  const params = new URLSearchParams(globalThis.location?.search ?? "");
  const nativeDevicePixelRatio = Number(globalThis.devicePixelRatio || 1);
  const requestedScale = params.get("jvRenderScale");
  const renderScaleCap = requestedScale === "1"
    ? 1
    : requestedScale === "1.5"
      ? 1.5
      : requestedScale === "2"
        ? 2
        : null;

  if (
    renderScaleCap !== null &&
    Number.isFinite(nativeDevicePixelRatio) &&
    nativeDevicePixelRatio > renderScaleCap
  ) {
    try {
      Object.defineProperty(globalThis, "devicePixelRatio", {
        configurable: true,
        enumerable: true,
        get: () => renderScaleCap,
      });
    } catch (error) {
      console.warn("JV live render-scale override unavailable.", error);
    }
  }

  if (params.get("jvPerfHud") !== "1") {
    return;
  }

  const installHud = () => {
    const hud = document.createElement("output");
    hud.id = "jv-live-perf-hud";
    hud.setAttribute("aria-live", "off");
    Object.assign(hud.style, {
      position: "fixed",
      zIndex: "2147483647",
      top: "max(8px, env(safe-area-inset-top))",
      right: "max(8px, env(safe-area-inset-right))",
      padding: "6px 8px",
      borderRadius: "6px",
      background: "rgba(0, 0, 0, 0.72)",
      color: "#fff",
      font: "600 11px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      whiteSpace: "pre",
      pointerEvents: "none",
      textAlign: "right",
    });
    document.body.append(hud);

    let previous = performance.now();
    let frames = 0;
    const sample = (now) => {
      frames += 1;
      const elapsed = now - previous;
      if (elapsed >= 1000) {
        const fps = frames * 1000 / elapsed;
        const frameMs = elapsed / frames;
        const canvas = document.querySelector("canvas");
        let canvasText = "canvas ?";
        if (canvas instanceof HTMLCanvasElement) {
          const scaleX = canvas.clientWidth > 0 ? canvas.width / canvas.clientWidth : 0;
          const scaleY = canvas.clientHeight > 0 ? canvas.height / canvas.clientHeight : 0;
          const scale = scaleX > 0 && scaleY > 0 ? (scaleX + scaleY) * 0.5 : 0;
          canvasText = `${canvas.width}×${canvas.height} · render ${scale.toFixed(2)}×`;
        }
        const capText = renderScaleCap === null ? "default" : `${renderScaleCap}× cap`;
        hud.value = `${frameMs.toFixed(1)} ms · ${fps.toFixed(0)} fps\n${canvasText}\nDPR ${nativeDevicePixelRatio.toFixed(2)} · ${capText}`;
        previous = now;
        frames = 0;
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installHud, { once: true });
  } else {
    installHud();
  }
})();
