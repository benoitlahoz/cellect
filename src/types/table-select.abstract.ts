import { AbstractCell, CellBounds } from './cell.abstract';

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
   * Is it allowed to drag a 'lasso' to select cells.
   */
  useLasso?: boolean;
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
   * Reset selection when data changes.
   * Typically, if the table contains `input` elements that mutate the data, set to `false`.
   */
  resetOnChange?: boolean;
}

export interface SelectionCoords {
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

  /**
   * Cleans the instance, its selection and its elements' event listeners.
   */
  public abstract dispose(): void;

  /**
   * Add a range from a `Cell` to another `Cell` to the selection.
   *
   * @param { AbstractCell } begin A cell to begin from.
   * @param { AbstractCell } end  A cell to end to.
   */
  public abstract selectRange(begin: AbstractCell, end: AbstractCell): void;

  /**
   * Unselect all cells.
   */
  public abstract resetSelection(): void;

  /**
   * Get a `Cell` at given position (row, column).
   * @param { number } row The row's index.
   * @param { number } col The column's index.
   */
  public abstract cellAtPosition(
    row: number,
    col: number
  ): AbstractCell | undefined;
}
