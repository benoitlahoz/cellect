import { TableSelectOptions } from '../types/table-select.abstract';
import type {
  AbstractTableSelect,
  SelectionCoords,
} from 'types/table-select.abstract';
import { Cell } from './cell.module';
import type { CellBounds } from 'types/cell.abstract';
import { cellsFromSelectors } from '../functions';

const DEFAULT_OPTIONS: TableSelectOptions = {
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

export class TableSelect implements AbstractTableSelect {
  private _options: TableSelectOptions;

  private _element!: HTMLElement;

  private _cells: Array<Array<Cell>> = [];

  private _contiguousPressed = false;
  private _altPressed = false;

  private _activeCell: Cell | undefined;
  private _activeCoords: SelectionCoords = {
    pos: { x: 0, y: 0 },
    size: { width: 0, height: 0 },
  };

  private _selection: Set<Cell> = new Set();

  private _onBoundKeydown;
  private _onBoundKeyup;
  private _onBoundLassoStart;
  private _onBoundLasso;
  private _onBoundLassoEnd;

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
    // Remove events listeners associated.

    this.multiselection = false;
    this.clearOnBlur = false;

    this._element.setAttribute('draggable', 'false');

    if (this._options.useLasso || this._onBoundLassoStart) {
      this._element.removeEventListener(
        'dragstart',
        this._onBoundLassoStart as any
      );
    }

    // Dispose cells.

    for (const row of this._cells) {
      for (const cell of row) {
        cell.dispose();
      }
    }

    this._activeCell = undefined;

    this._computeActiveCoords();

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
        }
      }
    }

    // Set selection to selected cells.
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

  private _computeActiveCoords = (activeOnly = false): void => {
    // Compute coordinates of the selection.

    const firstCell: HTMLElement =
      activeOnly && this._activeCell
        ? this._activeCell.element
        : this._cells[this.selectionBounds.begin.row][
            this.selectionBounds.begin.col
          ].element;

    const lastCell: HTMLElement =
      activeOnly && this._activeCell
        ? this._activeCell.element
        : this._cells[this.selectionBounds.end.row][
            this.selectionBounds.end.col
          ].element;

    this._activeCoords = {
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
  };

  private _resetSelection(): void {
    let i = 0;
    for (const cell of this._selection) {
      cell.setSelected(false);
      i++;
    }
    this._selection.clear();
  }

  public resetSelection(): void {
    this._resetSelection();
    this.sendSelectEvent(null);
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

  private onLassoStart(event: DragEvent) {
    event.preventDefault();

    this._element.addEventListener('pointermove', this._onBoundLasso as any);
    window.addEventListener('pointerup', this._onBoundLassoEnd as any);
  }

  private onLasso(event: PointerEvent) {
    const element = document
      .elementsFromPoint(event.x, event.y)
      .find((element: Element) => element.classList.contains('col'));

    if (element && this._activeCell) {
      const row = element.getAttribute('data-table-select-row');
      const col = element.getAttribute('data-table-select-col');
      if (row && col) {
        const cell = this.cellAtPosition(parseInt(row), parseInt(col));
        if (cell) {
          this._resetSelection();
          this.selectRange(this._activeCell, cell);
          this.sendSelectEvent(event);
        }
      }
    }
  }

  private onLassoEnd(event: PointerEvent) {
    this._element.removeEventListener('pointermove', this._onBoundLasso as any);
    window.removeEventListener('pointerup', this._onBoundLassoEnd as any);
  }

  private onPointer(cell: Cell, event: PointerEvent) {
    if (
      !this._options.multiselection ||
      (!this._altPressed && !this._contiguousPressed)
    ) {
      // alternate key (e.g. Command or Control) and continuous one (e.g. Shift) are not pressed

      if (this._activeCell !== cell) {
        // Current cell is not the same as active one, or no active cell is defined for now: reset active cell
        // and all selection.

        if (this._activeCell) {
          this._activeCell.setActive(false);
        }

        this._resetSelection();
        this._activeCell = undefined;
      }

      this._activeCell = cell.setActive(true);
      this._selection.add(cell.setSelected(true));

      this.sendSelectEvent(event);

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
            this._activeCell = undefined;
          }

          this._activeCell = cell.setActive(true);
          this._selection.add(cell.setSelected(true));
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

    this.sendSelectEvent(event);
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
        if (!this._options.useKeyboard || !this._activeCell) break;

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
          } else {
            // Reset all selected cells.
            this._resetSelection();

            this.selectRange(this._activeCell, cell);
          }
        }

        this.sendSelectEvent(event);

        break;
      }

      case this._options.keyUp: {
        if (!this._options.useKeyboard || !this._activeCell) break;

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
          } else {
            // Reset all selected cells.
            this._resetSelection();

            this.selectRange(this._activeCell, cell);
          }
        }

        this.sendSelectEvent(event);

        break;
      }

      case this._options.keyLeft: {
        if (!this._options.useKeyboard || !this._activeCell) break;

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
          } else {
            // Reset all selected cells.
            this._resetSelection();

            this.selectRange(this._activeCell, cell);
          }
        }

        this.sendSelectEvent(event);

        break;
      }

      case this._options.keyRight: {
        if (!this._options.useKeyboard || !this._activeCell) break;

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
          } else {
            // Reset all selected cells.
            this._resetSelection();

            this.selectRange(this._activeCell, cell);
          }
        }

        this.sendSelectEvent(event);

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

  private sendSelectEvent(e: any): void {
    // Get selected rows and columns indexes.

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

    // Compute coordinates of the selection / active cell (if alt modifier is pressed).
    this._computeActiveCoords(this._altPressed);

    const event = new CustomEvent('select', {
      detail: {
        // Original event.
        event: e,
        active: this._activeCell,
        selection: this._selection,
        bounds: this.selectionBounds,
        coords: this._activeCoords,
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
}
