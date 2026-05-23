import * as React from "react";
import type { CuttlefishContextValue, CuttlefishProviderProps } from "../types/index.js";
export declare function CuttlefishProvider({ children, ai, persistKey, debug, uidAttribute, }: CuttlefishProviderProps): React.ReactElement;
export declare function useCuttlefishContext(): CuttlefishContextValue;
