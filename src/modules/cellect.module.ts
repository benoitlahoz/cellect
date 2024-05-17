import { CellCollection } from 'cell-collection';
import { HTMLCell } from 'cell-collection/dom';
import { HTMLCellDataAttributes } from 'cell-collection/dom';
import type {
  AbstractCell,
  CellBounds,
  CellIndex,
  CellRange,
  CellSize,
} from 'cell-collection';
import { CellectOptions } from '../types/cellect.abstract';
import type {
  AbstractCellect,
  SelectionRect,
  CellectModifiersState,
} from '../types/cellect.abstract';
import { CellectEventSender } from './cellect-event.module';
import { getCSSStyle, getElementsByClassName } from '../utils';

/**
 * Default options for this `TableSelect` instance.
 */
export const DEFAULT_OPTIONS: CellectOptions = {
  rowSelector: 'row',
  colSelector: 'col',
  focusSelector: 'active',
  selectedSelector: 'selected',
  clearOnBlur: true,
  pointerEventChannel: 'mousedown',
  useKeyboard: true,
  useLasso: true,
  keyUp: 'ArrowUp',
  keyDown: 'ArrowDown',
  keyLeft: 'ArrowLeft',
  keyRight: 'ArrowRight',
  contiguousSelectionModifier: 'Shift',
  altSelectionModifier: navigator.userAgent.toLowerCase().includes('mac')
    ? 'Meta'
    : 'Control',
  multiselection: true,
  resetOnChange: true,
};

export class Cellect extends CellCollection implements AbstractCellect {
  /**
   * Options passed by user at creation, with default options.
   */
  private _options: CellectOptions;

  /**
   * The container element passed by user at creation.
   */
  private _element!: HTMLElement;

  /**
   * Flag for e.g. 'Shift'.
   */
  private _contiguousPressed = false;

  /**
   * Flag for e.g. 'Command/Control.
   */
  private _altPressed = false;

  /**
   * The selection rectangle in pixels.
   */
  private _rect: SelectionRect = {
    pos: { x: 0, y: 0 },
    size: { width: 0, height: 0 },
  };

  /**
   * Flag for the selection lock.
   */
  private _isLocked = false;

  constructor(
    /**
     * A container element to get cells from.
     */
    element: HTMLElement,
    /**
     * Options for the `TableSelect` instance.
     */
    options: CellectOptions
  ) {
    super();

    // Mix parameter with default options.

    this._options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };

    // Create bound listeners.
    this.onKeydown = this.onKeydown.bind(this);
    this.onKeyup = this.onKeyup.bind(this);
    this.onBlur = this.onBlur.bind(this);

    if (this._options.useLasso) {
      // If lasso is used, will compute selection with it.

      this.onLassoStart = this.onLassoStart.bind(this);
      this.onLasso = this.onLasso.bind(this);
      this.onLassoEnd = this.onLassoEnd.bind(this);
    }

    // Set the element and compute cells in the setter.
    this.element = element;

