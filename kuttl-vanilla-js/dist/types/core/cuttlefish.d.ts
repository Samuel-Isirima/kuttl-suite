import type { AIProvider } from "../types/index";
import type { InterceptInstance } from "../index";
export interface CuttlefishConfig {
    provider?: AIProvider;
    apiKey?: string;
    model?: string;
}
export declare function createCuttlefishUI(intercept: InterceptInstance, config?: CuttlefishConfig): void;
