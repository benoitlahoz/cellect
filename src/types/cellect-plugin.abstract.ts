import { AbstractCellect } from './cellect.abstract';

export abstract class AbstractCellectPlugin {
  constructor(...args: any[]) {
    args;
  }
  public beforeInit?(instance: AbstractCellect): void;
  public inited?(instance: AbstractCellect): void;
  public beforeSelect?(instance: AbstractCellect): void;
  public selected?(instance: AbstractCellect, selection: AbstractCellect): void;
  public beforeUnselect?(instance: AbstractCellect): void;
  public unselected?(
    instance: AbstractCellect,
    selection: AbstractCellect
  ): void;
  public beforeElementChange?(
    instance: AbstractCellect,
    element: HTMLElement
  ): void;
  public elementChanged?(instance: AbstractCellect, element: HTMLElement): void;
  public dispose?(): void;
}
