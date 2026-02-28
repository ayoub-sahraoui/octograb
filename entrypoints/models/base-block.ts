import { OnErrorStrategy } from "./enums";
import { Block } from "./types";

export interface BaseBlock {
    id: string;
    type: string;
    label?: string;
    enabled?: boolean;
    description?: string;
    onError?: OnErrorStrategy;
    maxRetries?: number;
    retryDelay?: number;
    config: any;
    parent?: Block | null;
    children?: Block[];
    index?: number;
    toJSON(): any;
}