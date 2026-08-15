(() => {
  const SOURCE_COMMIT = "7c18d04d503a1a0f4262434220378b70aa92c489";
  const SOURCE_TREE = "32f3cc4763c79ac6c5fd9b3812b7a6d6874b557b";
  const BASE_TREE = "a7f7e643a94b2e4cffc911032878031f3428551d";
  const BASE_PAYLOAD_SHA256 = "9c05c1fb1377dd5f78a75dca9d1e879d2f49c9f9af2867cce9f2eb1aaea1d86a";
  const BASE_PART_COUNT = 24;
  const BASE_BASE64_CHARS = 142136;
  const PATCH_SHA256 = "8ca5180bdc6eeea950ebe569f855c9efa4bccb7606ca7d074c8390b99ed0b3ec";
  const PATCH_PART_COUNT = 4;
  const PATCH_BASE64_CHARS = 19084;
  const DEFAULTS = {
    jvSpawn: "scan",
    jvPerfHud: "1",
    jvRenderScale: "1",
  };

  const url = new URL(window.location.href);
  let changed = false;
  for (const [key, value] of Object.entries(DEFAULTS)) {
    if (!url.searchParams.has(key)) {
      url.searchParams.set(key, value);
      changed = true;
    }
  }
  if (changed) window.history.replaceState(null, "", url.href);

  globalThis.__JV_BUILD_SOURCE_COMMIT__ = SOURCE_COMMIT;
  globalThis.__JV_BUILD_SOURCE_MARKER__ = `JV_BUILD_SOURCE:${SOURCE_COMMIT}`;
  globalThis.__JV_PERF_TEST_TRANSPORT__ = Object.freeze({
    sourceCommit: SOURCE_COMMIT,
    sourceTree: SOURCE_TREE,
    baseTree: BASE_TREE,
    basePayloadSha256: BASE_PAYLOAD_SHA256,
    patchSha256: PATCH_SHA256,
    kind: "NONCANONICAL_NATIVE_ESM_PASS2_OBSERVABILITY_GATE",
  });

  const boot = document.querySelector("[data-test-boot]");
  const setBoot = (text) => {
    if (boot instanceof HTMLElement) boot.textContent = text;
  };
  const hideBootWhenHudIsReady = () => {
    if (!(boot instanceof HTMLElement)) return;
    const hide = () => {
      if (document.querySelector("[data-jv-perf-hud]") !== null) {
        boot.hidden = true;
        return true;
      }
      return false;
    };
    if (hide()) return;
    const observer = new MutationObserver(() => {
      if (hide()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 15_000);
  };

  async function sha256Hex(bytes) {
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0")
    ).join("");
  }

  async function loadBase64Parts(prefix, count, expectedChars) {
    const urls = Array.from({ length: count }, (_, index) =>
      new URL(`${prefix}-${String(index).padStart(2, "0")}.b64`, window.location.href),
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
      throw new Error(`Device-gate ${prefix} base64 length mismatch: ${encoded.length}.`);
    }
    const decoded = atob(encoded);
    return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
  }

  async function decodeVerifiedGzip(bytes, expectedSha, label) {
    const actualSha = await sha256Hex(bytes.buffer);
    if (actualSha !== expectedSha) {
      throw new Error(`${label} SHA-256 mismatch: ${actualSha}.`);
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return JSON.parse(await new Response(stream).text());
  }

  async function load() {
    if (typeof DecompressionStream !== "function") {
      throw new Error("This Chrome build does not expose DecompressionStream(gzip).");
    }

    setBoot("Loading grounded A+B+C payload…");
    const baseBytes = await loadBase64Parts("payload", BASE_PART_COUNT, BASE_BASE64_CHARS);
    const payload = await decodeVerifiedGzip(baseBytes, BASE_PAYLOAD_SHA256, "Base payload");
    if (
      payload?.schema !== "JV_WEB_PERF_FOUNDATION_NATIVE_ESM_PAYLOAD_V1" ||
      payload?.source?.tree !== BASE_TREE ||
      typeof payload?.entry !== "string" ||
      typeof payload?.css !== "string" ||
      typeof payload?.modules !== "object" || payload.modules === null ||
      typeof payload?.external !== "object" || payload.external === null
    ) {
      throw new Error("Base performance payload contract mismatch.");
    }

    setBoot("Applying Pass 2 observability patch…");
    const patchBytes = await loadBase64Parts("pass2-patch", PATCH_PART_COUNT, PATCH_BASE64_CHARS);
    const patch = await decodeVerifiedGzip(patchBytes, PATCH_SHA256, "Pass 2 patch");
    if (
      patch?.schema !== "JV_WEB_PERF_FOUNDATION_NATIVE_ESM_PATCH_V1" ||
      patch?.baseTree !== BASE_TREE ||
      patch?.target?.tree !== SOURCE_TREE ||
      typeof patch?.modules !== "object" || patch.modules === null
    ) {
      throw new Error("Pass 2 observability patch contract mismatch.");
    }
    Object.assign(payload.modules, patch.modules);
    payload.source = patch.target;

    const style = document.createElement("style");
    style.setAttribute("data-jv-test-source-style", "");
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

    setBoot("Starting JV Pass 2 observability…");
    hideBootWhenHudIsReady();
    const moduleEntry = document.createElement("script");
    moduleEntry.type = "module";
    moduleEntry.textContent = `import ${JSON.stringify(payload.entry)};`;
    document.body.append(moduleEntry);

    window.addEventListener("pagehide", () => {
      for (const objectUrl of objectUrls) URL.revokeObjectURL(objectUrl);
    }, { once: true });
  }

  load().catch((error) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    setBoot(`PERF TEST BOOT FAILED\n${message}`);
    if (boot instanceof HTMLElement) boot.hidden = false;
    console.error("JV PERF TEST BOOT FAILED", error);
  });
})();