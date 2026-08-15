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

  // This device gate is a composed test artifact, not one canonical source tree.
  globalThis.__JV_BUILD_SOURCE_COMMIT__ = "DEV";
  globalThis.__JV_BUILD_SOURCE_MARKER__ = `JV_CAMERA_GATE:${CAMERA_CANDIDATE_COMMIT}`;
  globalThis.__JV_CAMERA_DEVICE_GATE__ = Object.freeze({
    kind: "NONCANONICAL_CAMERA_1B_PATCH_GATE_V2",
    baseTree: BASE_TREE,
    pass2Tree: PASS2_TARGET_TREE,
    cameraCandidateCommit: CAMERA_CANDIDATE_COMMIT,
    cameraCandidateTree: CAMERA_CANDIDATE_TREE,
    privateRemoteBase: PRIVATE_REMOTE_BASE,
    cameraPatchSha256: CAMERA_PATCH_SHA256,
  });

  const boot = document.querySelector("[data-camera-gate-boot]");
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

  async function start() {
    setBoot("Loading validated JV runtime…");
    const payload = await loadBasePayload();
    await applyPass2(payload);
    setBoot("Applying Camera 1B…");
    await applyCameraPatch(payload);

    const style = document.createElement("style");
    style.setAttribute("data-jv-camera-source-style", "");
    style.textContent = payload.css;
    document.head.append(style);

    const mobile = document.createElement("link");
    mobile.rel = "stylesheet";
    mobile.href = new URL("jv-live-mobile.css", document.baseURI).href;
    mobile.setAttribute("data-jv-public-mobile-overlay", "");
    document.head.append(mobile);

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

    setBoot("Starting Camera 1B…");
    const entry = document.createElement("script");
    entry.type = "module";
    entry.textContent = `import ${JSON.stringify(payload.entry)};`;
    document.body.append(entry);

    const hideBoot = () => {
      if (document.querySelector("[data-scene]") !== null) {
        if (boot instanceof HTMLElement) boot.hidden = true;
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
    setBoot(`CAMERA TEST BOOT FAILED\n${message}`);
    console.error("JV CAMERA 1B BOOT FAILED", error);
  });
})();
