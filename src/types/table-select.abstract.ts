import type { AbstractCell, CellBounds, CellIndex } from './cell.abstract';

export interface TableSelectOptions {
  /**
   * The class name used to recognize rows.
   */
  rowSelector?: string;
  /**
   * The class name to recognize columns.
   */
  colSelector?: string;
  /**
   * The class to apply to active cell.
   */
  activeSelector?: string;
  /**
   * The class to apply to selected cells.
   */
  selectedSelector?: string;
  /**
   * Clear selection when container element is unfocused.
   */
  clearOnBlur?: boolean;
  /**
   * The channel to listen for pointer events.
   * e.g. 'mousedown'
   */
  pointerEventChannel?: keyof HTMLElementEventMap;
  /**
   * Does the selection accepts keyboard input (typically arrows to navigate the table).
   */
  useKeyboard?: boolean;
  /**
   * Key to listen to for navigating up in the table.
   * (e.g. `'ArrowUp'`)
   */
  keyUp?: string;
  /**
   * Key to listen to for navigating down in the table.
   * (e.g. `'ArrowDown'`)
   */
  keyDown?: string;
  /**
   * Key to listen to for navigating left in the table.
   * (e.g. `'ArrowLeft'`)
   */
  keyLeft?: string;
  /**
   * Key to listen to for navigating right in the table.
   * (e.g. `'ArrowRight'`)
   */
  keyRight?: string;
  /**
   * Modifier key for contiguous selection. Typically `'Shift'`.
   */
  contiguousSelectionModifier?: string;
  /**
   * Modifier key for contiguous selection. Typically `'Control'` or `'Meta'`.
   */
  altSelectionModifier?: string;
  /**
   * Does the table accepts multiselection.
   */
  multiselection?: boolean;
  /**
   * Is it allowed to drag a 'lasso' to select cells.
   */
  useLasso?: boolean;
  /**
   * Reset selection when data changes.
   * Typically, if the table contains `input` elements that mutate the data, set to `false`.
   */
  resetOnChange?: boolean;
}

export interface TableSelectModifiersState {
  contiguous: boolean;
  alt: boolean;
}

/**
 * The selection coordinates (e.g. in pixels) according to the Cell HTML elements.
 */
export interface SelectionRect {
  pos: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
}

export abstract class AbstractTableSelect {
  /**
   * Data associated to the selection.
   * It is used only for the global 'topology' of the array.
   */
  public abstract data: Array<Array<any>>;

  /**
   * The container element of the table.
   */
  public abstract element: HTMLElement;

  /**
   * The options passed when creating the instance of `TableSelect`.
   */
  public abstract readonly options: TableSelectOptions;

  /**
   * The current selection.
   */
  public abstract selection: Set<AbstractCell>;

  /**
   * Allow or not the multiselection on the table.
   */
  public abstract multiselection: boolean;

  /**
   * Should the selection be cleared when element is unfocused.
   */
  public abstract clearOnBlur: boolean;

  /**
   * The current selection bounds from beginning row and columns to end ones.
   */
  public abstract selectionBounds: CellBounds;

  public abstract activeCell: AbstractCell | undefined;

  public abstract selectionRect: SelectionRect;

  /**
   * Computes the active selection rectangle in pixels. It may be used for lasso.
   *
   * @param { boolean } activeOnly Will only compute the active cell coordinates.
   *
   * @returns { SelectionRect } The coordinates in pixels of the active selection.
   */
  public abstract computeRect(activeOnly: boolean): SelectionRect;

  /**
   * Cleans the instance, its selection and its elements' event listeners.
   */
  public abstract dispose(): void;

  /**
   * Locks selection.
   */
  public abstract lock(): void;

  /**
   * Unlocks selection.
   */
  public abstract unlock(): void;

  /**
   * Lock status of the selection.
   */
  public abstract isLocked: boolean;

  /**
   * Reset the modifiers keys to their 'up' state.
   */
  public abstract resetModifiers(): void;

  /**
   * Select a sngle cell by its indexes.
   *
   * @param { number } row The row index of the cell.
   * @param { number } col The column index of the cell.
   * @param { boolean } resetSelection If `true` reset the selection (this cell will be the only one selected).
   * @param { boolean } onlyActiveCoords If `true` compute only the active cell rect.
   * @param { boolean } active Set this cell as active.
   */
  public abstract selectOne(
    row: number,
    col: number,
    resetSelection: boolean,
    onlyActiveRect: boolean,
    active: boolean
  ): void;

  public abstract selectRangeByIndex(
    begin: CellIndex,
    end: CellIndex,
    send?: boolean
  ): void;

  public abstract couldSelectRangeByIndex(
    begin: CellIndex,
    end: CellIndex
  ): Set<AbstractCell>;

  public abstract unselectRangeByIndex(
    begin: CellIndex,
    end: CellIndex,
    send?: boolean
  ): void;

  public abstract modifiersState: TableSelectModifiersState;

  /**
   * Selects a whole row.
   *
   * @param { number } row The row to select.
   * @param { boolean } moveActive If `true` set the active cell at the beginning of the row.
   * @param { boolean } resetSelection If `true` reset the selection.
   */
  public abstract selectRow(
    row: number,
    moveActive?: boolean,
    resetSelection?: boolean
  ): void;

  /**
   * Selects a whole column.
   *
   * @param { number } col The column to select.
   * @param { boolean } resetSelection If `true` reset the selection.
   */
  public abstract selectCol(col: number, resetSelection?: boolean): void;

  /**
   * Add / remove a range from a `Cell` to another `Cell` to the selection.
   *
   * @param { AbstractCell } begin A cell to begin from.
   * @param { AbstractCell } end  A cell to end to.
   * @param { boolean } unselect Unselect instead of selecting.
   */
  public abstract selectRange(
    begin: AbstractCell,
    end: AbstractCell,
    unselect?: boolean
  ): void;

  public abstract couldSelectRange(
    begin: AbstractCell,
    end: AbstractCell,
    unselect?: boolean
  ): Set<AbstractCell>;

  /**
   * Select all cells.
   *
   * @param { boolean } activeAtFirst Whether the 'active' cell is set at [0, 0] of the cells array.
   */
  public abstract selectAll(activeAtFirst?: boolean): void;

  /**
   * Unselect all cells.
   *
   * @param { boolean } send Send a 'select' event.
   */
  public abstract resetSelection(send?: boolean): void;

  /**
   * Get a `Cell` at given indexes (row, column).
   *
   * @param { number } row The row's index.
   * @param { number } col The column's index.
   */
  public abstract cellAtIndex(
    row: number,
    col: number
  ): AbstractCell | undefined;
}
