import { inject, onMounted, ref, type Ref } from 'vue';
import type { CellRange } from 'cell-collection';
import { HTMLCellDataAttributes } from 'cell-collection/dom';
import { UseTableSelectReturn } from '../../../src/useTableSelect';
import type { UseStyle } from './useStyle';
import { UseStyleKey } from '../injection-keys.types';

export const useSelectionMove = (
  tableSelect: UseTableSelectReturn,
  data: Ref<Array<Array<any>>>,
  element: Ref<HTMLElement | undefined>
) => {
  const useStyle = inject<UseStyle>(UseStyleKey);
  if (!useStyle) {
    throw new Error(`Could not resolve ${UseStyleKey.description}`);
  }

  const { getCSSStyle } = useStyle();

  const {
    selection,
    selectionBounds,
    cellAtIndex,
    selectRange,
    lockSelection,
    unlockSelection,
  } = tableSelect;

  const border = ref();
  const lassoBorder = ref();
  let srcRange: CellRange | undefined = undefined;
  let dstRange: CellRange | undefined = undefined;

  onMounted(() => {
    const timeout = setTimeout(() => {
      // Placed here because of Firefox time to load.
      border.value = getCSSStyle(document.body, '--ts-border-size');
      lassoBorder.value = getCSSStyle(document.body, '--ts-lasso-border-size');

      clearTimeout(timeout);
    }, 10);
  });

  const onMoveStart = () => {
    if (selectionBounds.value && element.value) {
      srcRange = {
        index: {
          row: selectionBounds.value.begin.row,
          col: selectionBounds.value.begin.col,
        },
        size: {
          width:
            selectionBounds.value.end.col! -
            selectionBounds.value.begin.col! +
            1,
          height:
            selectionBounds.value.end.row - selectionBounds.value.begin.row + 1,
        },
      };

      lockSelection();

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onWindowUp);

      element.value.style.display = '';
    }
  };

  const onMove = (event: any) => {
    const el = document
      .elementsFromPoint(event.x, event.y)
      .find((e: Element) => e.classList.contains('col')) as HTMLElement;

    if (el) {
      const row = el.getAttribute(HTMLCellDataAttributes.Row);
      const col = el.getAttribute(HTMLCellDataAttributes.Col);

      if (row && col && srcRange) {
        dstRange = {
          index: {
            row: parseInt(row),
            col: parseInt(col),
          },
          size: srcRange.size,
        };

        const endCell = cellAtIndex(
          parseInt(row) + srcRange.size.height! - 1,
          parseInt(col) + srcRange.size.width - 1
        );

        if (endCell) {
          const endElement = endCell.element;

          if (element.value && endElement) {
            const rect = {
              pos: {
                x: el.offsetLeft,
                y: el.offsetTop,
              },
              size: {
                width:
                  endElement.offsetLeft +
                  endElement.offsetWidth -
                  el.offsetLeft,
                height:
                  endElement.offsetTop + endElement.offsetHeight - el.offsetTop,
              },
            };

            element.value.style.display = '';
            element.value.style.left = `${rect.pos.x}px`;
            element.value.style.top = `${rect.pos.y}px`;
            element.value.style.width = `calc(${rect.size.width}px - ${border.value} - ${lassoBorder.value})`;
            element.value.style.height = `calc(${rect.size.height}px - ${lassoBorder.value})`;
          }
        }
      }
    }
  };

  const onWindowUp = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onWindowUp);
    unlockSelection();

    if (srcRange && dstRange && element.value) {
      const copy = [];

      for (let row = 0; row < srcRange.size.height!; row++) {
        for (let col = 0; col < srcRange.size.width; col++) {
          copy.push({
            data: data.value[srcRange.index.row + row][
              srcRange.index.col! + col
            ],
            row: dstRange.index.row + row,
            col: dstRange.index.col! + col,
          });

          data.value[srcRange.index.row + row][srcRange.index.col! + col] =
            undefined;
        }
      }

      for (const item of copy) {
        data.value[item.row][item.col] = item.data;
      }

      selection.value.unselect();
      selection.value.blur();
      selectRange(
        {
          row: dstRange.index.row,
          col: dstRange.index.col,
        },
        {
          row: dstRange.index.row + dstRange.size.height! - 1,
          col: dstRange.index.col! + dstRange.size.width - 1,
        }
      ).focus(); // FIXME: 'focused' is not updated -> focus method in TableSelect that sends an event.

      element.value.style.display = 'none';
    }
  };

  return {
    onMoveStart,
  };
};
