import type { OverrideIndex } from "../types/index.js";
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
export declare function installInterceptor(indexRef: {
    current: OverrideIndex;
}, uidAttr?: string): void;
/**
 * uninstallInterceptor
 *
 * Restores the original React.createElement.
 * Call this on cleanup (e.g. when CuttlefishProvider unmounts in tests).
 */
export declare function uninstallInterceptor(): void;
