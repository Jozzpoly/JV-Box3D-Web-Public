(() => {
  const BASE_TREE = "a7f7e643a94b2e4cffc911032878031f3428551d";
  const BASE_PAYLOAD_SHA256 = "9c05c1fb1377dd5f78a75dca9d1e879d2f49c9f9af2867cce9f2eb1aaea1d86a";
  const BASE_PART_COUNT = 24;
  const BASE64_CHARS = 142136;
  const PASS2_TARGET_TREE = "32f3cc4763c79ac6c5fd9b3812b7a6d6874b557b";
  const PASS2_PATCH_SHA256 = "8ca5180bdc6eeea950ebe569f855c9efa4bccb7606ca7d074c8390b99ed0b3ec";
  const PASS2_PATCH_PART_COUNT = 4;
  const PASS2_PATCH_BASE64_CHARS = 19084;
  const BASE_PAYLOAD_SCHEMA = "JV_WEB_PERF_FOUNDATION_NATIVE_ESM_PAYLOAD_V1";
  const PASS2_PATCH_SCHEMA = "JV_WEB_PERF_FOUNDATION_NATIVE_ESM_PATCH_V1";
  const CAMERA_PATCH_SCHEMA = "JV_WEB_CAMERA_NATIVE_ESM_PATCH_V1";
  const CAMERA_CANDIDATE_COMMIT = "fde0127aa726bd57a97b5815572a4067e94c3807";
  const CAMERA_CANDIDATE_TREE = "fa672d549ff5703766b150ea3d4e1c72a1dd4470";
  const PRIVATE_REMOTE_BASE = "dc8eab1ef3a24dcaab4b8fdff61da020c2518d5e";
  const CAMERA_PATCH_SHA256 = "fcc82118d607bed941b487d1f8222d291882c8f5ea51b600ade5b8ee04f1be78";
  const CAMERA_PATCH_PART_COUNT = 8;
  const CAMERA_PATCH_BASE64_CHARS = 10532;
  const PRIVATE_JOYSTICK_SOURCE = "d80d4636a1327c3aaf9e6689a95a7cb1d91f98b2";
  const POSITION_FOUNDATION_SOURCE = "30a00ab861f9c93150f426d5d06a01e7b86dda46";
  const JOYSTICK_ADAPTER_SOURCE = "2fc8babbf22f239e27e625e5d174fae18d7ce616";
  const DEFAULTS = { jvSpawn: "offroad", jvRenderScale: "1" };

  const url = new URL(window.location.href);
  let changed = false;
  for (const [key, value] of Object.entries(DEFAULTS)) {
    if (!url.searchParams.has(key)) {
      url.searchParams.set(key, value);
      changed = true;
    }
  }
  if (changed) window.history.replaceState(null, "", url.href);

  globalThis.__JV_BUILD_SOURCE_COMMIT__ = "DEV";
  globalThis.__JV_BUILD_SOURCE_MARKER__ = `JV_JOYSTICK_GATE:${PRIVATE_JOYSTICK_SOURCE}`;
  globalThis.__JV_JOYSTICK_DEVICE_GATE__ = Object.freeze({
    kind: "NONCANONICAL_ANALOG_STEERING_V1_OVER_CAMERA_1B",
    privateSourceCommit: PRIVATE_JOYSTICK_SOURCE,
    positionFoundationCommit: POSITION_FOUNDATION_SOURCE,
    joystickAdapterCommit: JOYSTICK_ADAPTER_SOURCE,
    cameraCandidateCommit: CAMERA_CANDIDATE_COMMIT,
    cameraPatchSha256: CAMERA_PATCH_SHA256,
  });

  const boot = document.querySelector("[data-joystick-gate-boot]");
  const badge = document.querySelector("[data-joystick-gate-badge]");
  const setBoot = (text) => {
    if (boot instanceof HTMLElement) {
      boot.hidden = false;
      boot.textContent = text;
    }
  };

  async function sha256Hex(bytes) {
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0")
    ).join("");
  }

  function decodeBase64(encoded) {
    const decoded = atob(encoded);
    return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
  }

  async function fetchJoinedParts(prefix, partCount, expectedChars) {
    const urls = Array.from({ length: partCount }, (_, index) =>
      new URL(`${prefix}-${String(index).padStart(2, "0")}.b64`, document.baseURI)
    );
    const parts = await Promise.all(urls.map(async (partUrl) => {
      const response = await fetch(partUrl, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Device-gate part fetch failed: HTTP ${response.status} ${partUrl.pathname}.`);
      }
      return (await response.text()).trim();
    }));
    const encoded = parts.join("");
    if (encoded.length !== expectedChars) {
      throw new Error(`Device-gate base64 length mismatch for ${prefix}: ${encoded.length}.`);
    }
    return decodeBase64(encoded);
  }

  async function fetchText(path) {
    const target = new URL(path, document.baseURI);
    const response = await fetch(target, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Joystick module fetch failed: HTTP ${response.status} ${target.pathname}.`);
    }
    return response.text();
  }

  async function gunzipJson(bytes, expectedSha, label) {
    const actualSha = await sha256Hex(bytes.buffer);
    if (actualSha !== expectedSha) {
      throw new Error(`${label} SHA-256 mismatch: ${actualSha}.`);
    }
    if (typeof DecompressionStream !== "function") {
      throw new Error("This Chrome build does not expose DecompressionStream(gzip).");
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return JSON.parse(await new Response(stream).text());
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

  function replaceRegexOnce(source, pattern, replacement, label) {
    const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
    const matches = Array.from(source.matchAll(new RegExp(pattern.source, flags)));
    if (matches.length !== 1) {
      throw new Error(`${label}: expected one match, found ${matches.length}.`);
    }
    return source.replace(pattern, replacement);
  }

  async function loadBasePayload() {
    const bytes = await fetchJoinedParts(
      "perf-foundation-test/payload",
      BASE_PART_COUNT,
      BASE64_CHARS,
    );
    const payload = await gunzipJson(bytes, BASE_PAYLOAD_SHA256, "Base payload");
    if (payload?.schema !== BASE_PAYLOAD_SCHEMA) {
      throw new Error(
        `Base payload schema mismatch: expected ${BASE_PAYLOAD_SCHEMA}, got ${String(payload?.schema)}.`,
      );
    }
    if (
      payload?.source?.tree !== BASE_TREE ||
      typeof payload?.entry !== "string" ||
      typeof payload?.css !== "string" ||
      typeof payload?.modules !== "object" || payload.modules === null ||
      typeof payload?.external !== "object" || payload.external === null
    ) {
      throw new Error("Base payload structural contract mismatch.");
    }
    return payload;
  }

  async function applyPass2(payload) {
    const bytes = await fetchJoinedParts(
      "perf-foundation-test/pass2-patch",
      PASS2_PATCH_PART_COUNT,
      PASS2_PATCH_BASE64_CHARS,
    );
    const patch = await gunzipJson(bytes, PASS2_PATCH_SHA256, "Pass2 patch");
    if (patch?.schema !== PASS2_PATCH_SCHEMA) {
      throw new Error(
        `Pass2 patch schema mismatch: expected ${PASS2_PATCH_SCHEMA}, got ${String(patch?.schema)}.`,
      );
    }
    if (
      patch?.baseTree !== BASE_TREE ||
      patch?.target?.tree !== PASS2_TARGET_TREE ||
      typeof patch?.modules !== "object" || patch.modules === null
    ) {
      throw new Error("Pass2 patch structural contract mismatch.");
    }
    Object.assign(payload.modules, patch.modules);
    payload.source = patch.target;
  }

  async function applyCameraPatch(payload) {
    const bytes = await fetchJoinedParts(
      "camera-test/camera-patch-v2",
      CAMERA_PATCH_PART_COUNT,
      CAMERA_PATCH_BASE64_CHARS,
    );
    const patch = await gunzipJson(bytes, CAMERA_PATCH_SHA256, "Camera patch");
    if (
      patch?.schema !== CAMERA_PATCH_SCHEMA ||
      patch?.base?.pass2Tree !== PASS2_TARGET_TREE ||
      patch?.candidate?.commit !== CAMERA_CANDIDATE_COMMIT ||
      patch?.candidate?.tree !== CAMERA_CANDIDATE_TREE ||
      patch?.candidate?.privateRemoteBase !== PRIVATE_REMOTE_BASE ||
      typeof patch?.modules !== "object" || patch.modules === null ||
      Object.keys(patch.modules).length !== 3
    ) {
      throw new Error("Camera patch contract mismatch.");
    }
    const expectedModules = new Set([
      "jv/render/m6-camera-viewport.js",
      "jv/render/m6-chase-camera.js",
      "jv/render/m6-world-renderer.js",
    ]);
    for (const [specifier, source] of Object.entries(patch.modules)) {
      if (!expectedModules.has(specifier) || typeof source !== "string" || !(specifier in payload.modules)) {
        throw new Error(`Unexpected Camera module patch: ${specifier}.`);
      }
      payload.modules[specifier] = source;
      expectedModules.delete(specifier);
    }
    if (expectedModules.size !== 0) {
      throw new Error(`Camera patch is missing modules: ${Array.from(expectedModules).join(", ")}.`);
    }
  }

  async function applyJoystickPatch(payload) {
    const cleanKey = "jv/app/clean-browser-host.js";
    const f4Key = "jv/app/f4-vehicle-host.js";
    const mainKey = "jv/main.js";
    const steeringCommandKey = "jv/input/steering-command.js";
    for (const key of [cleanKey, f4Key, mainKey, steeringCommandKey]) {
      if (typeof payload.modules[key] !== "string") {
        throw new Error(`Joystick gate requires runtime module ${key}.`);
      }
    }

    const [positionSource, joystickSource] = await Promise.all([
      fetchText("joystick-test/modules/steering-position-timeline.js"),
      fetchText("joystick-test/modules/pointer-steering-joystick-adapter.js"),
    ]);
    if (!positionSource.includes("export class SteeringPositionTimeline")) {
      throw new Error("Joystick position module identity mismatch.");
    }
    if (!joystickSource.includes("export class PointerSteeringJoystickAdapter")) {
      throw new Error("Joystick adapter module identity mismatch.");
    }
    payload.modules["jv/input/steering-position-timeline.js"] = positionSource;
    payload.modules["jv/input/pointer-steering-joystick-adapter.js"] = joystickSource;

    let clean = payload.modules[cleanKey];
    clean =
      `import { PointerSteeringJoystickAdapter } from "jv/input/pointer-steering-joystick-adapter.js";\n` +
      `import { SteeringPositionTimeline } from "jv/input/steering-position-timeline.js";\n` +
      clean;
    clean = replaceRegexOnce(
      clean,
      /const steeringTimeline = new SteeringInputTimeline\(startTimeMs\);\s*const longitudinalTimeline = new LongitudinalInputTimeline\(\s*startTimeMs,?\s*\);/,
      `const steeringTimeline = new SteeringInputTimeline(startTimeMs);\n      const longitudinalTimeline = new LongitudinalInputTimeline(\n        startTimeMs,\n      );\n      const steeringPositionTimeline = new SteeringPositionTimeline(startTimeMs);`,
      "CleanBrowserHost timeline insertion",
    );
    clean = replaceOnce(
      clean,
      "      const clock = new FixedStepClock(startTimeMs, {",
      `      if (options.steeringJoystick !== undefined) {\n        const steeringJoystick = new PointerSteeringJoystickAdapter({\n          windowTarget: options.windowTarget,\n          documentTarget: options.documentTarget,\n          target: options.steeringJoystick,\n          timeline: steeringPositionTimeline,\n          now: options.now,\n          isDocumentHidden: options.isDocumentHidden,\n          ...(options.onSteeringJoystickStateChange === undefined\n            ? {}\n            : { onStateChange: options.onSteeringJoystickStateChange }),\n        });\n        resources.defer(\n          "pointer steering joystick adapter",\n          () => steeringJoystick.dispose(),\n        );\n      }\n\n      const clock = new FixedStepClock(startTimeMs, {`,
      "CleanBrowserHost joystick adapter insertion",
    );
    clean = replaceRegexOnce(
      clean,
      /const steering = steeringTimeline\.consumeInterval\(\s*step\.startTimeMs,\s*step\.endTimeMs,?\s*\);\s*const longitudinal = longitudinalTimeline\.consumeInterval/,
      `const digitalSteering = steeringTimeline.consumeInterval(\n                step.startTimeMs,\n                step.endTimeMs,\n              );\n              const positionSteering = steeringPositionTimeline.consumeInterval(\n                step.startTimeMs,\n                step.endTimeMs,\n              );\n              const steering =\n                digitalSteering.command.mode !== "RELEASE" ||\n                  positionSteering.command.mode === "RELEASE"\n                  ? digitalSteering\n                  : { ...digitalSteering, command: positionSteering.command };\n              const longitudinal = longitudinalTimeline.consumeInterval`,
      "CleanBrowserHost steering mixer",
    );
    clean = replaceRegexOnce(
      clean,
      /steeringTimeline\.skipInterval\(\s*dropped\.startTimeMs,\s*dropped\.endTimeMs,?\s*\);\s*longitudinalTimeline\.skipInterval/,
      `steeringTimeline.skipInterval(\n                dropped.startTimeMs,\n                dropped.endTimeMs,\n              );\n              steeringPositionTimeline.skipInterval(\n                dropped.startTimeMs,\n                dropped.endTimeMs,\n              );\n              longitudinalTimeline.skipInterval`,
      "CleanBrowserHost dropped-interval mixer",
    );
    payload.modules[cleanKey] = clean;

    let f4 = payload.modules[f4Key];
    f4 = replaceOnce(
      f4,
      "        onStep: (step, steering, longitudinal) => {",
      `        ...(options.steeringJoystick === undefined\n          ? {}\n          : { steeringJoystick: options.steeringJoystick }),\n        ...(options.onSteeringJoystickStateChange === undefined\n          ? {}\n          : {\n              onSteeringJoystickStateChange:\n                options.onSteeringJoystickStateChange,\n            }),\n        onStep: (step, steering, longitudinal) => {`,
      "F4VehicleHost joystick forwarding",
    );
    payload.modules[f4Key] = f4;

    let main = payload.modules[mainKey];
    const oldSteeringMarkup = `          <button type="button" class="mobile-control mobile-control-steer" data-pointer-control="STEER_LEFT" aria-label="Steer left" aria-pressed="false"><span aria-hidden="true">◀</span><small>LEFT</small></button>\n          <button type="button" class="mobile-control mobile-control-steer" data-pointer-control="STEER_RIGHT" aria-label="Steer right" aria-pressed="false"><span aria-hidden="true">▶</span><small>RIGHT</small></button>`;
    const newSteeringMarkup = `          <button hidden aria-hidden="true" tabindex="-1" type="button" class="mobile-control mobile-control-steer" data-pointer-control="STEER_LEFT" aria-label="Steer left" aria-pressed="false"><span aria-hidden="true">◀</span><small>LEFT</small></button>\n          <button hidden aria-hidden="true" tabindex="-1" type="button" class="mobile-control mobile-control-steer" data-pointer-control="STEER_RIGHT" aria-label="Steer right" aria-pressed="false"><span aria-hidden="true">▶</span><small>RIGHT</small></button>\n          <div class="mobile-steering-joystick" data-steering-joystick role="slider" aria-label="Analog steering joystick" aria-valuemin="-100" aria-valuemax="100" aria-valuenow="0" aria-valuetext="CENTER">\n            <span class="mobile-steering-axis" aria-hidden="true">\n              <span class="mobile-steering-thumb"></span>\n            </span>\n            <small>STEER</small>\n          </div>`;
    main = replaceOnce(main, oldSteeringMarkup, newSteeringMarkup, "main joystick markup");
    main = replaceOnce(
      main,
      `const debugPanel = requireElement("[data-debug-panel]");`,
      `const debugPanel = requireElement("[data-debug-panel]");\nconst steeringJoystick = requireElement("[data-steering-joystick]");`,
      "main joystick target",
    );
    main = replaceOnce(
      main,
      "function setDebugPanelOpen(open) {",
      `function setSteeringJoystickState(value, active) {\n  const normalized = Math.max(-1, Math.min(1, value));\n  steeringJoystick.style.setProperty(\n    "--steering-x",\n    \`${"${(-normalized * 34).toFixed(2)}"}%\`,\n  );\n  steeringJoystick.toggleAttribute("data-active", active);\n  steeringJoystick.setAttribute(\n    "aria-valuenow",\n    String(Math.round(normalized * 100)),\n  );\n  const magnitude = Math.round(Math.abs(normalized) * 100);\n  steeringJoystick.setAttribute(\n    "aria-valuetext",\n    normalized > 0\n      ? \`LEFT ${"${magnitude}"}%\`\n      : normalized < 0\n        ? \`RIGHT ${"${magnitude}"}%\`\n        : "CENTER",\n  );\n}\n\nfunction setDebugPanelOpen(open) {`,
      "main joystick state renderer",
    );
    main = replaceOnce(
      main,
      "  resetPointerControlStates();",
      "  resetPointerControlStates();\n  setSteeringJoystickState(0, false);",
      "main joystick reset",
    );
    main = replaceOnce(
      main,
      "      onPointerControlStateChange: setPointerControlState,",
      "      onPointerControlStateChange: setPointerControlState,\n      steeringJoystick,\n      onSteeringJoystickStateChange: setSteeringJoystickState,",
      "main joystick host wiring",
    );
    payload.modules[mainKey] = main;
  }

  async function start() {
    setBoot("Loading validated JV runtime…");
    const payload = await loadBasePayload();
    await applyPass2(payload);
    setBoot("Applying Camera 1B…");
    await applyCameraPatch(payload);
    setBoot("Applying Analog Steering V1…");
    await applyJoystickPatch(payload);

    const style = document.createElement("style");
    style.setAttribute("data-jv-joystick-source-style", "");
    style.textContent = payload.css;
    document.head.append(style);

    const mobile = document.createElement("link");
    mobile.rel = "stylesheet";
    mobile.href = new URL("jv-live-mobile.css", document.baseURI).href;
    mobile.setAttribute("data-jv-public-mobile-overlay", "");
    document.head.append(mobile);

    const joystickCss = document.createElement("link");
    joystickCss.rel = "stylesheet";
    joystickCss.href = new URL("joystick-test/joystick.css?v=d80d4636", document.baseURI).href;
    joystickCss.setAttribute("data-jv-joystick-overlay", "");
    document.head.append(joystickCss);

    const imports = { ...payload.external };
    const objectUrls = [];
    for (const [specifier, source] of Object.entries(payload.modules)) {
      if (typeof source !== "string") {
        throw new Error(`Invalid module source for ${specifier}.`);
      }
      const objectUrl = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
      objectUrls.push(objectUrl);
      imports[specifier] = objectUrl;
    }

    const importMap = document.createElement("script");
    importMap.type = "importmap";
    importMap.textContent = JSON.stringify({ imports });
    document.head.append(importMap);

    setBoot("Starting Analog Steering V1…");
    const entry = document.createElement("script");
    entry.type = "module";
    entry.textContent = `import ${JSON.stringify(payload.entry)};`;
    document.body.append(entry);

    const hideBoot = () => {
      const joystick = document.querySelector("[data-steering-joystick]");
      const scene = document.querySelector("[data-scene]");
      if (joystick !== null && scene !== null) {
        if (boot instanceof HTMLElement) boot.hidden = true;
        if (badge instanceof HTMLElement) {
          badge.textContent = "ANALOG STEERING V1 · POSITION";
        }
        return true;
      }
      return false;
    };
    if (!hideBoot()) {
      const observer = new MutationObserver(() => {
        if (hideBoot()) observer.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
      window.setTimeout(() => observer.disconnect(), 15_000);
    }

    window.addEventListener("pagehide", () => {
      for (const objectUrl of objectUrls) URL.revokeObjectURL(objectUrl);
    }, { once: true });
  }

  start().catch((error) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    setBoot(`JOYSTICK TEST BOOT FAILED\n${message}`);
    if (badge instanceof HTMLElement) {
      badge.textContent = "ANALOG STEERING V1 · FAILED";
    }
    console.error("JV ANALOG STEERING V1 BOOT FAILED", error);
  });
})();
