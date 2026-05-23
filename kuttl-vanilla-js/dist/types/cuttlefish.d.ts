/**
 * Cuttlefish — standalone entry point
 *
 * Developer usage:
 *
 *   <script src="cuttlefish.iife"></script>
 *   <script>
 *     Cuttlefish.init({
 *       provider: 'anthropic',
 *       apiKey:   'sk-ant-...',
 *       persistKey: 'my-app',  // optional — enables patch persistence
 *       root: document.getElementById('app'),  // optional, defaults to body
 *     })
 *   </script>
 */
import type { AIProvider } from "./types/index";
export interface CuttlefishInitConfig {
    provider?: AIProvider;
    apiKey?: string;
    model?: string;
    root?: Element;
    persistKey?: string;
    debug?: boolean;
    /** Full AI configuration object (alternative to individual provider/apiKey/model) */
    ai?: import("./types/index").AIProviderConfig;
    /** Website snapshotting configuration */
    snapshot?: {
        enabled?: boolean;
        api?: {
            baseUrl: string;
            apiKey?: string;
            timeout?: number;
        };
        websiteId?: string;
        userId?: string;
        onChanges?: boolean;
        throttleMs?: number;
    };
}
export declare function init(config?: CuttlefishInitConfig): void;
