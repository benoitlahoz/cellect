import { AbstractCellCollection, CellCollection } from 'cell-collection';
import type {
  AbstractCell,
  CellBounds,
  CellIndex,
  CellRange,
  CellSize,
} from 'cell-collection';

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
   * The class to apply to focused cell.
   */
  focusSelector?: string;
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

export abstract class AbstractTableSelect extends AbstractCellCollection {
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
  public abstract selection: CellCollection;

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

  /**
   * The focused cell.
   */
  public abstract focused: AbstractCell | undefined;

  /**
   * The selection rectangle in pixels.
   */
  public abstract selectionRect: SelectionRect;

  /**
   * Computes the active selection rectangle in pixels. It may be used for lasso.
   *
   * @param { boolean } activeOnly Will only compute the active cell coordinates.
   *
   * @returns { SelectionRect } The coordinates in pixels of the active selection.
   */
  public abstract computeRect(activeOnly?: boolean): SelectionRect;

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
   * Select a single cell by its indexes.
   *
   * @param { number } row The row index of the cell.
   * @param { number } col The column index of the cell.
   * @param { boolean } resetSelection If `true` reset the selection (this cell will be the only one selected).
   * @param { boolean } onlyActiveCoords If `true` compute only the active cell rect.
   * @param { boolean } focused Set this cell as active.
   */
  public abstract selectOne(
    row: number,
    col: number,
    resetSelection?: boolean,
    onlyActiveRect?: boolean,
    focused?: boolean
  ): void;

  public abstract modifiersState: TableSelectModifiersState;

  /**
   * Find cells in a range and select them.
   *
   * @param { CellRange } range The range to select.
   * @returns { CellCollection } A `CellCollection` with selected cells.
   */
  public abstract selectRange(range: CellRange): CellCollection;
  /**
   * Find cells between bounds and select them.
   *
   * @param { CellBounds } bounds The boundaries of the cells to select.
   * @returns { CellCollection } A `CellCollection` with selected cells.
   */
  public abstract selectRange(bounds: CellBounds): CellCollection;
  /**
   * Find cells between two cells and select them.
   *
   * @param { AbstractCell } begin The first cell of the selection.
   * @param { AbstractCell } end The last cell of the selection.
   * @returns { CellCollection } A `CellCollection` with selected cells.
   */
  public abstract selectRange(
    begin: AbstractCell,
    end: AbstractCell
  ): CellCollection;
  /**
   * Find cells between two cells positions and select them.
   *
   * @param { CellIndex } begin The position of the first cell of the selection.
   * @param { CellIndex } end The position of the last cell of the selection.
   * @returns { CellCollection } A `CellCollection` with selected cells.
   */
  public abstract selectRange(begin: CellIndex, end: CellIndex): CellCollection;
  /**
   * Find cells givenn a beginning position and a size and select them.
   *
   * @param { CellIndex } begin The position of the first cell of the selection.
   * @param { CellSize } size The size of the selection.
   * @returns { CellCollection } A `CellCollection` with selected cells.
   */
  public abstract selectRange(begin: CellIndex, size: CellSize): CellCollection;
  public abstract selectRange(
    ...args: (CellRange | CellBounds | AbstractCell | CellIndex | CellSize)[]
  ): CellCollection;

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
   * Select all cells.
   *
   * @param { boolean } activeAtFirst Whether the 'active' cell is set at [0, 0] of the cells array.
   */
  public abstract selectAll(activeAtFirst?: boolean): void;
}
