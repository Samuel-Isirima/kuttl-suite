import type { SelectedElement, InterceptConfig } from "../types/index";
export interface SelectorHandle {
    enable(): void;
    disable(): void;
    isEnabled(): boolean;
    getSelected(): SelectedElement | null;
    clearSelected(): void;
}
export declare function createSelector(root: Element, config: Required<Pick<InterceptConfig, "uidAttribute" | "descriptionAttribute" | "onSelect">>): SelectorHandle;
