(() => {
  const SOURCE_COMMIT = "1a3a526007bf4a5042f0a003fbb5ae9928f811ac";
  const SOURCE_TREE = "a7f7e643a94b2e4cffc911032878031f3428551d";
  const PAYLOAD_SHA256 = "9c05c1fb1377dd5f78a75dca9d1e879d2f49c9f9af2867cce9f2eb1aaea1d86a";
  const PAYLOAD_PART_COUNT = 24;
  const PAYLOAD_BASE64_CHARS = 142136;
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

  // Classic-script globals intentionally provide the same free identifiers
  // normally injected by Vite in the canonical build.
  globalThis.__JV_BUILD_SOURCE_COMMIT__ = SOURCE_COMMIT;
  globalThis.__JV_BUILD_SOURCE_MARKER__ = `JV_BUILD_SOURCE:${SOURCE_COMMIT}`;
  globalThis.__JV_PERF_TEST_TRANSPORT__ = Object.freeze({
    sourceCommit: SOURCE_COMMIT,
    sourceTree: SOURCE_TREE,
    payloadSha256: PAYLOAD_SHA256,
    kind: "NONCANONICAL_NATIVE_ESM_DEVICE_GATE",
  });

  const boot = document.querySelector("[data-test-boot]");
  const setBoot = (text) => {
    if (boot instanceof HTMLElement) boot.textContent = text;
  };

  async function sha256Hex(bytes) {
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0")
    ).join("");
  }

  async function load() {
    if (typeof DecompressionStream !== "function") {
      throw new Error("This Chrome build does not expose DecompressionStream(gzip).");
    }
    setBoot("Loading performance test payload…");
    const partUrls = Array.from({ length: PAYLOAD_PART_COUNT }, (_, index) =>
      new URL(`payload-${String(index).padStart(2, "0")}.b64`, window.location.href),
    );
    const parts = await Promise.all(partUrls.map(async (partUrl) => {
      const response = await fetch(partUrl, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Performance payload part fetch failed: HTTP ${response.status} ${partUrl.pathname}.`);
      }
      return (await response.text()).trim();
    }));
    const encoded = parts.join("");
    if (encoded.length !== PAYLOAD_BASE64_CHARS) {
      throw new Error(`Performance payload base64 length mismatch: ${encoded.length}.`);
    }
    const decoded = atob(encoded);
    const compressedBytes = Uint8Array.from(decoded, (character) => character.charCodeAt(0));
    const compressed = compressedBytes.buffer;
    const actualSha = await sha256Hex(compressed);
    if (actualSha !== PAYLOAD_SHA256) {
      throw new Error(`Performance payload SHA-256 mismatch: ${actualSha}.`);
    }
    const stream = new Blob([compressed]).stream().pipeThrough(
      new DecompressionStream("gzip"),
    );
    const payload = JSON.parse(await new Response(stream).text());
    if (
      payload?.schema !== "JV_WEB_PERF_FOUNDATION_NATIVE_ESM_PAYLOAD_V1" ||
      payload?.source?.tree !== SOURCE_TREE ||
      typeof payload?.entry !== "string" ||
      typeof payload?.css !== "string" ||
      typeof payload?.modules !== "object" ||
      payload.modules === null ||
      typeof payload?.external !== "object" ||
      payload.external === null
    ) {
      throw new Error("Performance payload contract mismatch.");
    }

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
      const objectUrl = URL.createObjectURL(
        new Blob([source], { type: "text/javascript" }),
      );
      objectUrls.push(objectUrl);
      imports[specifier] = objectUrl;
    }

    const importMap = document.createElement("script");
    importMap.type = "importmap";
    importMap.textContent = JSON.stringify({ imports });
    document.head.append(importMap);

    setBoot("Starting JV performance foundation…");
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
    console.error("JV PERF TEST BOOT FAILED", error);
  });
})();
