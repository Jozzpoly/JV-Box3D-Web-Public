const PREVIEW_OVERLAY_SOURCE =
  "4cda838ea57d2716f3ff86db1c2865cc03ee06d4";
const SCROLL_EPSILON_PX = 2;

function installDrawerPolishOverlay() {
  const toolbar = document.querySelector("[data-product-controls]");
  const toggle = document.querySelector("[data-utility-drawer-toggle]");
  if (!(toolbar instanceof HTMLElement) || !(toggle instanceof HTMLButtonElement)) {
    return false;
  }
  if (toolbar.hasAttribute("data-p13-1-polish-overlay-installed")) {
    return true;
  }

  let scroller = toolbar.querySelector("[data-utility-drawer-scroll]");
  if (!(scroller instanceof HTMLElement)) {
    scroller = document.createElement("div");
    scroller.className = "utility-drawer-scroll";
    scroller.setAttribute("data-utility-drawer-scroll", "");
    while (toolbar.firstChild !== null) {
      scroller.append(toolbar.firstChild);
    }
    toolbar.append(scroller);
  }

  const oldChevron = toggle.querySelector(".utility-drawer-chevron");
  if (oldChevron !== null && oldChevron.tagName.toLowerCase() !== "svg") {
    const chevron = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );
    chevron.classList.add("utility-drawer-chevron");
    chevron.setAttribute("viewBox", "0 0 24 24");
    chevron.setAttribute("aria-hidden", "true");
    const path = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    path.setAttribute("d", "M6.5 9 12 14.5 17.5 9");
    chevron.append(path);
    oldChevron.replaceWith(chevron);
  }

  function syncScrollAffordance() {
    const maxScrollLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    toolbar.toggleAttribute(
      "data-utility-scroll-left",
      maxScrollLeft > SCROLL_EPSILON_PX &&
        scroller.scrollLeft > SCROLL_EPSILON_PX,
    );
    toolbar.toggleAttribute(
      "data-utility-scroll-right",
      maxScrollLeft > SCROLL_EPSILON_PX &&
        scroller.scrollLeft < maxScrollLeft - SCROLL_EPSILON_PX,
    );
  }

  const resizeObserver = typeof ResizeObserver === "function"
    ? new ResizeObserver(syncScrollAffordance)
    : null;
  scroller.addEventListener("scroll", syncScrollAffordance, { passive: true });
  resizeObserver?.observe(scroller);
  const content = scroller.firstElementChild;
  if (content instanceof HTMLElement) {
    resizeObserver?.observe(content);
  }

  toolbar.setAttribute("data-p13-1-polish-overlay-installed", "");
  document.documentElement.dataset.jvPreviewOverlay = PREVIEW_OVERLAY_SOURCE;
  window.requestAnimationFrame(syncScrollAffordance);

  window.addEventListener(
    "pagehide",
    () => {
      scroller.removeEventListener("scroll", syncScrollAffordance);
      resizeObserver?.disconnect();
    },
    { once: true },
  );

  return true;
}

if (!installDrawerPolishOverlay()) {
  const observer = new MutationObserver(() => {
    if (installDrawerPolishOverlay()) {
      observer.disconnect();
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("pagehide", () => observer.disconnect(), { once: true });
}
