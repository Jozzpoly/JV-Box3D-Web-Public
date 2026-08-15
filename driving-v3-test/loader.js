(() => {
  const PUBLIC_V1_GATE = "b6b91cad54966944af47f31d11721d2695066992";
  const PRIVATE_V2_UX = "b9dd4f98ecee192af3302150c95542c772033949";
  const PRIVATE_35_BRIDGE = "d6c646b65a0d57306e138175209c0f652bdbfbda";
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
    if (first < 0) throw new Error(`${label}: expected source fragment not found.`);
    if (source.indexOf(search, first + search.length) >= 0) {
      throw new Error(`${label}: expected source fragment is not unique.`);
    }
    return source.slice(0, first) + replacement + source.slice(first + search.length);
  }

  async function loadV1Loader() {
    const response = await fetch(
      new URL(`joystick-test/loader.js?v=${PUBLIC_V1_GATE.slice(0, 8)}`, document.baseURI),
      { cache: "no-store" },
    );
    if (!response.ok) {
      throw new Error(`Driving V3 could not load Analog V1 gate: HTTP ${response.status}.`);
    }
    return response.text();
  }

  async function fetchText(path) {
    const target = new URL(path, document.baseURI);
    const response = await fetch(target, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Driving V3 module fetch failed: HTTP ${response.status} ${target.pathname}.`);
    }
    return response.text();
  }

  function installCss(path, marker) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = new URL(path, document.baseURI).href;
    link.setAttribute(marker, "");
    document.head.append(link);
  }

  globalThis.__JV_APPLY_DRIVING_V3__ = async (payload, tools) => {
    const { replaceOnce: innerReplaceOnce, replaceRegexOnce } = tools;
    const cleanKey = "jv/app/clean-browser-host.js";
    const f4Key = "jv/app/f4-vehicle-host.js";
    const mainKey = "jv/main.js";
    const controllerKey = "jv/vehicle/m6/m6-vehicle-controller.js";
    for (const key of [cleanKey, f4Key, mainKey, controllerKey]) {
      if (typeof payload.modules[key] !== "string") {
        throw new Error(`Driving V3 requires runtime module ${key}.`);
      }
    }

    const [analogTimelineSource, pedalAdapterSource] = await Promise.all([
      fetchText("driving-v3-test/modules/analog-longitudinal-timeline.js"),
      fetchText("driving-v3-test/modules/pointer-longitudinal-pedal-adapter.js"),
    ]);
    if (!analogTimelineSource.includes("export class AnalogLongitudinalTimeline")) {
      throw new Error("Driving V3 analog timeline identity mismatch.");
    }
    if (!pedalAdapterSource.includes("export class PointerLongitudinalPedalAdapter")) {
      throw new Error,"Driving V3 pedal adapter identity mismatch.");
    }
    payload.modules["jv/input/analog-longitudinal-timeline.js"] = analogTimelineSource;
    payload.modules["jv/input/pointer-longitudinal-pedal-adapter.js"] = pedalAdapterSource;

    let controller = payload.modules[controllerKey];
    controller = replaceRegexOnce(
      controller,
      /const targetAngle = m6FrontLeftProvisionalSteeringAngleFromRack\(\s*this\.#config,\s*liveRack,?\s*\);/,
      `const sourceAngle = m6FrontLeftProvisionalSteeringAngleFromRack(\n        this.#config,\n        liveRack,\n      );\n      const signedFullRack = liveRack < 0\n        ? -this.#config.rackTravel\n        : this.#config.rackTravel;\n      const sourceFullLock = m6FrontLeftProvisionalSteeringAngleFromRack(\n        this.#config,\n        signedFullRack,\n      );\n      const targetAngle = Math.abs(sourceFullLock) > 1e-8\n        ? sourceAngle * ((35 * Math.PI / 180) / Math.abs(sourceFullLock))\n        : sourceAngle;`,
      "Driving V3 35 degree bridge",
    );
    payload.modules[controllerKey] = controller;

    let clean = payload.modules[cleanKey];
    clean =
      `import { AnalogLongitudinalTimeline } from "jv/input/analog-longitudinal-timeline.js";\n` +
      `import { PointerLongitudinalPedalAdapter } from "jv/input/pointer-longitudinal-pedal-adapter.js";\n` +
      clean;
    clean = innerReplaceOnce(
      clean,
      "      const steeringPositionTimeline = new SteeringPositionTimeline(startTimeMs);",
      `      const steeringPositionTimeline = new SteeringPositionTimeline(startTimeMs);\n      const analogLongitudinalTimeline = new AnalogLongitudinalTimeline(startTimeMs);`,
      "Driving V3 analog timeline insertion",
    );
    clean = innerReplaceOnce(
      clean,
      "      const clock = new FixedStepClock(startTimeMs, {",
      `      if (options.longitudinalPedals !== undefined) {\n        const pedalAdapter = new PointerLongitudinalPedalAdapter({\n          windowTarget: options.windowTarget,\n          documentTarget: options.documentTarget,\n          targets: options.longitudinalPedals,\n          timeline: analogLongitudinalTimeline,\n          now: options.now,\n          isDocumentHidden: options.isDocumentHidden,\n          ...(options.onLongitudinalPedalStateChange === undefined\n            ? {}\n            : { onStateChange: options.onLongitudinalPedalStateChange }),\n        });\n        resources.defer(\n          "pointer longitudinal pedal adapter",\n          () => pedalAdapter.dispose(),\n        );\n      }\n\n      const clock = new FixedStepClock(startTimeMs, {`,
      "Driving V3 pedal adapter insertion",
    );
    clean = replaceRegexOnce(
      clean,
      /const longitudinal = longitudinalTimeline\.consumeInterval\(\s*step\.startTimeMs,\s*step\.endTimeMs,?\s*\);\s*options\.onStep\(step, steering, longitudinal\);/,
      `const digitalLongitudinal = longitudinalTimeline.consumeInterval(\n                step.startTimeMs,\n                step.endTimeMs,\n              );\n              const analogLongitudinal = analogLongitudinalTimeline.consumeInterval(\n                step.startTimeMs,\n                step.endTimeMs,\n              );\n              const digitalDemand =\n                Math.abs(digitalLongitudinal.command.throttle) > 1e-9 ||\n                digitalLongitudinal.command.brake > 1e-9;\n              const longitudinal = digitalDemand\n                ? digitalLongitudinal\n                : { ...digitalLongitudinal, command: analogLongitudinal.command };\n              options.onStep(step, steering, longitudinal);`,
      "Driving V3 longitudinal mixer",
    );
    clean = replaceRegexOnce(
      clean,
      /longitudinalTimeline\.skipInterval\(\s*dropped\.startTimeMs,\s*dropped\.endTimeMs,?\s*\);/,
      `longitudinalTimeline.skipInterval(\n                dropped.startTimeMs,\n                dropped.endTimeMs,\n              );\n              analogLongitudinalTimeline.skipInterval(\n                dropped.startTimeMs,\n                dropped.endTimeMs,\n              );`,
      "Driving V3 dropped longitudinal interval",
    );
    payload.modules[cleanKey] = clean;

    let f4 = payload.modules[f4Key];
    f4 = innerReplaceOnce(
      f4,
      "        onStep: (step, steering, longitudinal) => {",
      `        ...(options.longitudinalPedals === undefined\n          ? {}\n          : { longitudinalPedals: options.longitudinalPedals }),\n        ...(options.onLongitudinalPedalStateChange === undefined\n          ? {}\n          : {\n              onLongitudinalPedalStateChange:\n                options.onLongitudinalPedalStateChange,\n            }),\n        onStep: (step, steering, longitudinal) => {`,
      "Driving V3 F4 pedal forwarding",
    );
    payload.modules[f4Key] = f4;

    let main = payload.modules[mainKey];
    const oldDriveMarkup = `          <button type="button" class="mobile-control mobile-control-drive" data-pointer-control="FORWARD" aria-label="Drive forward" aria-pressed="false"><span aria-hidden="true">▲</span><small>DRIVE</small></button>\n          <button type="button" class="mobile-control mobile-control-brake" data-pointer-control="BRAKE" aria-label="Brake" aria-pressed="false"><span aria-hidden="true">●</span><small>BRAKE</small></button>\n          <button type="button" class="mobile-control mobile-control-drive" data-pointer-control="REVERSE" aria-label="Drive in reverse" aria-pressed="false"><span aria-hidden="true">▼</span><small>REVERSE</small></button>`;
    const newDriveMarkup = `          <button hidden aria-hidden="true" tabindex="-1" type="button" class="mobile-control mobile-control-drive" data-pointer-control="FORWARD" aria-label="Drive forward compatibility target" aria-pressed="false"><span aria-hidden="true">▲</span><small>DRIVE</small></button>\n          <button hidden aria-hidden="true" tabindex="-1" type="button" class="mobile-control mobile-control-brake" data-pointer-control="BRAKE" aria-label="Brake compatibility target" aria-pressed="false"><span aria-hidden="true">●</span><small>BRAKE</small></button>\n          <button type="button" class="mobile-pedal mobile-pedal-throttle" data-longitudinal-pedal="THROTTLE" role="slider" aria-label="Analog throttle pedal" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="THROTTLE 0%" data-value-text="0%"><span class="mobile-pedal-face" aria-hidden="true"></span><small>THROTTLE</small></button>\n          <button type="button" class="mobile-pedal mobile-pedal-brake" data-longitudinal-pedal="BRAKE" role="slider" aria-label="Analog brake pedal" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="BRAKE 0%" data-value-text="0%"><span class="mobile-pedal-face" aria-hidden="true"></span><small>BRAKE</small></button>\n          <button type="button" class="mobile-control mobile-control-drive" data-pointer-control="REVERSE" aria-label="Drive in reverse" aria-pressed="false"><span aria-hidden="true">▼</span><small>REVERSE</small></button>`;
    main = innerReplaceOnce(main, oldDriveMarkup, newDriveMarkup, "Driving V3 pedal markup");

    main = innerReplaceOnce(
      main,
      `const steeringJoystick = requireElement("[data-steering-joystick]");`,
      `const steeringJoystick = requireElement("[data-steering-joystick]");\nconst throttlePedal = requireElement('[data-longitudinal-pedal="THROTTLE"]');\nconst brakePedal = requireElement('[data-longitudinal-pedal="BRAKE"]');\nconst mobileDriveControls = requireElement(".mobile-drive-controls");\nconst longitudinalPedals = {\n  throttle: throttlePedal,\n  brake: brakePedal,\n};`,
      "Driving V3 pedal targets",
    );

    main = innerReplaceOnce(
      main,
      `  steeringJoystick.style.setProperty(\n    "--steering-x",\n    \`${"${(-normalized * 34).toFixed(2)}"}%\`,\n  );`,
      `  steeringJoystick.style.setProperty(\n    "--steering-x",\n    \`${"${(-normalized * 34).toFixed(2)}"}%\`,\n  );\n  steeringJoystick.style.setProperty(\n    "--steering-angle",\n    \`${"${(-normalized * 108).toFixed(2)}"}deg\`,\n  );\n  steeringJoystick.style.setProperty(\n    "--steering-strength",\n    Math.abs(normalized).toFixed(4),\n  );`,
      "Driving V3 steering feedback variables",
    );

    main = innerReplaceOnce(
      main,
      "function setDebugPanelOpen(open) {",
      `function setLongitudinalPedalState(control, value, active) {\n  const normalized = Math.max(0, Math.min(1, value));\n  const pedal = control === "THROTTLE" ? throttlePedal : brakePedal;\n  const percent = Math.round(normalized * 100);\n  pedal.style.setProperty("--pedal-value", normalized.toFixed(4));\n  pedal.toggleAttribute("data-active", active);\n  pedal.setAttribute("aria-valuenow", String(percent));\n  pedal.setAttribute("aria-valuetext", \`${"${control}"} ${"${percent}"}%\`);\n  pedal.setAttribute("data-value-text", \`${"${percent}"}%\`);\n  mobileDriveControls.toggleAttribute(\n    control === "THROTTLE" ? "data-throttle-active" : "data-brake-active",\n    active,\n  );\n}\n\nfunction setDebugPanelOpen(open) {`,
      "Driving V3 pedal state renderer",
    );

    main = innerReplaceOnce(
      main,
      "function resetDisplay() {\n  resetPointerControlStates();\n  setSteeringJoystickState(0, false);",
      `function resetDisplay() {\n  resetPointerControlStates();\n  setSteeringJoystickState(0, false);\n  setLongitudinalPedalState("THROTTLE", 0, false);\n  setLongitudinalPedalState("BRAKE", 0, false);`,
      "Driving V3 pedal reset",
    );

    main = innerReplaceOnce(
      main,
      "      onSteeringJoystickStateChange: setSteeringJoystickState,",
      `      onSteeringJoystickStateChange: setSteeringJoystickState,\n      longitudinalPedals,\n      onLongitudinalPedalStateChange: setLongitudinalPedalState,`,
      "Driving V3 host pedal wiring",
    );

    payload.modules[mainKey] = main;
  };

  async function start() {
    setBoot("Preparing Analog V1 + Steering V2 base for Driving V3…");
    let source = await loadV1Loader();

    source = replaceOnce(
      source,
      "    await applyJoystickPatch(payload);\n\n    const style = document.createElement(\"style\");",
      `    await applyJoystickPatch(payload);\n    setBoot("Applying panoramic steering + analog pedals…");\n    await globalThis.__JV_APPLY_DRIVING_V3__(payload, { replaceOnce, replaceRegexOnce });\n\n    const style = document.createElement("style");`,
      "Driving V3 payload injection",
    );
    source = replaceOnce(
      source,
      'badge.textContent = "ANALOG STEERING V1 · POSITION";',
      'badge.textContent = "DRIVING V3 · WHEEL ARC + PEDALS";',
      "Driving V3 success badge",
    );
    source = replaceOnce(
      source,
      'badge.textContent = "ANALOG STEERING V1 · FAILED";',
      'badge.textContent = "DRIVING V3 · FAILED";',
      "Driving V3 failure badge",
    );

    installCss("steering-v2-test/controls-v2.css?v=b9dd4f98", "data-jv-steering-v2-overlay");
    installCss("driving-v3-test/controls-v3.css?v=v3a1", "data-jv-driving-v3-overlay");

    const script = document.createElement("script");
    script.setAttribute("data-jv-driving-v3-runtime", "");
    script.textContent = source;
    document.body.append(script);

    globalThis.__JV_DRIVING_V3_DEVICE_GATE__ = Object.freeze({
      kind: "NONCANONICAL_MOBILE_DRIVING_V3_HYBRID_WHEEL_ANALOG_PEDALS",
      publicV1GateCommit: PUBLIC_V1_GATE,
      privateSteeringV2Commit: PRIVATE_V2_UX,
      private35DegreeBridgeCommit: PRIVATE_35_BRIDGE,
      analogPedals: "relative-upward-gesture-0-to-1",
      steeringGesture: "x-only-position-with-rotary-feedback",
    });
  }

  start().catch((error) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    setBoot(`DRIVING V3 BOOT FAILED\n${message}`);
    if (badge instanceof HTMLElement) badge.textContent = "DRIVING V3 · FAILED";
    console.error("JV DRIVING V3 BOOT FAILED", error);
  });
})();
