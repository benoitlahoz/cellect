import { TableSelectOptions } from '../types/table-select.abstract';
import type {
  AbstractTableSelect,
  SelectionRect,
  TableSelectModifiersState,
} from 'types/table-select.abstract';
import { Cell } from './cell.module';
import type { AbstractCell, CellBounds, CellIndex } from 'types/cell.abstract';
import {
  cellsFromSelectors,
  boundsForSelection,
  cellAtIndex,
  nextCellOn,
  selectRange,
  selectAll,
} from '../handlers/table-select.handlers';
import { SelectionLasso } from './lasso.module';
import { TableSelectEventSender } from './table-select-event.module';

/**
 * Default options for this `TableSelect` instance.
 */
export const DEFAULT_OPTIONS: TableSelectOptions = {
  rowSelector: 'row',
  colSelector: 'col',
  activeSelector: 'active',
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

/**
 * Data attributes to add to `AbstractCell` elements.
 */
export enum TableSelectDataAttributes {
  Row = 'data-table-select-row',
  Col = 'data-table-select-col',
}

export class TableSelect implements AbstractTableSelect {
  private _options: TableSelectOptions;

  private _element!: HTMLElement;

  private _cells: Array<Array<Cell>> = [];

  private _contiguousPressed = false;
  private _altPressed = false;

  private _activeCell: Cell | undefined;
  private _rect: SelectionRect = {
    pos: { x: 0, y: 0 },
    size: { width: 0, height: 0 },
  };

  private _selection: Set<Cell> = new Set();

  private _onBoundKeydown;
  private _onBoundKeyup;

  private _lasso: SelectionLasso | undefined;

  private _onBoundLassoStart;
  private _onBoundLasso;
  private _onBoundLassoEnd;

  private _isLocked = false;

  constructor(
    element: HTMLElement,
    private _data: Array<Array<any>>,
    options: TableSelectOptions
  ) {
    // Mix parameter with default options.

    this._options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };

    // Create bound listeners.
    this._onBoundKeydown = this.onKeydown.bind(this);
    this._onBoundKeyup = this.onKeyup.bind(this);

    if (this._options.useLasso) {
      this._lasso = new SelectionLasso(this);

      this._onBoundLassoStart = this.onLassoStart.bind(this);
      this._onBoundLasso = this.onLasso.bind(this);
      this._onBoundLassoEnd = this.onLassoEnd.bind(this);
    }

    // Set the element and compute cells.
    this.element = element;

    this.clearOnBlur = this._options.clearOnBlur!;
    this.multiselection = this.options.multiselection!;
  }

  public dispose(): void {
    this.multiselection = false;
    this.clearOnBlur = false;

    this._element.setAttribute('draggable', 'false');

    if (this._options.useLasso || this._onBoundLassoStart) {
      this._element.removeEventListener(
        'dragstart',
        this._onBoundLassoStart as any
      );
    }

    this._resetActive();
    this._selection.clear();
    this._rect = {
      pos: { x: 0, y: 0 },
      size: { width: 0, height: 0 },
    };

    // Dispose cells.

    for (const row of this._cells) {
      for (const cell of row) {
        cell.dispose();
      }
    }
  }

  public lock(): void {
    this._isLocked = true;
  }

  public unlock(): void {
    this._isLocked = false;
  }

  /**
   * Creates an array of arrays of `Cell` according to the selectors passed in options.
   *
   * @todo Allow bigger cell size.
   */
  private computeCellElements(): void {
    // Get children elements with row and col selectors.
    const elements = cellsFromSelectors(
      this._options.rowSelector!,
      this._options.colSelector!
    )(this._element);

    let i = 0;
    for (const row of elements) {
      let j = 0;
      const cols = [];
      for (const col of row) {
        const cell: Cell = new Cell(
          col as HTMLElement,
          { index: { row: i, col: j }, size: { width: 1, height: 1 } },
          {
            selectedSelector: this._options.selectedSelector!,
            activeSelector: this._options.activeSelector!,
            pointerEventChannel: this._options.pointerEventChannel!,
          }
        );

        // Add listener to cell.

        cell.addPointerListener(
          this.onPointer.bind(this, cell) as EventListener
        );

        cols.push(cell);
        j++;
      }
      this._cells.push(cols);
      i++;
    }
  }

  public selectOne(
    row: number,
    col: number,
    resetSelection = true,
    onlyActiveRect = true,
    active = true
  ): void {
    const cell = this.cellAtIndex(row, col);
    if (cell) {
      if (active) {
        this._setActive(cell, resetSelection);
      } else {
        this._selection.add(cell.setSelected(true));
      }
      TableSelectEventSender.sendSelect(this, undefined, onlyActiveRect);
    }
  }

  public selectRange(begin: Cell, end: Cell, unselect = false) {
    this._selection = this.couldSelectRange(begin, end, unselect);
    this._selection.forEach((cell: AbstractCell) =>
      cell.setSelected(!unselect)
    );
  }

  public couldSelectRange(begin: Cell, end: Cell, unselect = false) {
    return selectRange(
      this._cells,
      this._selection,
      begin,
      end,
      unselect
    ) as Set<Cell>;
  }

  public selectRangeByIndex(
    begin: CellIndex,
    end: CellIndex,
    send = true
  ): void {
    const beginCell = cellAtIndex(this._cells, begin.row, begin.col) as Cell;
    const endCell = cellAtIndex(this._cells, end.row, end.col) as Cell;

    if (beginCell && endCell) {
      this._selection = selectRange(
        this._cells,
        this._selection,
        beginCell,
        endCell,
        false
      ) as Set<Cell>;
      this._selection.forEach((cell: AbstractCell) => cell.setSelected(true));
    }

    if (send) {
      TableSelectEventSender.sendSelect(this);
    }
  }

  public couldSelectRangeByIndex(begin: CellIndex, end: CellIndex): Set<Cell> {
    const beginCell = cellAtIndex(this._cells, begin.row, begin.col) as Cell;
    const endCell = cellAtIndex(this._cells, end.row, end.col) as Cell;

    if (beginCell && endCell) {
      return this.couldSelectRange(beginCell, endCell);
    }

    return new Set();
  }

  public unselectRangeByIndex(
    begin: CellIndex,
    end: CellIndex,
    send = true
  ): void {
    const beginCell = cellAtIndex(this._cells, begin.row, begin.col) as Cell;
    const endCell = cellAtIndex(this._cells, end.row, end.col) as Cell;

    this._selection = selectRange(
      this._cells,
      this._selection,
      beginCell,
      endCell,
      true
    ) as Set<Cell>;

    if (send) {
      TableSelectEventSender.sendSelect(this);
    }
  }

  public selectRow(
    row: number,
    moveActive = true,
    resetSelection = true
  ): void {
    if (resetSelection) this._resetSelection();

    this.selectRangeByIndex(
      {
        row,
        col: 0,
      },
      {
        row,
        col: this._cells[row].length - 1,
      },
      false
    );

    const begin = this.cellAtIndex(row, 0);
    if (moveActive && begin) {
      this._setActive(begin);
    }

    TableSelectEventSender.sendSelect(this);
  }

  public selectCol(col: number, resetSelection = true): void {
    const begin = cellAtIndex(this._cells, 0, col) as Cell;
    const end = cellAtIndex(this._cells, this._cells.length - 1, col) as Cell;

    if (resetSelection) this._resetSelection();

    this.selectRange(begin, end);

    this._setActive(begin);
    TableSelectEventSender.sendSelect(this);
  }

  public selectAll(activeAtFirst = false): void {
    this._selection = selectAll(this._cells) as Set<Cell>;

    if (activeAtFirst) {
      const cell = this.cellAtIndex(0, 0);
      if (cell) {
        this._activeCell?.setActive(false);
        this._activeCell = cell.setActive(true);
      }
    }

    TableSelectEventSender.sendSelect(this);
  }

  public get selectionBounds(): CellBounds {
    return boundsForSelection(this._selection);
  }

  public computeRect(activeOnly = false): SelectionRect {
    // Compute bounds of the selection in pixels.

    const bounds = this.selectionBounds;

    const firstCell: HTMLElement =
      activeOnly && this._activeCell
        ? this._activeCell.element
        : this._cells[bounds.begin.row][bounds.begin.col].element;

    const lastCell: HTMLElement =
      activeOnly && this._activeCell
        ? this._activeCell.element
        : this._cells[bounds.end.row][bounds.end.col].element;

    this._rect = {
      pos: {
        x: firstCell.offsetLeft,
        y: firstCell.offsetTop,
      },
      size: {
        width:
          lastCell.offsetLeft + lastCell.offsetWidth - firstCell.offsetLeft,
        height:
          lastCell.offsetTop + lastCell.offsetHeight - firstCell.offsetTop,
      },
    };

    return this._rect;
  }

  private _resetSelection(): void {
    let i = 0;
    for (const cell of this._selection) {
      cell.setSelected(false);
      i++;
    }
    this._selection.clear();
  }

  public resetSelection(send = true): void {
    this._resetSelection();

    if (send) {
      TableSelectEventSender.sendSelect(this);
    }
  }

  private _setActive(cell: Cell, resetSelection = false): void {
    if (resetSelection) {
      this._resetSelection();
    }

    this._resetActive();
    this._activeCell = cell.setActive(true);
    this._selection.add(cell.setSelected(true));
  }

  private _resetActive(): void {
    if (this._activeCell) {
      this._activeCell.setActive(false);
      this._activeCell = undefined;
    }
  }

  public cellAtIndex(row: number, col: number): Cell | undefined {
    return cellAtIndex(this._cells, row, col) as Cell | undefined;
  }

  private _handleKeySelect(cell: Cell): void {
    if (this._activeCell && cell) {
      if (!this._contiguousPressed) {
        // Set cell as active after resetting current selection.
        this._setActive(cell, true);
      } else {
        // Reset all selected cells.
        this._resetSelection();

        // Select range from active cell to next cell.
        this.selectRange(this._activeCell, cell);
      }
    }
  }

  private onLassoStart(event: DragEvent) {
    event.preventDefault();

    if (this._isLocked) return;

    this._element.addEventListener('pointermove', this._onBoundLasso as any);
    window.addEventListener('pointerup', this._onBoundLassoEnd as any);
  }

  private onLasso(event: PointerEvent) {
    const element = document
      .elementsFromPoint(event.x, event.y)
      .find((element: Element) => element.classList.contains('col'));

    if (element && this._activeCell) {
      const row = element.getAttribute(TableSelectDataAttributes.Row);
      const col = element.getAttribute(TableSelectDataAttributes.Col);
      if (row && col) {
        const cell = this.cellAtIndex(parseInt(row), parseInt(col));
        if (cell) {
          this._resetSelection();
          this.selectRange(this._activeCell, cell);
          TableSelectEventSender.sendSelect(this, event);
        }
      }
    }
  }

  private onLassoEnd(event: PointerEvent) {
    this._element.removeEventListener('pointermove', this._onBoundLasso as any);
    window.removeEventListener('pointerup', this._onBoundLassoEnd as any);
    TableSelectEventSender.sendSelect(this, event);
  }

  private onPointer(cell: Cell, event: PointerEvent) {
    if (this._isLocked) return;

    if (
      !this._options.multiselection ||
      (!this._altPressed && !this._contiguousPressed)
    ) {
      // alternate key (e.g. Command or Control) and continuous one (e.g. Shift) are not pressed
      // TODO: handle toggle unselect option.

      // Set cell as active after resetting current selection.
      this._setActive(cell, true);
    } else if (this._options.multiselection && this._altPressed) {
      // alternate key is pressed.

      if (
        (this._activeCell && this._activeCell !== cell) ||
        !this._activeCell
      ) {
        if (this._contiguousPressed) {
          // Like with Microsoft Excel: if 'shift' is pressed with 'control' or 'command': reset selection.
          this._resetSelection();
        }

        if (cell.isSelected) {
          // Click + alt on a selected cell that is not active one.
          // Unselect cell but do not reset current active state (active cell must remain the same.)
          cell.setSelected(false);
        } else {
          // Click + alt on an unselected cell
          // Set it as active and add it to selection without resetting the current selection.
          this._setActive(cell, false);
        }
      }
    } else if (
      this._options.multiselection &&
      this._contiguousPressed &&
      this._activeCell
    ) {
      // Contiguous key is pressed: reset selection but not active cell.
      this._resetSelection();
      this._activeCell.setSelected(true);

      // Select a range between active cell and new cell.
      this.selectRange(this._activeCell, cell);
    }

    TableSelectEventSender.sendSelect(this, event);
  }

  private onKeydown(event: KeyboardEvent): void {
    if (this._isLocked) return;

    switch (event.key) {
      /**
       * Multiselection handlers with modifier keys.
       */
      case this._options.contiguousSelectionModifier: {
        if (!this._options.multiselection) return;

        this._contiguousPressed = true;
        TableSelectEventSender.sendModifierChange(this, event);
        break;
      }
      case this._options.altSelectionModifier: {
        if (!this._options.multiselection) return;

        this._altPressed = true;
        TableSelectEventSender.sendModifierChange(this, event);
        break;
      }

      /**
       * Keyboard navigation.
       */
      case this._options.keyDown: {
        if (!this._options.useKeyboard || !this._activeCell) break;

        const cell = nextCellOn(
          'down',
          this._cells,
          this._selection,
          this._activeCell,
          !this._contiguousPressed
        ) as Cell;

        this._handleKeySelect(cell);
        TableSelectEventSender.sendSelect(this, event);

        break;
      }

      case this._options.keyUp: {
        if (!this._options.useKeyboard || !this._activeCell) break;

        const cell = nextCellOn(
          'up',
          this._cells,
          this._selection,
          this._activeCell,
          !this._contiguousPressed
        ) as Cell;

        this._handleKeySelect(cell);
        TableSelectEventSender.sendSelect(this, event);

        break;
      }

      case this._options.keyLeft: {
        if (!this._options.useKeyboard || !this._activeCell) break;

        const cell = nextCellOn(
          'left',
          this._cells,
          this._selection,
          this._activeCell,
          !this._contiguousPressed
        ) as Cell;

        this._handleKeySelect(cell);
        TableSelectEventSender.sendSelect(this, event);

        break;
      }

      case this._options.keyRight: {
        if (!this._options.useKeyboard || !this._activeCell) break;

        const cell = nextCellOn(
          'right',
          this._cells,
          this._selection,
          this._activeCell,
          !this._contiguousPressed
        ) as Cell;

        this._handleKeySelect(cell);
        TableSelectEventSender.sendSelect(this, event);

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

    TableSelectEventSender.sendModifierChange(this, event);
  }

  public resetModifiers(): void {
    this._contiguousPressed = false;
    this._altPressed = false;
    TableSelectEventSender.sendModifierChange(this);
  }

  public set element(element: HTMLElement) {
    for (const row of this._cells) {
      for (const col of row) {
        col.dispose();
      }
    }

    this._cells.length = 0;

    if (this._element) {
      // Reset element state.

      this.multiselection = false;
      this.clearOnBlur = false;

      this._element.setAttribute('draggable', 'false');
      this._element.removeEventListener(
        'dragstart',
        this._onBoundLassoStart as any
      );
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
      this._element.addEventListener(
        'dragstart',
        this._onBoundLassoStart as any
      );
    }

    this.computeCellElements();
  }

  public set data(data: Array<any>) {
    if (this._options.resetOnChange) {
      this._resetSelection();
    }

    for (const row of this._cells) {
      for (const cell of row) {
        cell.dispose();
      }
    }

    this._cells.length = 0;
    this._data = data;
    this.computeCellElements();
  }

  public set multiselection(allow: boolean) {
    if (this._element) {
      // Make sure previous event listeners are removed.

      this._element.removeEventListener('keydown', this._onBoundKeydown);
      this._element.removeEventListener('keyup', this._onBoundKeyup);

      this._options.multiselection = allow;

      if (this._options.multiselection) {
        this._element.addEventListener('keydown', this._onBoundKeydown);
        this._element.addEventListener('keyup', this._onBoundKeyup);
      }
    }
  }

  public set clearOnBlur(clear: boolean) {
    // Make sure previous event listener is removed.

    this._element.removeEventListener('blur', this._resetSelection);

    this._options.clearOnBlur = clear;

    if (this._options.clearOnBlur) {
      this._element.addEventListener('blur', this._resetSelection);
    }
  }

  public get element(): HTMLElement {
    return this._element;
  }

  public get data(): Array<Array<any>> {
    return this._data;
  }

  public get options(): TableSelectOptions {
    return this._options;
  }

  public get selection(): Set<Cell> {
    return this._selection;
  }

  public get selectionRect(): SelectionRect {
    return this._rect;
  }

  public get activeCell(): AbstractCell | undefined {
    return this._activeCell;
  }

  public get modifiersState(): TableSelectModifiersState {
    return {
      contiguous: this._contiguousPressed,
      alt: this._altPressed,
    };
  }

  public get isLocked(): boolean {
    return this._isLocked;
  }
}
