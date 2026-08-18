const PREVIEW_OVERLAY_SOURCE =
  "691544f97b40e3dfd5aed59903c06517441dfa18";
const SCROLL_EPSILON_PX = 2;

function setChoiceActive(button, active) {
  button.classList.toggle("is-active", active);
  button.setAttribute("aria-pressed", String(active));
}

function findOrCreateViewGroup(controls) {
  for (const group of controls.querySelectorAll(".product-control-group")) {
    const label = group.querySelector(".product-control-label");
    if (label?.textContent?.trim() === "Widok") {
      let row = group.querySelector(".product-choice-row");
      if (!(row instanceof HTMLElement)) {
        row = document.createElement("div");
        row.className = "product-choice-row";
        const directChoices = Array.from(group.children).filter(
          (child) => child.classList.contains("product-choice"),
        );
        group.append(row);
        for (const choice of directChoices) {
          row.append(choice);
        }
      }
      return row;
    }
  }

  const group = document.createElement("div");
  group.className = "product-control-group";
  const label = document.createElement("span");
  label.className = "product-control-label";
  label.textContent = "Widok";
  const row = document.createElement("div");
  row.className = "product-choice-row";
  group.append(label, row);
  controls.append(group);
  return row;
}

function installSteeringPlatePreview(toolbar) {
  const scenePanel = document.querySelector(".scene-panel");
  const controls = toolbar.querySelector(".product-controls");
  if (!(scenePanel instanceof HTMLElement) || !(controls instanceof HTMLElement)) {
    return false;
  }

  let button = controls.querySelector("[data-steering-plate-preview]");
  if (!(button instanceof HTMLButtonElement)) {
    button = document.createElement("button");
    button.type = "button";
    button.className = "product-choice";
    button.setAttribute("data-steering-plate-preview", "");
    button.setAttribute("aria-label", "Pokaż lub ukryj tło kierownicy");
    button.title = "Tło kierownicy";
    findOrCreateViewGroup(controls).append(button);
  }

  let visible = new URL(window.location.href).searchParams.get("jvSteeringPlate") !== "0";

  function sync() {
    scenePanel.toggleAttribute("data-steering-plate-hidden", !visible);
    button.textContent = visible ? "Tło kier. ON" : "Tło kier. OFF";
    setChoiceActive(button, visible);
  }

  button.addEventListener("click", () => {
    visible = !visible;
    const url = new URL(window.location.href);
    if (visible) {
      url.searchParams.delete("jvSteeringPlate");
    } else {
      url.searchParams.set("jvSteeringPlate", "0");
    }
    window.history.replaceState(null, "", url.href);
    sync();
  });

  sync();
  return true;
}

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

  if (!installSteeringPlatePreview(toolbar)) {
    return false;
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
