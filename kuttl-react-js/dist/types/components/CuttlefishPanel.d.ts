import * as React from "react";
import type { AIProvider } from "../types/index.js";
export interface CuttlefishPanelProps {
    defaultProvider?: AIProvider;
    defaultApiKey?: string;
}
export declare function CuttlefishPanel({ defaultProvider, defaultApiKey, }: CuttlefishPanelProps): React.ReactElement | null;
