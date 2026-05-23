export function createPatchStore() {
    let patches = [];
    return {
        add(patch) {
            const idx = patches.findIndex((p) => p.id === patch.id);
            if (idx !== -1)
                patches[idx] = patch;
            else
                patches.push(patch);
        },
        remove(id) {
            const before = patches.length;
            patches = patches.filter((p) => p.id !== id);
            return patches.length < before;
        },
        getAll() { return [...patches]; },
        clear() { patches = []; },
        serialize() { return JSON.stringify(patches); },
        hydrate(json) {
            const parsed = JSON.parse(json);
            if (!Array.isArray(parsed))
                throw new Error("[Cuttlefish] hydrate: expected array");
            patches = parsed;
        },
    };
}
export function generatePatchId() {
    return crypto.randomUUID();
}
//# sourceMappingURL=store.js.map