    this.clearOnBlur = this._options.clearOnBlur!;
    this.multiselection = this.options.multiselection!;
  }

  public dispose(): void {
    // Clean the element.
    this._element.setAttribute('draggable', 'false');

    if (this._options.useLasso) {
      this._element.removeEventListener('dragstart', this.onLassoStart as any);
    }

    super.dispose();
  }

  /**
   * Disallow selecting or unselecting.
   */
  public lock(): void {
    this._isLocked = true;
  }

  /**
   * Unlock the selection and allow selecting.
   */
  public unlock(): void {
    this._isLocked = false;
  }

  /**
   * Select one cell at given row and column.
   *
   * @param { number } row The row of the cell.
   * @param { number } col The column of the cell.
   * @param { boolean } resetSelection If `true, will reset the selection before selecting the cell (default to `true`).
   * @param { boolean } focusedRectOnly If `true` will compute only the focused cell's rect (default to `true`).
   * @param { boolean } focus If `true` will focus on the selected cell (default to `true`).
   */
  public selectOne(
    row: number,
    col: number,
    resetSelection = true,
    focusedRectOnly = true,
    focused = true
  ): void {
    if (this._isLocked) return;

    const cell = this.at(row, col);

    if (cell) {
      if (focused) {
        if (resetSelection) this.unselect();

        this.select(cell);
        this.focus(cell);
      } else {
        this.select(cell);
      }
      CellectEventSender.sendSelect(this, undefined, focusedRectOnly);
    }
  }

  /**
   * Find cells in a range and select them.
   *
   * @param { CellRange } range The range to select.
   * @returns { CellCollection } A `CellCollection` with selected cells.
   */
  public selectRange(range: CellRange): CellCollection;
  /**
   * Find cells between bounds and select them.
   *
   * @param { CellBounds } bounds The boundaries of the cells to select.
   * @returns { CellCollection } A `CellCollection` with selected cells.
   */
  public selectRange(bounds: CellBounds): CellCollection;
  /**
   * Find cells between two cells and select them.
   *
   * @param { AbstractCell } begin The first cell of the selection.
   * @param { AbstractCell } end The last cell of the selection.
   * @returns { CellCollection } A `CellCollection` with selected cells.
   */
  public selectRange(begin: AbstractCell, end: AbstractCell): CellCollection;
  /**
   * Find cells between two cells positions and select them.
   *
   * @param { CellIndex } begin The position of the first cell of the selection.
   * @param { CellIndex } end The position of the last cell of the selection.
   * @returns { CellCollection } A `CellCollection` with selected cells.
   */
  public selectRange(begin: CellIndex, end: CellIndex): CellCollection;
  /**
   * Find cells givenn a beginning position and a size and select them.
   *
   * @param { CellIndex } begin The position of the first cell of the selection.
   * @param { CellSize } size The size of the selection.
   * @returns { CellCollection } A `CellCollection` with selected cells.
   */
  public selectRange(begin: CellIndex, size: CellSize): CellCollection;
  public selectRange(
    ...args: (CellRange | CellBounds | AbstractCell | CellIndex | CellSize)[]
  ): CellCollection {
    if (this._isLocked) return new CellCollection();
    CellectEventSender.sendSelect(this, undefined, false);
    return (this as any).in(...args).select();
  }

  /**
   * Select a whole row.
   *
   * @param { number } row The row number to select.
   * @param { boolean } resetSelection Reset selection before selecting the row (defaults to `true`).
   * @returns { CellCollection } A new `CellCollection that contains the row's cells.
   */
  public selectRow(row: number, resetSelection = true): CellCollection {
    if (this._isLocked) return new CellCollection();

    if (resetSelection) this.unselect();

    const range = this.in(
      {
        row,
        col: 0,
      },
      {
        row,
        col: this.lastColumnNumber,
      }
    ).select();
    this.focus(row, 0);

    CellectEventSender.sendSelect(this);
    return range;
  }

  /**
   * Select a whole column.
   *
   * @param { number } col The column number to select.
   * @param { boolean } resetSelection Reset selection before selecting the column (defaults to `true`).
   * @returns { CellCollection } A new `CellCollection that contains the column's cells.
   */
  public selectCol(col: number, resetSelection = true): CellCollection {
    if (this._isLocked) return new CellCollection();

    if (resetSelection) this.unselect();

    const range = this.in(
      {
        row: 0,
        col,
      },
      {
        row: this.lastRowNumber,
        col,
      }
    ).select();
    this.focus(0, col);

    CellectEventSender.sendSelect(this);
    return range;
  }

  /**
   * Select all cells.
   *
   * @param { boolean } focusFirstCell Focus on the first cell of the `TableSelect` once everything has been selected.
   */
  public selectAll(focusFirstCell = false): void {
    if (this._isLocked) return;

    this.select();

    if (focusFirstCell) {
      this.focus(0, 0);
    }
    CellectEventSender.sendSelect(this);
  }

  /**
   * The bounds of the currently selected cells.
   *
   * @returns { CellBounds } The selection bounds in rows and columns.
   */
  public get selectionBounds(): CellBounds {
    return this.selected.bounds;
  }

  public unselect(): CellCollection;
  public unselect(cell?: AbstractCell): AbstractCell | undefined;
  public unselect(
    row: number,
    col: number,
    tube?: number
  ): AbstractCell | undefined;
  public unselect(index: CellIndex): AbstractCell | undefined;
  public unselect(
    ...args: (AbstractCell | number | CellIndex | undefined)[]
  ): AbstractCell | CellCollection | undefined {
    if (this._isLocked) return;

    const res = super.unselect(...(args as any));
    // TableSelectEventSender.sendSelect(this);
    return res;
  }

  /**
   * Reset the modifier keys to `false`.
   */
  public resetModifiers(): void {
    this._contiguousPressed = false;
    this._altPressed = false;
    CellectEventSender.sendModifierChange(this);
  }

  /**
   * Computes the selection rectangle in pixels.
   *
   * @param { boolean } focusedOnly If `true` only computes the focused rectangle (defaults to `false`).
   * @returns { SelectionRect } The selection's rectangle in pixels.
   */
  public computeRect(focusedOnly = false): SelectionRect {
    // Compute bounds of the selection in pixels.

    const selection = this.selected;
    const focused = this.focused;

    const firstCell = focusedOnly && focused ? focused : selection.firstCell;
    const lastCell = focusedOnly && focused ? focused : selection.lastCell;

    if (firstCell && lastCell) {
      const firstElement: HTMLElement | undefined = firstCell.element;
      const lastElement: HTMLElement | undefined = lastCell.element;

      if (firstElement && lastElement) {
        const firstBorderLeft = getCSSStyle(firstElement, 'border-left-width');
        const firstBorderTop = getCSSStyle(firstElement, 'border-top-width');

        const lastBorderRight = getCSSStyle(lastElement, 'border-right-width');
        const lastBorderBottom = getCSSStyle(
          lastElement,
          'border-bottom-width'
        );

        this._rect = {
          pos: {
            x: firstElement.offsetLeft + parseInt(firstBorderLeft),
            y: firstElement.offsetTop + parseInt(firstBorderTop),
          },
          size: {
            width:
              lastElement.offsetLeft +
              lastElement.offsetWidth -
              firstElement.offsetLeft -
              parseInt(lastBorderRight) -
              parseInt(firstBorderLeft),
            height:
              lastElement.offsetTop +
              lastElement.offsetHeight -
              firstElement.offsetTop -
              parseInt(firstBorderTop) -
              parseInt(lastBorderBottom),
          },
        };
      }
    }

    return this._rect;
  }

  /**
   * Called when a pointer event is received by the element of a cell.
   *
   * @param { HTMLCell } cell The cell that received the pointer event.
   * @param { PointerEvent } event The original event.
   */
  private onPointer(cell: HTMLCell, event: PointerEvent): void {
    if (this._isLocked) return;

    const focused = this.focused;

    if (
      !this._options.multiselection ||
      (!this._altPressed && !this._contiguousPressed)
    ) {
      // alternate key (e.g. Command or Control) and continuous one (e.g. Shift) are not pressed
      // TODO: handle toggle unselect option.

      // Set cell as focused after resetting current selection.

      this.unselect();
      this.select(cell);
      this.focus(cell);
    } else if (this._options.multiselection && this._altPressed) {
      // alternate key is pressed.

      if ((focused && focused !== cell) || !focused) {
        if (this._contiguousPressed) {
          // Like with Microsoft Excel: if 'shift' is pressed with 'control' or 'command': reset selection.
          this.unselect();
        }

        if (cell.isSelected) {
          // Click + alt on a selected cell that is not active one.
          // Unselect cell but do not reset current active state (active cell must remain the same.)
          this.unselect(cell);
        } else {
          // Click + alt on an unselected cell
          // Set it as active and add it to selection without resetting the current selection.

          this.select(cell);
          this.focus(cell);
        }
      }
    } else if (
      this._options.multiselection &&
      this._contiguousPressed &&
      focused
    ) {
      // Contiguous key is pressed: reset selection but not active cell.
      this.unselect();
      this.select(focused);

      // Select a range between active cell and new cell.
      this.in(focused, cell).select();
    }

    CellectEventSender.sendSelect(this, event);
  }

  /**
   * Called when a keyboard event is received on the container element.
   * It handles modifier keys state and navigation between cells.
   *
   * @param { KeyboardEvent } event The event fired by the container element.
   */
  private onKeydown(event: KeyboardEvent): void {
    if (this._isLocked) return;

    const focused = this.focused!;
    let next;

    switch (event.key) {
      /**
       * Multiselection handlers with modifier keys.
       */
      case this._options.contiguousSelectionModifier: {
        if (!this._options.multiselection) return;

        this._contiguousPressed = true;
        CellectEventSender.sendModifierChange(this, event);
        break;
      }
      case this._options.altSelectionModifier: {
        if (!this._options.multiselection) return;

        this._altPressed = true;
        CellectEventSender.sendModifierChange(this, event);
        break;
      }

      /**
       * Keyboard navigation.
       */
      case this._options.keyDown: {
        if (!this._options.useKeyboard || !this.focused) break;

        if (!this._contiguousPressed) {
          // Start from focused cell.
          next = this.down(focused);
        } else {
          // Start from existing selection.
          const selection = this.selected;
          const bounds = selection.bounds;
          const baseRow =
            bounds.end.row > focused.row ? bounds.end.row : bounds.begin.row;
          const baseCol =
            bounds.end.col! > focused.col ? bounds.end.col : bounds.begin.col;

          const cell = this.at(baseRow, baseCol!);
          next = this.down(cell);

          selection.dispose();
        }

        this._handleKeySelect(next);
        CellectEventSender.sendSelect(this, event);

        break;
      }

      case this._options.keyUp: {
        if (!this._options.useKeyboard || !this.focused) break;

        if (!this._contiguousPressed) {
          // Start from focused cell.
          next = this.up(focused);
        } else {
          // Start from existing selection.
          const selection = this.selected;
          const bounds = selection.bounds;
          const baseRow =
            bounds.begin.row < focused.row ? bounds.begin.row : bounds.end.row;
          const baseCol =
            bounds.end.col! > focused.col ? bounds.end.col : bounds.begin.col;

          const cell = this.at(baseRow, baseCol!);
          next = this.up(cell);

          selection.dispose();
        }

        this._handleKeySelect(next);
        CellectEventSender.sendSelect(this, event);

        break;
      }

      case this._options.keyLeft: {
        if (!this._options.useKeyboard || !this.focused) break;

        if (!this._contiguousPressed) {
          // Start from focused cell.
          next = this.left(focused);
        } else {
          // Start from existing selection.
          const selection = this.selected;
          const bounds = selection.bounds;
          const baseRow =
            bounds.end.row > focused.row ? bounds.end.row : bounds.begin.row;
          const baseCol =
            bounds.end.col! > focused.col ? bounds.end.col : bounds.begin.col;

          const cell = this.at(baseRow, baseCol!);
          next = this.left(cell);

          selection.dispose();
        }

        this._handleKeySelect(next);
        CellectEventSender.sendSelect(this, event);

        break;
      }

      case this._options.keyRight: {
        if (!this._options.useKeyboard || !this.focused) break;

        if (!this._contiguousPressed) {
          // Start from focused cell.
          next = this.right(focused);
        } else {
          // Start from existing selection.
          const selection = this.selected;
          const bounds = selection.bounds;
          const baseRow =
            bounds.end.row > focused.row ? bounds.end.row : bounds.begin.row;
          const baseCol =
            bounds.end.col! > focused.col ? bounds.end.col : bounds.begin.col;

          const cell = this.at(baseRow, baseCol!);
          next = this.right(cell);

          selection.dispose();
        }

        this._handleKeySelect(next);
        CellectEventSender.sendSelect(this, event);

        break;
      }
    }
  }

  private onKeyup(event: KeyboardEvent): void {
    if (this._isLocked) return;

    if (!this._options.multiselection) return;

    switch (event.key) {
      case this._options.contiguousSelectionModifier: {
        this._contiguousPressed = false;
        break;
      }

      case this._options.altSelectionModifier: {
        this._altPressed = false;
        break;
      }
    }

    CellectEventSender.sendModifierChange(this, event);
  }

  private onBlur(event: any): void {
    if (this._options.clearOnBlur) {
      this.blur();
      this.unselect();
      CellectEventSender.sendSelect(this, event);
    }
  }

  private onLassoStart(event: DragEvent) {
    event.preventDefault();

    if (this._isLocked) return;

    this._element.addEventListener('pointermove', this.onLasso as any);
    window.addEventListener('pointerup', this.onLassoEnd as any);
  }

  private onLasso(event: PointerEvent) {
    const element = document
      .elementsFromPoint(event.x, event.y)
      .find((element: Element) =>
        element.classList.contains(this._options.colSelector!)
      );

    if (element && this.focused) {
      const row = element.getAttribute(HTMLCellDataAttributes.Row);
      const col = element.getAttribute(HTMLCellDataAttributes.Col);
      if (row && col) {
        const cell = this.at(parseInt(row), parseInt(col));
        if (cell) {
          this.unselect();
          this.selectRange(this.focused, cell).select();
          CellectEventSender.sendSelect(this, event);
        }
      }
    }
  }

  private onLassoEnd(event: PointerEvent) {
    this._element.removeEventListener('pointermove', this.onLasso as any);
    window.removeEventListener('pointerup', this.onLassoEnd as any);
    CellectEventSender.sendSelect(this, event);
  }

  /**
   * Fill the `TableSelect` instance with `Cell` according to the selectors passed in options.
   *
   * @todo Allow bigger cell size.
   */
  private _computeCellElements(): void {
    // Get children elements with row and col selectors.

    const elements = this._cellsFromSelectors(
      this._options.rowSelector!,
      this._options.colSelector!
    );

    let i = 0;
    for (const row of elements) {
      let j = 0;
      for (const col of row) {
        // Create cell for given row and column.

        const cell: HTMLCell = new HTMLCell(
          col as HTMLElement,
          { index: { row: i, col: j }, size: { width: 1, height: 1 } }, // TODO: allow bigger cell size.
          {
            selectedSelector: this._options.selectedSelector!,
            focusSelector: this._options.focusSelector!,
            pointerEventChannel: this._options.pointerEventChannel!,
          }
        );

        // Add listener to cell.

        cell.addPointerListener(
          this.onPointer.bind(this, cell) as EventListener
        );

        this.push(cell);
        j++;
      }
      i++;
    }
  }

  /**
   * Helper method called by the keyboard selection handler.
   *
   * @param { AbstractCell } cell The cell to select or that ends the selection bounds in case of multiselection.
   */
  private _handleKeySelect(cell?: AbstractCell): void {
    if (!cell) return;

    if (this.focused && cell) {
      if (!this._contiguousPressed) {
        // Set cell as active after resetting current selection.
        this.unselect();
        this.select(cell);
        this.focus(cell);
      } else {
        // Reset all selected cells.
        this.unselect();

        // Select range from active cell to next cell.
        this.selectRange(this.focused, cell);
      }
    }
  }

  /**
   * Get a 2D `Array` of elements from row and column selectors.
   *
   * @param { string } rowSelector The CSS selector to get rows.
   * @param { string } colSelector The CSS selector to get columns.
   *
   * @returns { (element: HTMLElement ): Array<Array<Element>> } A function to get an array of arrays of elements.
   */
  private _cellsFromSelectors(rowSelector: string, colSelector: string) {
    if (!this._element) {
      throw new Error('Element may not be mounted.');
    }

    const cellElements = [];

    // Generic functions for selectors.
    const getChildrenForRowSelector = getElementsByClassName(rowSelector);
    const getChildrenForColSelector = getElementsByClassName(colSelector);

    const rows = getChildrenForRowSelector(this._element);

    for (const row of rows) {
      const cols = getChildrenForColSelector(row as HTMLElement);
      const colsCells = [];
      for (const col of cols) {
        colsCells.push(col);
      }
      cellElements.push(colsCells);
    }

    return cellElements;
  }

  /**
   * The container element of the `TableSelect` cells.
   * When changing the element, the `TableSelect` instance will reset and recompute its cells.
   */
  public set element(element: HTMLElement) {
    for (const cell of this) {
      cell.dispose();
    }
    this.clear();

    if (this._element) {
      this._element.setAttribute('draggable', 'false');
      this._element.removeEventListener('dragstart', this.onLassoStart as any);
    }

    this._element = element;

    if (this._element.tabIndex === -1) {
      // Strange: we have to reassign -1 manually.

      this._element.tabIndex = -1;
    }

    this.multiselection = this._options.multiselection!;
    this.clearOnBlur = this._options.clearOnBlur!;

    if (this._options.useLasso) {
      this._element.style.position = 'relative';
      this._element.setAttribute('draggable', 'true');
      this._element.addEventListener('dragstart', this.onLassoStart as any);
    }

    this._computeCellElements();
  }

  /**
   * The multiselection state of the `TableSelect` instance.
   * Internally it manages the listeners bound to the container element.
   */
  public set multiselection(allow: boolean) {
    if (this._element) {
      // Make sure previous event listeners are removed.

      this._element.removeEventListener('keydown', this.onKeydown);
      this._element.removeEventListener('keyup', this.onKeyup);

      this._options.multiselection = allow;

      if (this._options.multiselection) {
        this._element.addEventListener('keydown', this.onKeydown);
        this._element.addEventListener('keyup', this.onKeyup);
      }
    }
  }

  /**
   * Does this `TableSelect` instance must clear its selection when its container element is blurred.
   * Internally it manages the listeners bound to the container element.
   */
  public set clearOnBlur(clear: boolean) {
    // Make sure previous event listener is removed.
    this._element.removeEventListener('blur', this.onBlur);

    this._options.clearOnBlur = clear;

    if (this._options.clearOnBlur) {
      this._element.addEventListener('blur', this.onBlur);
    }
  }

  /**
   * The container element of the cells' elements.
   */
  public get element(): HTMLElement {
    return this._element;
  }

  /**
   * The options passed on creation.
   */
  public get options(): CellectOptions {
    return this._options;
  }

  /**
   * The selected cells.
   */
  public get selection(): CellCollection {
    return this.selected;
  }

  /**
   * The selection rectangle in pixels.
   */
  public get selectionRect(): SelectionRect {
    return this._rect;
  }

  /**
   * State of the contiguous and alt modifiers.
   */
  public get modifiersState(): CellectModifiersState {
    return {
      contiguous: this._contiguousPressed,
      alt: this._altPressed,
    };
  }

  /**
   * Is `true` if the selection is locked.
   */
  public get isLocked(): boolean {
    return this._isLocked;
  }
}
