import type { AbstractCell, CellBounds } from 'types';
import { getElementsByClassName } from '../functions';

/**
 * Get an array of `AbstractCell` elements from selectors.
 *
 * @param { string } rowSelector The CSS selector to get rows.
 * @param { string } colSelector The CSS selector to get columns.
 *
 * @returns { (element: HTMLElement ): Array<Array<Element>> } A function to get an array of arrays of cells elements.
 */
export const cellsFromSelectors =
  (rowSelector: string, colSelector: string) =>
  (element: HTMLElement): Array<Array<Element>> => {
    if (!element) {
      throw new Error('Element may not be mounted.');
    }

    const cellElements = [];

    // Generic functions for selectors.
    const getChildrenForRowSelector = getElementsByClassName(rowSelector);
    const getChildrenForColSelector = getElementsByClassName(colSelector);

    const rows = getChildrenForRowSelector(element);
    for (const row of rows) {
      const cols = getChildrenForColSelector(row as HTMLElement);
      const colsCells = [];
      for (const col of cols) {
        colsCells.push(col);
      }
      cellElements.push(colsCells);
    }

    return cellElements;
  };

/**
 * Returns an `AbstractCell` at the given row and column index.
 *
 * @param { Array<Array<AbstractCell>> } cells The array of arrays of `AbstractCell` to get cell from.
 * @param { number } row The row to search for.
 * @param { number } col The column to search for.
 *
 * @returns { AbstractCell | undefined } An `AbstractCell` at position or `undefined` if not found.
 */
export const cellAtIndex = (
  cells: Array<Array<AbstractCell>>,
  row: number,
  col: number
): AbstractCell | undefined => {
  const firstIndex = cells.findIndex((entry: Array<AbstractCell>) =>
    entry.some((cell: AbstractCell) => cell.row === row && cell.col === col)
  );
  if (firstIndex > -1) {
    const secondIndex = cells[firstIndex].findIndex(
      (cell: AbstractCell) => cell.row === row && cell.col === col
    );
    return cells[firstIndex][secondIndex];
  }
  return;
};

/**
 * Computes minimum and maximum rows and columns for a given selection `Set` of `AsbtractCell`
 * .
 * @param {  Set<AbstractCell> } selection The selection to compute.
 *
 * @returns { CellBounds } The boundaries of the selection in indexes of `row` and `col`.
 */
export const boundsForSelection = (
  selection: Set<AbstractCell>
): CellBounds => {
  let minRow = Number.POSITIVE_INFINITY;
  let maxRow = Number.NEGATIVE_INFINITY;
  let minCol = Number.POSITIVE_INFINITY;
  let maxCol = Number.NEGATIVE_INFINITY;

  for (const cell of selection) {
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
};

/**
 * Select / unselect a range of `AbstractCell` and add it to the given selection.
 * It will compute which are the first and last rows and columns according to the passed cells.
 *
 * @param { Array<Array<AbstractCell>> } cells The base array of arrays of `AbstractCell`.
 * @param { Set<AbstractCell> } selection The current selection.
 * @param { AbstractCell } begin The first cell in range.
 * @param { AbstractCell } end The last cell in range.
 * @param { number } unselect Unselect instead of selecting.
 *
 * @returns { Set<AbstractCell> } A new range of selected cells.
 */
export const selectRange = (
  cells: Array<Array<AbstractCell>>,
  selection: Set<AbstractCell>,
  begin?: AbstractCell,
  end?: AbstractCell,
  unselect = false
): Set<AbstractCell> => {
  if (begin && end) {
    const firstRow = Math.min(begin.row, end.row);
    const lastRow = Math.max(begin.row, end.row);
    const firstCol = Math.min(begin.col, end.col);
    const lastCol = Math.max(begin.col, end.col);

    const newCells = [];

    for (let row = firstRow; row < lastRow + 1; row++) {
      for (let col = firstCol; col < lastCol + 1; col++) {
        const cell = cellAtIndex(cells, row, col);

        if (cell) {
          cell.setSelected(!unselect);
          if (!unselect) newCells.push(cell);
        }
      }
    }

    return new Set([...Array.from(selection), ...newCells]);
  }

  return new Set();
};

/**
 * Selects all the cells and returns the new selecion `Set`.
 * @param { Array<Array<AbstractCell>> } cells The base array of arrays of `AbstractCell`.
 *
 * @returns { Set<AbstractCell> } The new selection.
 */
export const selectAll = (cells: Array<Array<AbstractCell>>) => {
  const newSelection = [];
  for (const row of cells) {
    for (const cell of row) {
      newSelection.push(cell.setSelected(true));
    }
  }
  return new Set(newSelection);
};

export const nextCellOn = (
  direction: 'down' | 'up' | 'left' | 'right',
  cells: Array<Array<AbstractCell>>,
  selection: Set<AbstractCell>,
  active: AbstractCell,
  fromActive: boolean = false
): AbstractCell | undefined => {
  const bounds = boundsForSelection(selection);

  let nextRow: number = -1;
  let nextCol: number = -1;

  const baseCol =
    bounds.end.col > active.col ? bounds.end.col : bounds.begin.col;

  switch (direction) {
    case 'up': {
      const baseRow =
        bounds.begin.row < active.row ? bounds.begin.row : bounds.end.row;

      nextRow = fromActive
        ? Math.max(active.row - 1, 0)
        : Math.max(baseRow - 1, 0);
      nextCol = fromActive ? active.col : baseCol;

      break;
    }
    case 'left': {
      const baseRow =
        bounds.end.row > active.row ? bounds.end.row : bounds.begin.row;

      nextRow = fromActive ? active.row : baseRow;
      nextCol = fromActive
        ? Math.max(active.col - 1, 0)
        : Math.max(baseCol - 1, 0);

      break;
    }
    case 'right': {
      const baseRow =
        bounds.end.row > active.row ? bounds.end.row : bounds.begin.row;

      nextRow = fromActive ? active.row : baseRow;
      nextCol = fromActive
        ? Math.min(active.col + 1, cells[active.row].length)
        : Math.min(baseCol + 1, cells[active.row].length - 1);

      break;
    }
    default:
    case 'down': {
      const baseRow =
        bounds.end.row > active.row ? bounds.end.row : bounds.begin.row;

      nextRow = fromActive
        ? Math.min(active.row + 1, cells.length - 1)
        : Math.min(baseRow + 1, cells.length - 1);
      nextCol = fromActive ? active.col : baseCol;

      break;
    }
  }

  return cellAtIndex(cells, nextRow, nextCol);
};
