(() => {
  const PRIVATE_CONTROL_V2 = "b9dd4f98ecee192af3302150c95542c772033949";
  const PRIVATE_35_DEGREE_BRIDGE = "d6c646b65a0d57306e138175209c0f652bdbfbda";
  const V1_PUBLIC_GATE = "b6b91cad54966944af47f31d11721d2695066992";
  const boot = document.querySelector("[data-joystick-gate-boot]");
  const badge = document.querySelector("[data-joystick-gate-badge]");

  function setBoot(text) {
    if (boot instanceof HTMLElement) {
      boot.hidden = false;
      boot.textContent = text;
    }
  }

  function replaceOnce(source, search, replacement, label) {
    const first = source.indexOf(search);
    if (first < 0) {
      throw new Error(`${label}: expected source fragment not found.`);
    }
    if (source.indexOf(search, first + search.length) >= 0) {
      throw new Error(`${label}: expected source fragment is not unique.`);
    }
    return source.slice(0, first) + replacement + source.slice(first + search.length);
  }

  async function loadV1Loader() {
    const url = new URL(
      `joystick-test/loader.js?v=${V1_PUBLIC_GATE.slice(0, 8)}`,
      document.baseURI,
    );
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Steering V2 could not load V1 gate: HTTP ${response.status}.`);
    }
    return response.text();
  }

  async function start() {
    setBoot("Preparing validated Analog V1 base for Steering V2…");
    let source = await loadV1Loader();

    source = replaceOnce(
      source,
      "    await applyJoystickPatch(payload);\n\n    const style = document.createElement(\"style\");",
      `    await applyJoystickPatch(payload);\n    setBoot("Applying Steering V2 35 degree bridge…");\n    const controllerKey = "jv/vehicle/m6/m6-vehicle-controller.js";\n    if (typeof payload.modules[controllerKey] !== "string") {\n      throw new Error("Steering V2 requires m6-vehicle-controller.js.");\n    }\n    payload.modules[controllerKey] = replaceRegexOnce(\n      payload.modules[controllerKey],\n      /const targetAngle = m6FrontLeftProvisionalSteeringAngleFromRack\\(\\s*this\\.#config,\\s*liveRack,?\\s*\\);/,\n      \`const sourceAngle = m6FrontLeftProvisionalSteeringAngleFromRack(\\n        this.#config,\\n        liveRack,\\n      );\\n      const signedFullRack = liveRack < 0\\n        ? -this.#config.rackTravel\\n        : this.#config.rackTravel;\\n      const sourceFullLock = m6FrontLeftProvisionalSteeringAngleFromRack(\\n        this.#config,\\n        signedFullRack,\\n      );\\n      const targetAngle = Math.abs(sourceFullLock) > 1e-8\\n        ? sourceAngle * ((35 * Math.PI / 180) / Math.abs(sourceFullLock))\\n        : sourceAngle;\`,\n      "Steering V2 35 degree controller bridge",\n    );\n\n    const style = document.createElement("style");`,
      "Steering V2 controller injection",
    );

    source = replaceOnce(
      source,
      "    document.head.append(joystickCss);\n\n    const imports = { ...payload.external };",
      `    document.head.append(joystickCss);\n\n    const steeringV2Css = document.createElement("link");\n    steeringV2Css.rel = "stylesheet";\n    steeringV2Css.href = new URL(\n      "steering-v2-test/controls-v2.css?v=b9dd4f98",\n      document.baseURI,\n    ).href;\n    steeringV2Css.setAttribute("data-jv-steering-v2-overlay", "");\n    document.head.append(steeringV2Css);\n\n    const imports = { ...payload.external };`,
      "Steering V2 CSS injection",
    );

    source = replaceOnce(
      source,
      'badge.textContent = "ANALOG STEERING V1 · POSITION";',
      'badge.textContent = "STEERING V2 · RACK · 35°";',
      "Steering V2 success badge",
    );
    source = replaceOnce(
      source,
      'badge.textContent = "ANALOG STEERING V1 · FAILED";',
      'badge.textContent = "STEERING V2 · FAILED";',
      "Steering V2 failure badge",
    );

    const script = document.createElement("script");
    script.setAttribute("data-jv-steering-v2-runtime", "");
    script.textContent = source;
    document.body.append(script);

    globalThis.__JV_STEERING_V2_DEVICE_GATE__ = Object.freeze({
      kind: "NONCANONICAL_STEERING_CONTROL_V2_35DEG_OVER_ANALOG_V1",
      privateControlV2Commit: PRIVATE_CONTROL_V2,
      private35DegreeBridgeCommit: PRIVATE_35_DEGREE_BRIDGE,
      publicV1GateCommit: V1_PUBLIC_GATE,
    });
  }

  start().catch((error) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    setBoot(`STEERING V2 BOOT FAILED\n${message}`);
    if (badge instanceof HTMLElement) {
      badge.textContent = "STEERING V2 · FAILED";
    }
    console.error("JV STEERING V2 BOOT FAILED", error);
  });
})();
