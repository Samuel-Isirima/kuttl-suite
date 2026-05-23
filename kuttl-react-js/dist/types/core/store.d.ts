import type { Patch } from "../types/index.js";
export interface PatchStore {
    add(patch: Patch): void;
    remove(id: string): boolean;
    getAll(): Patch[];
    clear(): void;
    serialize(): string;
    hydrate(json: string): void;
}
export declare function createPatchStore(): PatchStore;
export declare function generatePatchId(): string;
