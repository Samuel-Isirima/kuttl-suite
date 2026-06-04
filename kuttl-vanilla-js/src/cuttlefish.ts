/**
 * Cuttlefish — standalone entry point
 *
 * Developer usage:
 *
 *   <script src="cuttlefish.iife.js" data-website-key="your_hash_key"></script>
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

const API_BASE = 'http://localhost:8080';

// Capture at IIFE execution time — document.currentScript is null after the script finishes loading
const _scriptEl = document.currentScript as HTMLScriptElement | null;
const _websiteKey = _scriptEl?.getAttribute('data-website-key') ?? null;

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
  const icpConfig: import("./types/index").InterceptConfig = {
    debug: config.debug ?? false,
  };

  if (config.root) icpConfig.root = config.root;

  // Website key: script attribute takes precedence over explicit config
  if (_websiteKey) icpConfig.websiteKey = _websiteKey;

  // persistKey: auto-derive from website key so patches survive page refreshes
  // without any client configuration
  icpConfig.persistKey = config.persistKey ??
    (_websiteKey ? `kuttl_${_websiteKey.slice(0, 8)}` : `kuttl_${window.location.hostname}`);

  const apiBaseUrl = API_BASE;

  // Snapshot: auto-enable whenever we have a website key and know where the API is
  const snapshotBase = config.snapshot ?? {};
  if (apiBaseUrl) {
    const snap: import("./types/index").InterceptConfig["snapshot"] = {
      enabled:    snapshotBase.enabled   ?? (_websiteKey != null),
      api:        { baseUrl: apiBaseUrl, ...(snapshotBase.api ?? {}) },
      onChanges:  snapshotBase.onChanges ?? true,
      throttleMs: snapshotBase.throttleMs ?? 5000,
    };
    if (snapshotBase.websiteId) snap!.websiteId = snapshotBase.websiteId;
    if (snapshotBase.userId)    snap!.userId    = snapshotBase.userId;
    icpConfig.snapshot = snap;
  } else if (config.snapshot) {
    icpConfig.snapshot = config.snapshot;
  }

  const intercept = interceptInit(icpConfig);
  createCuttlefishUI(intercept, {});
}