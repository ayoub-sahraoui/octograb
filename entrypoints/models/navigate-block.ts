import { v4 as uuidv4 } from 'uuid';
import { BaseBlock } from './base-block';
import { makeAutoObservable, toJS } from 'mobx';
import { OnErrorStrategy } from "./enums";
import { Block } from './types';

export enum WaitUntilStrategy {
  LOAD = 'load',
  DOM_CONTENT_LOADED = 'domcontentloaded',
  NETWORK_IDLE = 'networkidle',
  TIMEOUT = 'timeout',
}

export enum NavigateBehavior {
  NEW_TAB = 'new_tab',
  SAME_TAB = 'same_tab',
  REPLACE = 'replace',
}

export interface NavigateConfig {
  url: string;
  waitUntil?: WaitUntilStrategy;
  behavior?: NavigateBehavior;
  timeout?: number;
}

export class NavigateBlock implements BaseBlock {
  id: string;
  type: string = 'navigate';
  label?: string;
  enabled?: boolean;
  description?: string;
  onError?: OnErrorStrategy;
  maxRetries?: number;
  retryDelay?: number;
  config: NavigateConfig;
  children?: Block[];

  constructor(name: string, config: NavigateConfig) {
    this.id = uuidv4();
    this.label = name;
    this.enabled = true;
    this.description = '';
    this.onError = OnErrorStrategy.STOP;
    this.maxRetries = 0;
    this.retryDelay = 0;
    this.config = config;
    makeAutoObservable(this);
  }

  toJSON() {
    return toJS(this);
  }
}