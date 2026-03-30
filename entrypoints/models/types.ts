import { ClickBlock } from "./click-block";
import { ConditionBlock } from "./condition-block";
import { ExtractScopeBlock } from "./extract-scope-block";
import { GoBackBlock } from "./go-back-block";
import { InputBlock } from "./input-block";
import { LoopElementsBlock } from "./loop-elements-block";
import { LoopPaginationBlock } from "./loop-pagination-block";
import { NavigateBlock } from "./navigate-block";
import { ScrollBlock } from "./scroll-block";
import { WaitBlock } from "./wait-block";
import { AssertBlock } from "./assert-block";
import { SetVariableBlock } from "./set-variable-block";
import { MacroBlock } from "./macro-block";

export type Block =
  | NavigateBlock
  | ClickBlock
  | InputBlock
  | LoopElementsBlock
  | LoopPaginationBlock
  | ExtractScopeBlock
  | ConditionBlock
  | ScrollBlock
  | WaitBlock
  | GoBackBlock
  | AssertBlock
  | SetVariableBlock
  | MacroBlock;
