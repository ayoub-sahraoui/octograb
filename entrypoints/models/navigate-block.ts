import { v4 as uuidv4 } from 'uuid';
import { makeObservable, observable, action, toJS } from "mobx";
import { BlockBase } from './block-base';
import { OnErrorStrategy } from "./enums";

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

export class NavigateBlock extends BlockBase {
  id: string;
  type: string = 'navigate';
  config: NavigateConfig;

  constructor(name: string, config: NavigateConfig) {
    super();
    makeObservable(this, {
      id: observable,
      type: observable,
      config: observable,
      label: observable,
      enabled: observable,
      description: observable,
      onError: observable,
      maxRetries: observable,
      retryDelay: observable,
      parent: observable,
      children: observable,
      index: observable,
      setLabel: action,
      setEnabled: action,
      toggleEnabled: action,
      setDescription: action,
      setOnError: action,
      setMaxRetries: action,
      setRetryDelay: action,
      setMaxExecutionTime: action,
      setConfig: action,
      updateConfig: action,
      setConfigValue: action,
      setParent: action,
      addChild: action,
      removeChild: action,
      moveChild: action,
      clearChildren: action,
      setIndex: action,
      setUrl: action,
      setWaitUntil: action,
      setBehavior: action,
      setTimeout: action,
    });
    this.id = uuidv4();
    this.label = name;
    this.enabled = true;
    this.description = '';
    this.onError = OnErrorStrategy.STOP;
    this.maxRetries = 0;
    this.retryDelay = 0;
    this.config = config;
  }

  // ─── Config-specific actions ───────────────────────────────────────────

  setUrl(url: string) {
    this.config.url = url;
  }

  setWaitUntil(strategy: WaitUntilStrategy) {
    this.config.waitUntil = strategy;
  }

  setBehavior(behavior: NavigateBehavior) {
    this.config.behavior = behavior;
  }

  setTimeout(timeout?: number) {
    this.config.timeout = timeout;
  }

  toJSON() {
    return toJS(this);
  }

  static fromJson(json: any): NavigateBlock {
    const block = new NavigateBlock(json.label || 'Navigate', json.config || { url: '' });
    if (json.id) block.id = json.id;
    if (json.enabled !== undefined) block.setEnabled(json.enabled);
    if (json.description !== undefined) block.setDescription(json.description);
    if (json.onError !== undefined) block.setOnError(json.onError);
    if (json.maxRetries !== undefined) block.setMaxRetries(json.maxRetries);
    if (json.retryDelay !== undefined) block.setRetryDelay(json.retryDelay);
    if (json.maxExecutionTime !== undefined) block.setMaxExecutionTime(json.maxExecutionTime);
    if (json.index !== undefined) block.setIndex(json.index);
    return block;
  }
}