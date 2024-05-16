import { getElementsByClassName } from '../utils';

/**
 * Get a 2D `Array` of elements from row and column selectors.
 *
 * @param { string } rowSelector The CSS selector to get rows.
 * @param { string } colSelector The CSS selector to get columns.
 *
 * @returns { (element: HTMLElement ): Array<Array<Element>> } A function to get an array of arrays of elements.
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
