// ─────────────────────────────────────────────
// Backend API Integration
// ─────────────────────────────────────────────

import type { WebsiteSnapshot, SnapshotDiff } from "../types/serialization";

export interface APIConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
}

export interface SnapshotAPIResponse {
  success: boolean;
  snapshotId?: string;
  error?: string;
}

export interface EmbeddingAPIResponse {
  success: boolean;
  embeddingId?: string;
  error?: string;
}

export class SnapshotAPI {
  private config: Required<APIConfig>;

  constructor(config: APIConfig) {
    this.config = {
      baseUrl: config.baseUrl.replace(/\/$/, ''), // Remove trailing slash
      apiKey: config.apiKey || '',
      timeout: config.timeout || 10000,
    };
  }

  async createSnapshot(snapshot: WebsiteSnapshot): Promise<SnapshotAPIResponse> {
    console.log("[SnapshotAPI DEBUG] createSnapshot called with:", snapshot);
    
    try {
      // Transform the snapshot to match Go API expectations
      const apiPayload = {
        website_id: snapshot.metadata.websiteId,
        session_id: snapshot.metadata.sessionId,
        version: snapshot.metadata.version,
        components: snapshot.components,
        styles: snapshot.styles,
        layout: snapshot.layout,
        customizations: snapshot.userCustomizations, // rename userCustomizations -> customizations
        metadata: snapshot.metadata,
        
        // Prompt context fields (flatten from promptContext if present)
        prompt_text: snapshot.promptContext?.promptText || '',
        prompt_type: snapshot.promptContext?.promptType || '',
        selected_element_uid: snapshot.promptContext?.selectedElementUID || '',
        page_url: snapshot.promptContext?.pageUrl || '',
        user_agent: snapshot.promptContext?.userAgent || '',
        trigger_type: snapshot.promptContext?.triggerType || 'manual',
      };
      
      console.log("[SnapshotAPI DEBUG] Transformed payload:", apiPayload);
      console.log("[SnapshotAPI DEBUG] Making request to:", `${this.config.baseUrl}/api/snapshots`);
      const response = await this.makeRequest('/api/snapshots', {
        method: 'POST',
        body: JSON.stringify(apiPayload),
      });

      console.log("[SnapshotAPI DEBUG] Response received:", {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[SnapshotAPI DEBUG] Request failed:", errorData);
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      console.log("[SnapshotAPI DEBUG] Success response data:", data);
      return {
        success: true,
        snapshotId: data.id,
      };
    } catch (error) {
      console.error("[SnapshotAPI DEBUG] Request error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  async createDiff(diff: SnapshotDiff): Promise<SnapshotAPIResponse> {
    try {
      const response = await this.makeRequest('/api/snapshots/diff', {
        method: 'POST',
        body: JSON.stringify(diff),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        snapshotId: data.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  async generateEmbeddings(snapshotId: string): Promise<EmbeddingAPIResponse> {
    try {
      const response = await this.makeRequest(`/api/snapshots/${snapshotId}/embeddings`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        embeddingId: data.embeddingId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit): Promise<Response> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    
    if (this.config.apiKey) {
      headers.set('Authorization', `Bearer ${this.config.apiKey}`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}

// Utility function to generate website and user IDs automatically
export function generateWebsiteId(): string {
  // Use hostname + pathname for consistent website identification
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;
  return `${hostname}${pathname === '/' ? '' : pathname}`;
}

export function generateUserId(): string {
  // Try to get user ID from various sources
  const sources = [
    // Check our own stored user ID first
    () => localStorage.getItem('kuttl_user_id'),
    
    // Common user ID storage locations
    () => localStorage.getItem('userId'),
    () => localStorage.getItem('user_id'), 
    () => sessionStorage.getItem('userId'),
    () => sessionStorage.getItem('user_id'),
    
    // Try to get from common auth tokens
    () => {
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        if (token && token.includes('.')) {
          const parts = token.split('.');
          if (parts.length >= 2 && parts[1]) {
            const payload = JSON.parse(atob(parts[1]));
            return payload.sub || payload.userId || payload.id;
          }
        }
      } catch (e) {
        // Ignore token parsing errors
      }
      return null;
    },

    // Generate anonymous ID and persist it
    () => {
      const anonymousId = 'anon_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem('kuttl_user_id', anonymousId);
      return anonymousId;
    }
  ];

  for (const source of sources) {
    const id = source();
    if (id) return id;
  }

  // Fallback - should never reach here
  return 'anonymous';
}