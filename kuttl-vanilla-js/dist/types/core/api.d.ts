import type { WebsiteSnapshot, SnapshotDiff } from "../types/serialization";
export interface APIConfig {
    baseUrl: string;
    apiKey?: string;
    websiteKey?: string;
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
export declare class SnapshotAPI {
    private config;
    constructor(config: APIConfig);
    createSnapshot(snapshot: WebsiteSnapshot): Promise<SnapshotAPIResponse>;
    createDiff(diff: SnapshotDiff): Promise<SnapshotAPIResponse>;
    generateEmbeddings(snapshotId: string): Promise<EmbeddingAPIResponse>;
    private makeRequest;
}
export declare function generateWebsiteId(): string;
export declare function generateUserId(): string;
