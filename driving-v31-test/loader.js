(() => {
  const PARTS = 3;
  const BASE64_CHARS = 9428;
  const GZIP_SHA256 = "802ff53ab0a6f57cf9c358244e5dd9249a277f1ace0dd3cfee3ebcaf7f39aaa2";
  const SOURCE_SHA256 = "aaba046436c0227246503ff81df24f1636e3bdb377f25d3f6750eaf84fe493ea";
  const boot = document.querySelector("[data-joystick-gate-boot]");
  const badge = document.querySelector("[data-joystick-gate-badge]");
  const setBoot = (text) => { if (boot instanceof HTMLElement) { boot.hidden = false; boot.textContent = text; } };
  async function sha256Hex(bytes) {
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
  }
  async function start() {
    setBoot("Verifying static Mobile Driving V3.1 runtime…");
    const urls = Array.from({ length: PARTS }, (_, i) => new URL(`driving-v31-test/payload-${String(i).padStart(2,"0")}.b64`, document.baseURI));
    const parts = await Promise.all(urls.map(async url => {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(`V3.1 payload fetch failed: HTTP ${r.status} ${url.pathname}.`);
      return (await r.text()).trim();
    }));
    const encoded = parts.join("");
    if (encoded.length !== BASE64_CHARS) throw new Error(`V3.1 payload length mismatch: ${encoded.length}.`);
    const raw = atob(encoded);
    const gz = Uint8Array.from(raw, c => c.charCodeAt(0));
    const actualGzSha = await sha256Hex(gz.buffer);
    if (actualGzSha !== GZIP_SHA256) throw new Error(`V3.1 gzip SHA mismatch: ${actualGzSha}.`);
    if (typeof DecompressionStream !== "function") throw new Error("This Chrome build does not expose DecompressionStream(gzip).");
    const source = await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
    const actualSourceSha = await sha256Hex(new TextEncoder().encode(source));
    if (actualSourceSha !== SOURCE_SHA256) throw new Error(`V3.1 source SHA mismatch: ${actualSourceSha}.`);
    const script = document.createElement("script");
    script.setAttribute("data-jv-driving-v31-static-runtime", "");
    script.textContent = source;
    document.body.append(script);
  }
  start().catch(error => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    setBoot(`DRIVING V3.1 BOOTSTRAP FAILED\n${message}`);
    if (badge instanceof HTMLElement) badge.textContent = "DRIVING V3.1 · FAILED";
    console.error("JV DRIVING V3.1 BOOTSTRAP FAILED", error);
  });
})();
