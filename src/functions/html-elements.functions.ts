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

export const addListener =
  (element: Element) =>
  (channel: string, listener: EventListener, options?: any) => {
    element.addEventListener(channel, listener, options);
  };

export const removeListener =
  (element: Element) =>
  (channel: string, listener: EventListener, options?: any) => {
    element.removeEventListener(channel, listener, options);
  };
