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

  const counters = {
    drawCalls: 0,
    triangleIndices: 0,
  };
  const PATCHED = Symbol.for("jv.live.webgl.perf.patched");

  const patchWebGlPrototype = (prototype) => {
    if (!prototype || prototype[PATCHED]) {
      return;
    }
    Object.defineProperty(prototype, PATCHED, {
      configurable: false,
      enumerable: false,
      value: true,
    });

    const nativeDrawElements = prototype.drawElements;
    if (typeof nativeDrawElements === "function") {
      prototype.drawElements = function(mode, count, type, offset) {
        counters.drawCalls += 1;
        if (mode === this.TRIANGLES && Number.isFinite(count) && count > 0) {
          counters.triangleIndices += count;
        }
        return nativeDrawElements.call(this, mode, count, type, offset);
      };
    }

    const nativeDrawArrays = prototype.drawArrays;
    if (typeof nativeDrawArrays === "function") {
      prototype.drawArrays = function(mode, first, count) {
        counters.drawCalls += 1;
        if (mode === this.TRIANGLES && Number.isFinite(count) && count > 0) {
          counters.triangleIndices += count;
        }
        return nativeDrawArrays.call(this, mode, first, count);
      };
    }
  };

  patchWebGlPrototype(globalThis.WebGLRenderingContext?.prototype);
  patchWebGlPrototype(globalThis.WebGL2RenderingContext?.prototype);

  const installHud = () => {
    const hud = document.createElement("output");
    hud.id = "jv-live-perf-hud";
    hud.setAttribute("aria-live", "off");
    Object.assign(hud.style, {
      position: "fixed",
      zIndex: "2147483647",
      top: "max(8px, env(safe-area-inset-top))",
      right: "max(8px, env(safe-area-inset-right))",
      maxWidth: "min(470px, calc(100vw - 16px))",
      padding: "7px 9px",
      border: "1px solid rgba(126, 220, 166, 0.34)",
      borderRadius: "8px",
      background: "rgba(0, 0, 0, 0.76)",
      color: "#fff",
      font: "600 11px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      whiteSpace: "pre",
      pointerEvents: "none",
      textAlign: "right",
    });
    hud.value = "LIVE PERF · WARMING";
    document.body.append(hud);

    const samples = [];
    const rollingWindowMs = 2000;
    const settleMs = 1500;
    const updateEveryMs = 500;
    let startedAt = null;
    let previousTimestamp = null;
    let previousDrawCalls = counters.drawCalls;
    let previousTriangleIndices = counters.triangleIndices;
    let lastUpdateAt = -Infinity;

    const summarize = () => {
      if (samples.length === 0) {
        return null;
      }
      let frameTotal = 0;
      let drawTotal = 0;
      let triangleIndexTotal = 0;
      const frameTimes = [];
      for (const sample of samples) {
        frameTotal += sample.frameMs;
        drawTotal += sample.drawCalls;
        triangleIndexTotal += sample.triangleIndices;
        frameTimes.push(sample.frameMs);
      }
      frameTimes.sort((a, b) => a - b);
      const p95Index = Math.min(
        frameTimes.length - 1,
        Math.max(0, Math.ceil(frameTimes.length * 0.95) - 1),
      );
      const frameMs = frameTotal / samples.length;
      return {
        frameMs,
        fps: 1000 / frameMs,
        p95FrameMs: frameTimes[p95Index],
        drawCallsPerFrame: drawTotal / samples.length,
        trianglesPerFrame: triangleIndexTotal / samples.length / 3,
      };
    };

    const sample = (now) => {
      if (startedAt === null) {
        startedAt = now;
      }

      const currentDrawCalls = counters.drawCalls;
      const currentTriangleIndices = counters.triangleIndices;
      if (previousTimestamp !== null) {
        const frameMs = now - previousTimestamp;
        if (Number.isFinite(frameMs) && frameMs > 0) {
          samples.push({
            timestamp: now,
            frameMs,
            drawCalls: Math.max(0, currentDrawCalls - previousDrawCalls),
            triangleIndices: Math.max(
              0,
              currentTriangleIndices - previousTriangleIndices,
            ),
          });
        }
      }
      previousTimestamp = now;
      previousDrawCalls = currentDrawCalls;
      previousTriangleIndices = currentTriangleIndices;

      const cutoff = now - rollingWindowMs;
      while (samples.length > 0 && samples[0].timestamp < cutoff) {
        samples.shift();
      }

      if (now - lastUpdateAt >= updateEveryMs) {
        const summary = summarize();
        if (summary !== null) {
          const canvas = document.querySelector("canvas");
          let canvasText = "canvas ?";
          if (canvas instanceof HTMLCanvasElement) {
            const scaleX = canvas.clientWidth > 0
              ? canvas.width / canvas.clientWidth
              : 0;
            const scaleY = canvas.clientHeight > 0
              ? canvas.height / canvas.clientHeight
              : 0;
            const scale = scaleX > 0 && scaleY > 0
              ? (scaleX + scaleY) * 0.5
              : 0;
            canvasText =
              `${canvas.width}×${canvas.height} · render ${scale.toFixed(2)}×`;
          }
          const capText = renderScaleCap === null
            ? "default"
            : `${renderScaleCap}× cap`;
          const state = now - startedAt >= settleMs ? "SETTLED" : "WARMING";
          const triangles = summary.trianglesPerFrame >= 1000
            ? `${(summary.trianglesPerFrame / 1_000_000).toFixed(2)}M tri/f`
            : `${summary.trianglesPerFrame.toFixed(0)} tri/f`;
          hud.value =
            `LIVE PERF · ${state} · ${summary.frameMs.toFixed(1)} ms avg · ` +
            `${summary.fps.toFixed(0)} fps · p95 ${summary.p95FrameMs.toFixed(1)} ms\n` +
            `${canvasText}\n` +
            `${summary.drawCallsPerFrame.toFixed(1)} draws/f · ${triangles}\n` +
            `DPR ${nativeDevicePixelRatio.toFixed(2)} · ${capText}`;
        }
        lastUpdateAt = now;
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
