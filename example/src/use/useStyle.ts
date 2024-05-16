import { onMounted } from 'vue';
import {
  getCSSStyle as getStyle,
  getPixelsForCSS as getPixels,
  getLinesForCSSUnitProp as getLines,
  setCSSStyle as setStyle,
} from '../../../src/utils';

export interface UseStyleReturn {
  styleElement: HTMLStyleElement | undefined;
  setCSSStyle: (selector: string, prop: string, value: string) => void;
  getCSSStyle: typeof getStyle;
  getPixelsForCSS: typeof getPixels;
  getLinesForCSSUnitProp: typeof getLines;
}

export interface UseStyle {
  (): UseStyleReturn;
}

let styleElement: HTMLStyleElement | undefined = undefined;

export const useStyle: UseStyle = () => {
  onMounted(() => {
    if (!styleElement) {
      styleElement = document.createElement('style');
      document.head.appendChild(styleElement);
    }
  });

  const setCSSStyle = (selector: string, prop: string, value: string): void => {
    if (!styleElement || !styleElement.sheet) {
      throw new Error('`style` element may not be mounted yet.');
    }

    setStyle(styleElement.sheet, selector, prop, value);
  };

  const getCSSStyle = getStyle;

  const getPixelsForCSS = getPixels;

  const getLinesForCSSUnitProp = getLines;

  return {
    styleElement,
    setCSSStyle,
    getCSSStyle,
    getPixelsForCSS,
    getLinesForCSSUnitProp,
  };
};
