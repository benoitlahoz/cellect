/**
 * Gets the value of a CSS property of an `HTMLElement`.
 *
 * @param { HTMLElement } element The element to get property from.
 * @param { string } prop The property.
 *
 * @returns { string } The value of the property.
 */
export const getCSSStyle = (element: HTMLElement, prop: string): string => {
  // @ts-ignore
  if (element.currentStyle) {
    // @ts-ignore
    return element.currentStyle[prop];
  }

  return document
    .defaultView!.getComputedStyle(element, null)
    .getPropertyValue(prop);
};

export const getPixelsForCSS = (
  element: HTMLElement,
  variable: string
): number => {
  const style = getCSSStyle(element, variable);

  if (style.length > 0) {
    const temp = document.createElement('div');
    temp.style.width = style;
    document.body.appendChild(temp);

    const size = temp.offsetWidth;
    temp.remove();
    return size;
  }

  return NaN;
};

export const getLinesForCSSUnitProp = (
  element: HTMLElement,
  prop: string
): number => {
  const size = getPixelsForCSS(element, prop);
  if (!isNaN(size)) {
    return Math.floor(element.scrollHeight / size);
  }

  return NaN;
};

/**
 * Inserts or replaces a CSS rule in a given `CSSStyleSheet`.
 *
 * @param { CSSStyleSheet } sheet The style sheet to insert / replace a rule in.
 * @param { string } selector The CSS selector.
 * @param { string } prop The property of the selector.
 * @param { string } value The value of the property.
 */
export const setCSSStyle = (
  sheet: CSSStyleSheet,
  selector: string,
  prop: string,
  value: string
) => {
  const rules = sheet.cssRules || sheet.rules;

  // Replace rule.

  for (let i = 0, len = rules.length; i < len; i++) {
    if ((rules[i] as CSSStyleRule).selectorText === selector) {
      (rules[i] as CSSStyleRule).style[prop as any] = value;
      return;
    }
  }

  // Insert rule.

  sheet.insertRule(`${selector} { ${prop}: ${value}; }`, rules.length);
};
