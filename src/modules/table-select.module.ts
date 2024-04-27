import {
  AbstractTableSelect,
  TableSelectOptions,
} from '../types/table-select.abstract';
import { Cell } from './cell.module';
import { addClass, cellsFromSelectors, removeClass } from '../functions';
import { CellBounds } from 'types/cell.abstract';

const DEFAULT_OPTIONS: TableSelectOptions = {
  rowSelector: 'row',
  colSelector: 'col',
  activeSelector: 'active',
  selectedSelector: 'selected',
  lassoSelectorPrefix: 'lasso',
  clearOnBlur: true,
  pointerEventChannel: 'mousedown',
  acceptsKeyboard: true,
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

export class TableSelect implements AbstractTableSelect {
  private _options: TableSelectOptions;

  private _cells: Array<Array<Cell>> = [];

  private _contiguousPressed = false;
  private _altPressed = false;

  private _activeCell: Cell | undefined;

  private _selection: Set<Cell> = new Set();

  private _addFullLasso: (element: HTMLElement) => void;
  private _addLassoTopLeft: (element: HTMLElement) => void;
  private _addLassoTop: (element: HTMLElement) => void;
  private _addLassoTopRight: (element: HTMLElement) => void;
  private _addLassoRight: (element: HTMLElement) => void;
  private _addLassoBottomRight: (element: HTMLElement) => void;
  private _addLassoBottom: (element: HTMLElement) => void;
  private _addLassoBottomLeft: (element: HTMLElement) => void;
  private _addLassoLeft: (element: HTMLElement) => void;
  private _removeLasso: (element: HTMLElement) => void;

  private _onBoundKeydown;
  private _onBoundKeyup;

  constructor(
    private _element: HTMLElement,
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

    // Add tabIndex if it doesn't exist, to handle keyboard events.

    if (this._element.tabIndex === -1) {
      // Strange: we have to reassign -1 manually.

      this._element.tabIndex = -1;
    }

    // Create functions to add lasso class.

    this._addFullLasso = addClass(
      this._options.lassoSelectorPrefix!,
      `${this._options.lassoSelectorPrefix!}-top-left`,
      `${this._options.lassoSelectorPrefix!}-top`,
      `${this._options.lassoSelectorPrefix!}-top-right`,
      `${this._options.lassoSelectorPrefix!}-right`,
      `${this._options.lassoSelectorPrefix!}-bottom-right`,
      `${this._options.lassoSelectorPrefix!}-bottom`,
      `${this._options.lassoSelectorPrefix!}-bottom-left`,
      `${this._options.lassoSelectorPrefix!}-left`
    );
    this._addLassoTopLeft = addClass(
      this._options.lassoSelectorPrefix!,
      `${this._options.lassoSelectorPrefix!}-top-left`
    );
    this._addLassoTop = addClass(
      this._options.lassoSelectorPrefix!,
      `${this._options.lassoSelectorPrefix!}-top`
    );
    this._addLassoTopRight = addClass(
      this._options.lassoSelectorPrefix!,
      `${this._options.lassoSelectorPrefix!}-top-right`
    );
    this._addLassoRight = addClass(
      this._options.lassoSelectorPrefix!,
      `${this._options.lassoSelectorPrefix!}-right`
    );
    this._addLassoBottomRight = addClass(
      this._options.lassoSelectorPrefix!,
      `${this._options.lassoSelectorPrefix!}-bottom-right`
    );
    this._addLassoBottom = addClass(
      this._options.lassoSelectorPrefix!,
      `${this._options.lassoSelectorPrefix!}-bottom`
    );
    this._addLassoBottomLeft = addClass(
      this._options.lassoSelectorPrefix!,
      `${this._options.lassoSelectorPrefix!}-bottom-left`
    );
    this._addLassoLeft = addClass(
      this._options.lassoSelectorPrefix!,
      `${this._options.lassoSelectorPrefix!}-left`
    );
    this._removeLasso = removeClass(
      this._options.lassoSelectorPrefix!,
      `${this._options.lassoSelectorPrefix!}-top-left`,
      `${this._options.lassoSelectorPrefix!}-top`,
      `${this._options.lassoSelectorPrefix!}-top-right`,
      `${this._options.lassoSelectorPrefix!}-right`,
      `${this._options.lassoSelectorPrefix!}-bottom-right`,
      `${this._options.lassoSelectorPrefix!}-bottom`,
      `${this._options.lassoSelectorPrefix!}-bottom-left`,
      `${this._options.lassoSelectorPrefix!}-left`
    );

    if (this._options.clearOnBlur) {
      this.clearOnBlur = true;
    }

    if (this.options.multiselection) {
      this.multiselection = true;
    }

    this.computeCellElements();
  }

  public dispose(): void {
    // Remove events listeners associated.

    this.multiselection = false;
    this.clearOnBlur = false;

    // Dispose cells.

    for (const row of this._cells) {
      for (const cell of row) {
        this._removeLasso(cell.element);
        cell.dispose();
      }
    }

    this._selection.clear();
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

  public selectRange(begin: Cell, end: Cell) {
    const firstRow = Math.min(begin.row, end.row);
    const lastRow = Math.max(begin.row, end.row);
    const firstCol = Math.min(begin.col, end.col);
    const lastCol = Math.max(begin.col, end.col);

    const newCells = [];

    for (let row = firstRow; row < lastRow + 1; row++) {
      for (let col = firstCol; col < lastCol + 1; col++) {
        const cell = this.cellAtPosition(row, col);

        if (cell) {
          cell.setSelected(true);
          newCells.push(cell);

          if (row === firstRow) {
            if (col === firstCol) {
              this._addLassoTopLeft(cell.element);
              continue;
            } else if (col === lastCol) {
              this._addLassoTopRight(cell.element);
              continue;
            }
            this._addLassoTop(cell.element);
          } else if (row === lastRow) {
            if (col === firstCol) {
              this._addLassoBottomLeft(cell.element);
              continue;
            } else if (col === lastCol) {
              this._addLassoBottomRight(cell.element);
              continue;
            }
            this._addLassoBottom(cell.element);
          }

          if (col === firstCol) {
            this._addLassoLeft(cell.element);
          } else if (col === lastCol) {
            this._addLassoRight(cell.element);
          }
        }
      }
    }

    // Set selection to selected cells;
    this._selection = new Set([...Array.from(this._selection), ...newCells]);
  }

  public get selectionBounds(): CellBounds {
    let minRow = Number.POSITIVE_INFINITY;
    let maxRow = Number.NEGATIVE_INFINITY;
    let minCol = Number.POSITIVE_INFINITY;
    let maxCol = Number.NEGATIVE_INFINITY;

    for (const cell of this._selection) {
      if (cell.row <= minRow) minRow = cell.row;
      if (cell.col <= minCol) minCol = cell.col;
      if (cell.row >= maxRow) maxRow = cell.row;
      if (cell.col >= maxCol) maxCol = cell.col;
    }

    return {
      begin: {
        row: minRow,
        col: minCol,
      },
      end: {
        row: maxRow,
        col: maxCol,
      },
    };
  }

  private _resetSelection(): void {
    let i = 0;
    for (const cell of this._selection) {
      this._removeLasso(cell.element);
      cell.setSelected(false);
      i++;
    }
    this._selection.clear();
  }

  public resetSelection(): void {
    this._resetSelection();
    this.sendSelectEvent();
  }

  public cellAtPosition(row: number, col: number): Cell | undefined {
    const firstIndex = this._cells.findIndex((entry: Array<Cell>) =>
      entry.some((cell: Cell) => cell.row === row && cell.col === col)
    );
    if (firstIndex > -1) {
      const secondIndex = this._cells[firstIndex].findIndex(
        (cell: Cell) => cell.row === row && cell.col === col
      );
      return this._cells[firstIndex][secondIndex];
    }
    return;
  }

  private onPointer(cell: Cell, event: PointerEvent) {
    if (
      !this._options.multiselection ||
      (!this._altPressed && !this._contiguousPressed)
    ) {
      // alternate key (e.g. Command or Control) and continuous one (e.g. Shift) are not pressed

      if (this._activeCell && this._activeCell !== cell) {
        // Current cell is not the same as active one, or no active cell is defined for now: reset active cell
        // and all selection.

        this._activeCell.setActive(false);

        this._resetSelection();
        this._activeCell = undefined;
      }

      this._activeCell = cell.setActive(true);
      this._selection.add(cell.setSelected(true));
      this._addFullLasso(cell.element);

      this.sendSelectEvent();

      return;
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

          if (this._activeCell) {
            this._activeCell.setActive(false);
            this._removeLasso(this._activeCell.element);
            this._activeCell = undefined;

            // Remove lasso from all selected cells.
            for (const cell of this.selection) {
              this._removeLasso(cell.element);
            }
          }

          this._activeCell = cell.setActive(true);
          this._selection.add(cell.setSelected(true));
          this._addFullLasso(cell.element);
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

    this.sendSelectEvent();
  }

  private onKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      /**
       * Multiselection handlers with modifier keys.
       */
      case this._options.contiguousSelectionModifier: {
        if (!this._options.multiselection) return;

        this._contiguousPressed = true;
        break;
      }
      case this._options.altSelectionModifier: {
        if (!this._options.multiselection) return;

        this._altPressed = true;
        break;
      }

      /**
       * Keyboard navigation.
       */
      case this._options.keyDown: {
        if (!this._options.acceptsKeyboard || !this._activeCell) break;

        // Get next row and col according to current selection range.
        const bounds = this.selectionBounds;

        const baseRow =
          bounds.end.row > this._activeCell.row
            ? bounds.end.row
            : bounds.begin.row;

        const baseCol =
          bounds.end.col > this._activeCell.col
            ? bounds.end.col
            : bounds.begin.col;

        const nextRow = Math.min(baseRow + 1, this._cells.length - 1);
        const nextCol = baseCol;

        const cell = this.cellAtPosition(nextRow, nextCol);
        if (cell) {
          if (!this._contiguousPressed) {
            // Reset all selected cells.

            this._resetSelection();

            // Unset current active cell.

            this._activeCell.setActive(false);
            this._activeCell = undefined;

            // Set active and selected.

            this._activeCell = cell.setActive();
            this._selection.add(cell.setSelected());
            this._addFullLasso(cell.element);
          } else {
            // Reset all selected cells.
            this._resetSelection();

            this.selectRange(this._activeCell, cell);
          }
        }

        this.sendSelectEvent();

        break;
      }

      case this._options.keyUp: {
        if (!this._options.acceptsKeyboard || !this._activeCell) break;

        // Get next row and col according to current selection range.
        const bounds = this.selectionBounds;

        const baseRow =
          bounds.begin.row < this._activeCell.row
            ? bounds.begin.row
            : bounds.end.row;

        const baseCol =
          bounds.end.col > this._activeCell.col
            ? bounds.end.col
            : bounds.begin.col;

        const nextRow = Math.max(baseRow - 1, 0);
        const nextCol = baseCol;

        const cell = this.cellAtPosition(nextRow, nextCol);
        if (cell) {
          if (!this._contiguousPressed) {
            // Reset all selected cells.
            this._resetSelection();

            // Unset current active cell.
            this._activeCell.setActive(false);
            this._activeCell = undefined;

            // Set active and selected.

            this._activeCell = cell.setActive();
            this._selection.add(cell.setSelected());
            this._addFullLasso(cell.element);
          } else {
            // Reset all selected cells.
            this._resetSelection();

            this.selectRange(this._activeCell, cell);
          }
        }

        this.sendSelectEvent();

        break;
      }

      case this._options.keyLeft: {
        if (!this._options.acceptsKeyboard || !this._activeCell) break;

        // Get next row and col according to current selection range.
        const bounds = this.selectionBounds;

        const baseRow =
          bounds.end.row > this._activeCell.row
            ? bounds.end.row
            : bounds.begin.row;

        const baseCol =
          bounds.end.col > this._activeCell.col
            ? bounds.end.col
            : bounds.begin.col;

        const nextRow = baseRow;
        const nextCol = Math.max(baseCol - 1, 0);

        const cell = this.cellAtPosition(nextRow, nextCol);
        if (cell) {
          if (!this._contiguousPressed) {
            // Reset all selected cells.

            this._resetSelection();

            // Unset current active cell.

            this._activeCell.setActive(false);
            this._activeCell = undefined;

            // Set active and selected.

            this._activeCell = cell.setActive();
            this._selection.add(cell.setSelected());
            this._addFullLasso(cell.element);
          } else {
            // Reset all selected cells.
            this._resetSelection();

            this.selectRange(this._activeCell, cell);
          }
        }

        this.sendSelectEvent();

        break;
      }

      case this._options.keyRight: {
        if (!this._options.acceptsKeyboard || !this._activeCell) break;

        // Get next row and col according to current selection range.
        const bounds = this.selectionBounds;

        const baseRow =
          bounds.end.row > this._activeCell.row
            ? bounds.end.row
            : bounds.begin.row;

        const baseCol =
          bounds.end.col > this._activeCell.col
            ? bounds.end.col
            : bounds.begin.col;

        const nextRow = baseRow;
        const nextCol = Math.min(
          baseCol + 1,
          this._cells[this._activeCell.row].length - 1
        );

        const cell = this.cellAtPosition(nextRow, nextCol);
        if (cell) {
          if (!this._contiguousPressed) {
            // Reset all selected cells.

            this._resetSelection();

            // Unset current active cell.

            this._activeCell.setActive(false);
            this._activeCell = undefined;

            // Set active and selected.

            this._activeCell = cell.setActive();
            this._selection.add(cell.setSelected());
            this._addFullLasso(cell.element);
          } else {
            // Reset all selected cells.
            this._resetSelection();

            this.selectRange(this._activeCell, cell);
          }
        }

        this.sendSelectEvent();

        break;
      }
    }
  }

  private onKeyup(event: KeyboardEvent): void {
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
  }

  private sendSelectEvent(): void {
    const selectedRows = Array.from(
      new Set(Array.from(this.selection).map((cell: Cell) => cell.row))
    );
    const selectedCols = Array.from(
      new Set(Array.from(this.selection).map((cell: Cell) => cell.col))
    );

    for (const cell of this.selection) {
      selectedRows.push(cell.row);
      selectedCols.push(cell.col);
    }

    const event = new CustomEvent('select', {
      detail: {
        active: this._activeCell,
        selection: this._selection,
        bounds: this.selectionBounds,
        selectedRows,
        selectedCols,
      },
    });

    this._element.dispatchEvent(event);
  }

  public set element(element: HTMLElement) {
    for (const row of this._cells) {
      for (const col of row) {
        col.dispose();
      }
    }

    this._cells.length = 0;
    this._element = element;

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
    // Make sure previous event listeners are removed.

    this._element.removeEventListener('keydown', this._onBoundKeydown);
    this._element.removeEventListener('keyup', this._onBoundKeyup);

    this._options.multiselection = allow;

    if (this._options.multiselection) {
      this._element.addEventListener('keydown', this._onBoundKeydown);
      this._element.addEventListener('keyup', this._onBoundKeyup);
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
}
