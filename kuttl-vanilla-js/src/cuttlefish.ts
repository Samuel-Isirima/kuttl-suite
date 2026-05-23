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

import { init as interceptInit } from "./index";
import { createCuttlefishUI }    from "./core/cuttlefish";
import type { AIProvider }       from "./types/index";

export interface CuttlefishInitConfig {
  provider?:   AIProvider;
  apiKey?:     string;
  model?:      string;
  root?:       Element;
  persistKey?: string;
  debug?:      boolean;
  
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

export function init(config: CuttlefishInitConfig = {}): void {
  // Boot interceptjs
  const icpConfig: import("./types/index").InterceptConfig = {
    debug: config.debug ?? false,
  };
  if (config.root)       icpConfig.root       = config.root;
  if (config.persistKey) icpConfig.persistKey = config.persistKey;
  
  // Handle AI configuration - prefer full ai object over individual properties
  if (config.ai) {
    icpConfig.ai = config.ai;
  } else if (config.apiKey) {
    icpConfig.ai = {
      provider: config.provider ?? "anthropic",
      apiKey:   config.apiKey,
      ...(config.model ? { model: config.model } : {}),
    };
  }
  
  // Pass through snapshot configuration
  if (config.snapshot) {
    icpConfig.snapshot = config.snapshot;
  }
  
  const intercept = interceptInit(icpConfig);

  // Mount the Cuttlefish UI on top
  const uiConfig: import("./core/cuttlefish").CuttlefishConfig = {};
  if (config.provider) uiConfig.provider = config.provider;
  if (config.apiKey)   uiConfig.apiKey   = config.apiKey;
  if (config.model)    uiConfig.model    = config.model;
  createCuttlefishUI(intercept, uiConfig);
}