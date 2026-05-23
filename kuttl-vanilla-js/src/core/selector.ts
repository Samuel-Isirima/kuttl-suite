import type { SelectedElement, InterceptConfig } from "../types/index";

const RELEVANT_COMPUTED_PROPS = [
  "display", "position", "color", "background-color",
  "font-size", "font-weight", "font-family",
  "padding", "margin", "width", "height",
  "border", "border-radius", "opacity",
  "flex-direction", "grid-template-columns",
  "z-index", "overflow",
];

function inferDescription(el: Element, descAttr: string): string {
  const explicit = el.getAttribute(descAttr);
  if (explicit) return explicit;
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel) return ariaLabel;
  const text = el.textContent?.trim().slice(0, 60);
  if (text && text.length < 60 && !text.includes("\n")) return `"${text}"`;
  if (el.id) return `#${el.id}`;
  return `<${el.tagName.toLowerCase()}>`;
}

function captureComputedStyles(el: Element): Record<string, string> {
  const computed = window.getComputedStyle(el);
  const result: Record<string, string> = {};
  for (const prop of RELEVANT_COMPUTED_PROPS) {
    const value = computed.getPropertyValue(prop);
    if (value) result[prop] = value;
  }
  return result;
}

// ─
// Pinned selection — CSS class based, scrolls with the element
// ─

const PIN_CLASS = "__ctf_pinned__";
const PIN_STYLE_ID = "__ctf_pin_style__";

function ensurePinStyle(): void {
  if (document.getElementById(PIN_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = PIN_STYLE_ID;
  style.textContent = `
    .${PIN_CLASS} {
      outline: 2px solid #3a8a3a !important;
      outline-offset: 1px !important;
      box-shadow: 0 0 0 4px rgba(58,138,58,0.08) !important;
    }
  `;
  document.head.appendChild(style);
}

function pinElement(el: Element): void {
  clearPin();
  el.classList.add(PIN_CLASS);
}

function clearPin(): void {
  console.log('clear pin called')
  document.querySelectorAll(`.${PIN_CLASS}`).forEach(el =>
    el.classList.remove(PIN_CLASS)
  );
}

// ─
// Hover overlay — kept only for mouseover feedback, not for pinned state
// ─

let overlayEl: HTMLElement | null = null;
let labelEl:   HTMLElement | null = null;

function createOverlay(): void {
  if (overlayEl) return;
  overlayEl = document.createElement("div");
  overlayEl.id = "__icp_select_overlay__";
  Object.assign(overlayEl.style, {
    position: "fixed",
    pointerEvents: "none",
    zIndex: "2147483638",
    border: "2px solid #3a8a3a",
    background: "rgba(58,138,58,0.06)",
    display: "none",
    boxSizing: "border-box"
  });
  labelEl = document.createElement("div");
  Object.assign(labelEl.style, {
    position: "absolute", top: "-22px", left: "0", background: "#3a8a3a",
    color: "#fff", fontSize: "10px", padding: "2px 6px"
  });
  overlayEl.appendChild(labelEl);
  document.body.appendChild(overlayEl);
}

function showOverlay(el: Element): void {
  if (!overlayEl || !labelEl) return;
  const rect = el.getBoundingClientRect();
  Object.assign(overlayEl.style, {
    display: "block",
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`
  });
  labelEl.style.top = rect.top < 25 ? "0" : "-22px";
  labelEl.textContent = `${el.tagName.toLowerCase()}#${el.getAttribute("data-uid") ?? "?"}`;
}

function hideOverlay(): void {
  if (overlayEl) overlayEl.style.display = "none";
}

export interface SelectorHandle {
  enable(): void;
  disable(): void;
  isEnabled(): boolean;
  getSelected(): SelectedElement | null;
  clearSelected(): void;
}

export function createSelector(
  root: Element,
  config: Required<Pick<InterceptConfig, "uidAttribute" | "descriptionAttribute" | "onSelect">>
): SelectorHandle {
  let enabled = false;
  let selected: SelectedElement | null = null;
  let hoveredEl: Element | null = null;

  ensurePinStyle();
  createOverlay();

  function repaint() {
    if (hoveredEl) showOverlay(hoveredEl);
  }

  function onMouseOver(e: MouseEvent) {
    if (!enabled) return;
    const target = (e.target as Element).closest(`[${config.uidAttribute}]`);
    if (!target || !root.contains(target)) {
      hoveredEl = null;
      hideOverlay();
      return;
    }
    hoveredEl = target;
    showOverlay(target);
  }

  function onClick(e: MouseEvent) {
    if (!enabled) return;
    const target = (e.target as Element).closest(`[${config.uidAttribute}]`);
    if (!target) return;
    e.preventDefault();
    e.stopPropagation();

    pinElement(target);

    selected = {
      uid: target.getAttribute(config.uidAttribute)!,
      tag: target.tagName.toLowerCase(),
      description: inferDescription(target, config.descriptionAttribute),
      computedStyles: captureComputedStyles(target),
      rect: target.getBoundingClientRect(),
      classes: (target.className as string).split(" ").filter(Boolean),
    };

    handle.disable();
    config.onSelect(selected);
  }

  const handle: SelectorHandle = {
    enable() {
      enabled = true;
      root.addEventListener("mouseover", onMouseOver as any, true);
      root.addEventListener("click", onClick as any, true);
      window.addEventListener("scroll", repaint, { passive: true, capture: true });
      document.body.style.cursor = "crosshair";
    },
    disable() {
      enabled = false;
      root.removeEventListener("mouseover", onMouseOver as any, true);
      root.removeEventListener("click", onClick as any, true);
      window.removeEventListener("scroll", repaint, true);
      document.body.style.cursor = "";
      hideOverlay(); // always hide hover overlay on disable
    },
    isEnabled: () => enabled,
    getSelected: () => selected,
    clearSelected: () => {
      selected = null;
      clearPin();
      hideOverlay();
    },
  };
  return handle;
}