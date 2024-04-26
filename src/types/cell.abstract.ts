export interface CellIndex {
  row: number;
  col: number;
}

export interface CellSize {
  width: number;
  height: number;
}

export interface CellRange {
  index: CellIndex;
  size: CellSize;
}

export interface CellBounds {
  begin: CellIndex;
  end: CellIndex;
}

export interface CellOptions {
  selectedSelector: string;
  activeSelector: string;
  pointerEventChannel: keyof HTMLElementEventMap;
}

export abstract class AbstractCell {
  /**
   * Clean up the cell.
   */
  public abstract dispose(): void;

  /**
   * Inverse the current selection state of this cell.
   *
   * @returns { AbstractCell } This cell.
   */
  public abstract toggleSelect(): AbstractCell;

  /**
   * Inverse the current active state of this cell.
   *
   * @returns { AbstractCell } This cell.
   */
  public abstract toggleActive(): AbstractCell;

  /**
   * Set this cell as active or inactive.
   *
   * @param { boolean } active - If `true` set active, if `false` disable 'active' state.
   *
   * @returns { AbstractCell } This cell.
   */
  public abstract setActive(active: boolean): AbstractCell;

  /**
   * Set this cell as selected or unselected.
   *
   * @param { boolean } selected - If `true` set selected, if `false` disable 'selected' state.
   *
   * @returns { AbstractCell } This cell.
   */
  public abstract setSelected(selected: boolean): AbstractCell;

  /**
   * Add a listener to the channel passed as  pointer vent in options.
   *
   * @param { EventListener } listener The listener called when the pointer event is emitted.
   */
  public abstract addPointerListener(listener: EventListener): void;

  /**
   * Remove the previously added pointer listener.
   */
  public abstract removePointerListener(): void;

  /**
   * Underlying `HTMLElement`of this cell.
   */
  public abstract element: HTMLElement;

  /**
   * This cell's `row`.
   */
  public abstract row: number;

  /**
   * This cell's `column`.
   *
   * @returns { number } This cell's column.
   */
  public abstract col: number;

  /**
   * Get this cell's `width`.
   *
   * @returns { number } This cell's width.
   */
  public abstract width: number;

  /**
   * This cell's `height`.
   *
   * @returns { number } This cell's height.
   */
  public abstract height: number;

  /**
   * This cell's `range`.
   *
   * @returns { CellRange } This cell's range with `index` (row + column) and `size` (width + height in number of rows and columns).
   */
  public abstract range: CellRange;

  /**
   * This cell's upper-left position in the table, with `row` and `col`.
   *
   * @returns { CellIndex } The cell's upper-left position.
   */
  public abstract index: CellIndex;

  /**
   * The cell's size, with `width` and `height` as number of columns and rows.
   *
   * @returns { CellSize } The size of the cell.
   */
  public abstract size: CellSize;

  /**
   * The cell's bounding box with top-left position and bottom-right one, as `row` and `column`.
   *
   * @returns { CellBounds } The cell's bounding box.
   */
  public abstract boundingBox: CellBounds;

  /**
   * The selection status of the cell.
   *
   * @returns { boolean } `true` if selected.
   */
  public abstract isSelected: boolean;

  /**
   * The active status of the cell.
   *
   * @returns { boolean } `true` if active.
   */
  public abstract isActive: boolean;
}
