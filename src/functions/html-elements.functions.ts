export const cellsFromSelectors =
  (rowSelector: string, colSelector: string) => (element: HTMLElement) => {
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

export const getElementsByClassName =
  (selector: string) =>
  (element: HTMLElement): Array<Element> => {
    return Array.from(element.getElementsByClassName(selector));
  };

export const getFirstElementByClassName =
  (selector: string) =>
  (element: HTMLElement): Element | undefined => {
    const arr = getElementsByClassName(selector)(element);
    if (arr.length > 0) return arr[0];

    return;
  };

export const addClass =
  (...args: string[]) =>
  (element: HTMLElement) => {
    element.classList.add(...args);
  };

export const removeClass =
  (...args: string[]) =>
  (element: HTMLElement) => {
    element.classList.remove(...args);
  };
