import type { UseCuttlefishReturn } from "../types/index.js";
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
export declare function useCuttlefish(uid: string): UseCuttlefishReturn;
