import * as _React from "react";
// ─────────────────────────────────────────────
// ESM-safe mutable handle on the React module.
//
// `import * as _React` gives a Module Namespace Object whose *binding* is
// immutable (Vite/ESM throws on `_React = ...`), but its *properties* are
// writable at runtime. We need to assign through a reference that TypeScript
// won't validate against React's 20+ createElement overloads, so we cast
// through `unknown` to a minimal interface that only describes the property
// we're replacing. All reads still go through `_React` directly.
// ─────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReactMutable = _React;
// ─────────────────────────────────────────────
// Apply overrides to a React element's props
// ─────────────────────────────────────────────
function applyOverridesToProps(props, uid, index) {
    const override = index.get(uid);
    if (!override)
        return props;
    const next = { ...props };
    // ── Hide ──
    if (override.hidden) {
        const existing = next["style"] ?? {};
        next["style"] = { ...existing, display: "none" };
        return next; // no point applying other overrides to a hidden element
    }
    // ── Restyle ──
    if (override.styles && Object.keys(override.styles).length > 0) {
        const existing = next["style"] ?? {};
        const camel = kebabToCamel(override.styles);
        next["style"] = { ...existing, ...camel };
    }
    // ── AddClass / RemoveClass ──
    if (override.classesToAdd?.length || override.classesToRemove?.length) {
        const current = (next["className"] ?? "").split(" ").filter(Boolean);
        const withAdded = [...current, ...(override.classesToAdd ?? [])];
        const withRemoved = withAdded.filter((c) => !(override.classesToRemove ?? []).includes(c));
        next["className"] = [...new Set(withRemoved)].join(" ");
    }
    // ── SetText ──
    // We handle setText by replacing the children with the patched text.
    // This only works cleanly when the element has a single text child.
    // If the element has complex children, setText is a no-op in the
    // createElement interceptor — the dev should use useCuttlefish() instead.
    if (override.text !== undefined) {
        next["children"] = override.text;
    }
    return next;
}
// ─────────────────────────────────────────────
// Reorder children by uid order
// ─────────────────────────────────────────────
function applyReorderToChildren(children, uid, uidAttr, index) {
    const override = index.get(uid);
    if (!override?.order?.length)
        return children;
    const order = override.order;
    // Map uid → child element
    const childMap = new Map();
    for (const child of children) {
        if (_React.isValidElement(child)) {
            const childUid = child.props[uidAttr];
            if (childUid)
                childMap.set(childUid, child);
        }
    }
    // Build reordered array: listed uids first, then unlisted in original order
    const listedSet = new Set(order);
    const listed = order.map((u) => childMap.get(u)).filter(Boolean);
    const unlisted = children.filter((c) => {
        if (!_React.isValidElement(c))
            return true;
        const cUid = c.props[uidAttr];
        return !cUid || !listedSet.has(cUid);
    });
    return [...listed, ...unlisted];
}
// ─────────────────────────────────────────────
// Install / uninstall
// ─────────────────────────────────────────────
let _original = null;
let _installed = false;
/**
 * installInterceptor
 *
 * Replaces React.createElement with a patching version.
 * Must be called before the React tree renders.
 * The interceptor is stateless — it reads from the index ref on every call.
 *
 * @param indexRef  A ref-like object whose `.current` holds the latest OverrideIndex.
 *                  We use a ref rather than closing over the index directly so that
 *                  when patches change and a new index is built, the interceptor
 *                  automatically sees the update without needing to be re-installed.
 * @param uidAttr   The data attribute name used for uids (default: 'data-uid')
 */
export function installInterceptor(indexRef, uidAttr = "data-uid") {
    if (_installed) {
        // Already installed — updates happen automatically via indexRef.current
        return;
    }
    _original = _React.createElement.bind(_React);
    _installed = true;
    // We assign through ReactMutable so TypeScript does not attempt to verify
    // our simplified `...args` signature against React's 20+ overloads.
    // The cast through `unknown` above is what makes this assignment legal.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ReactMutable.createElement = function patchedCreateElement(...args) {
        const [type, props, ...children] = args;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const original = _original;
        if (typeof type !== "string" || !props) {
            return original(type, props, ...children);
        }
        const uid = props[uidAttr];
        if (!uid) {
            return original(type, props, ...children);
        }
        const index = indexRef.current;
        const patchedProps = applyOverridesToProps(props, uid, index);
        const flatChildren = children.flat();
        const reorderedChildren = applyReorderToChildren(flatChildren, uid, uidAttr, index);
        return original(type, patchedProps, ...reorderedChildren);
    };
}
/**
 * uninstallInterceptor
 *
 * Restores the original React.createElement.
 * Call this on cleanup (e.g. when CuttlefishProvider unmounts in tests).
 */
export function uninstallInterceptor() {
    if (!_installed || !_original)
        return;
    ReactMutable.createElement = _original;
    _original = null;
    _installed = false;
}
// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
/**
 * Converts a CSS kebab-case property map to camelCase for React's style prop.
 * e.g. { "font-size": "18px" } → { fontSize: "18px" }
 */
function kebabToCamel(styles) {
    const result = {};
    for (const [key, value] of Object.entries(styles)) {
        const camel = key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camel] = value;
    }
    return result;
}
//# sourceMappingURL=interceptor.js.map