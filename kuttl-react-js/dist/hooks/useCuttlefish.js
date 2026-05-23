import * as React from "react";
import { useCuttlefishContext } from "../components/Provider.js";
/**
 * useCuttlefish(uid)
 *
 * Returns resolved overrides for the given uid.
 * Use this when:
 * - Your component has dynamic children and needs opt-in reorder support
 * - You want to apply text overrides to a component that manages its own children
 * - You need to conditionally render based on patch state
 *
 * For simple host elements (div, span, h1 etc.) with data-uid attributes,
 * the createElement interceptor handles restyle/hide/addClass automatically
 * without needing this hook.
 *
 * @example
 * function Navbar({ children }: { children: React.ReactNode[] }) {
 *   const { reorder } = useCuttlefish("navbar")
 *   return <nav data-uid="navbar">{reorder(children)}</nav>
 * }
 */
export function useCuttlefish(uid) {
    const { getOverrides } = useCuttlefishContext();
    const overrides = getOverrides(uid);
    // Convert kebab-case patch styles to React camelCase
    const style = React.useMemo(() => {
        if (!overrides?.styles)
            return {};
        const result = {};
        for (const [key, value] of Object.entries(overrides.styles)) {
            const camel = key.replace(/-([a-z])/g, (_, l) => l.toUpperCase());
            result[camel] = value;
        }
        if (overrides.hidden)
            result["display"] = "none";
        return result;
    }, [overrides]);
    /**
     * reorder — takes an array of React children and returns them in patch-specified order.
     * Children must have data-uid props to be reorderable.
     * Children without data-uid are appended after reordered ones.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function reorder(children) {
        const order = overrides?.order;
        if (!order?.length)
            return children;
        const childMap = new Map();
        for (const child of children) {
            if (React.isValidElement(child)) {
                const props = child.props;
                const childUid = (props["data-uid"] ?? props["dataUid"]);
                if (childUid)
                    childMap.set(childUid, child);
            }
        }
        const listedSet = new Set(order);
        const listed = order.map((u) => childMap.get(u)).filter((c) => c !== undefined);
        const unlisted = children.filter((c) => {
            if (!React.isValidElement(c))
                return true;
            const props = c.props;
            const childUid = (props["data-uid"] ?? props["dataUid"]);
            return !childUid || !listedSet.has(childUid);
        });
        return [...listed, ...unlisted];
    }
    return {
        style,
        addedClasses: overrides?.classesToAdd ?? [],
        removedClasses: overrides?.classesToRemove ?? [],
        hidden: overrides?.hidden ?? false,
        text: overrides?.text,
        reorder,
    };
}
//# sourceMappingURL=useCuttlefish.js.map