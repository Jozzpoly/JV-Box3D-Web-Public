(() => {
  const PRIVATE_SOURCE_COMMIT = "db55501342feacfb0f82099d7f47afe3a9756143";
  const CAMERA_GATE_COMMIT = "4768abedaa67b7505ca963a0836879e42590b67d";

  globalThis.__JV_FULLSCREEN_DEVICE_GATE__ = Object.freeze({
    kind: "NONCANONICAL_FULLSCREEN_V1_OVER_CAMERA_1B",
    privateSourceCommit: PRIVATE_SOURCE_COMMIT,
    cameraGateCommit: CAMERA_GATE_COMMIT,
  });

  function fullscreenAvailable() {
    return document.fullscreenEnabled === true &&
      typeof document.documentElement.requestFullscreen === "function" &&
      typeof document.exitFullscreen === "function";
  }

  function setActive(button, active) {
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }

  function install() {
    const controls = document.querySelector("[data-product-controls] .product-controls");
    if (!(controls instanceof HTMLElement)) {
      return false;
    }
    if (controls.querySelector("[data-fullscreen-gate-control]") !== null) {
      return true;
    }

    const badge = document.querySelector("[data-fullscreen-gate-badge]");
    if (!fullscreenAvailable()) {
      if (badge instanceof HTMLElement) {
        badge.textContent = "FULLSCREEN V1 · API UNSUPPORTED";
      }
      return true;
    }

    const notice = controls.querySelector(".product-control-notice");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "product-choice";
    button.setAttribute("aria-label", "Przełącz pełny ekran");
    button.setAttribute("data-fullscreen-gate-control", "");

    const sync = () => {
      const active = document.fullscreenElement !== null;
      button.textContent = active ? "Wyjdź z pełnego" : "Pełny ekran";
      setActive(button, active);
      if (badge instanceof HTMLElement) {
        badge.textContent = active
          ? "FULLSCREEN V1 · ACTIVE"
          : "FULLSCREEN V1 · CAMERA 1B BASE";
      }
    };

    button.addEventListener("click", async () => {
      button.disabled = true;
      if (notice instanceof HTMLElement) {
        notice.hidden = true;
      }
      try {
        if (document.fullscreenElement === null) {
          await document.documentElement.requestFullscreen();
        } else {
          await document.exitFullscreen();
        }
      } catch (error) {
        if (notice instanceof HTMLElement) {
          notice.textContent =
            "Pełny ekran jest niedostępny w tej przeglądarce lub kontekście.";
          notice.hidden = false;
        }
        console.warn("JV fullscreen device gate request rejected", error);
      } finally {
        button.disabled = false;
        sync();
      }
    });

    document.addEventListener("fullscreenchange", sync);
    window.addEventListener(
      "pagehide",
      () => document.removeEventListener("fullscreenchange", sync),
      { once: true },
    );
    sync();
    controls.append(button);
    return true;
  }

  if (!install()) {
    const observer = new MutationObserver(() => {
      if (install()) {
        observer.disconnect();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 15_000);
  }
})();
