<script lang="ts">
export default {
  name: 'SpreadSheetUse',
};
</script>
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick, unref } from 'vue';
import type { Ref } from 'vue';
import {
  getCSSStyle,
  getPixelsForCSS,
  getLinesForCSSUnitProp,
  setCSSStyle,
  numberToSpreadsheetColumn,
} from '../../../src/utils';
import { useTableSelect } from '../../../src/useTableSelect';
import type { AbstractCell, CellBounds, CellRange } from '../../../src/types';
import { TableSelectDataAttributes } from '../../../src/modules';

const emit = defineEmits(['select']);

const data: Ref<Array<Array<any>>> = ref([]);
const tableRef: Ref<HTMLElement | undefined> = ref();
const lassoRef: Ref<HTMLElement | undefined> = ref();
const lassoMoveRef: Ref<HTMLElement | undefined> = ref();
const textareaRef: Ref<HTMLTextAreaElement | undefined> = ref();

let styleElement: HTMLStyleElement;
const border: Ref<string> = ref('');
const lassoBorder: Ref<string> = ref('');

const edited = ref({
  row: -1,
  col: -1,
});

const {
  selection,
  activeCell,
  selectionBounds,
  selectedRows,
  selectedCols,
  activeRect,

  cellAtIndex,

  selectOne,
  selectRow,
  selectCol,
  selectAll,
  selectRangeByIndex,
  couldSelectRangeByIndex,
  resetSelection,

  isLocked,
  lockSelection,
  unlockSelection,

  contiguousModifier,
  altModifier,
  resetModifiers,

  computeActiveRect,
} = useTableSelect(tableRef, data, {
  rowSelector: 'row',
  colSelector: 'col',
  selectedSelector: 'selected',
  activeSelector: 'active',
  resetOnChange: false,
  clearOnBlur: false,
});

const selectedData = ref();

watch(
  () => [
    selection.value,
    activeCell.value,
    selectionBounds.value,
    selectedRows.value,
    selectedCols.value,
    activeRect.value,
  ],
  () => {
    nextTick(() => {
      handleLasso();
    });

    selectedData.value = Array.from(selection.value)
      .filter(
        (cell: AbstractCell) =>
          typeof data.value[cell.row][cell.col] !== 'undefined'
      )
      .map((cell: AbstractCell) => {
        return {
          cell,
          data: data.value[cell.row][cell.col],
        };
      });

    emit('select', {
      data: selectedData.value,
      rows: selectedRows.value,
      cols: selectedCols.value,
    });
  },
  { immediate: true, deep: true }
);

onMounted(() => {
  for (let row = 0; row < 20; row++) {
    const cols = [];
    for (let col = 0; col < 20; col++) {
      cols[col] = undefined; // `${row} ${col}`;
    }
    data.value.push(cols);
  }

  mountStyle();

  const timeout = setTimeout(() => {
    selectOne(0, 0);

    if (tableRef.value) {
      tableRef.value.focus();
    }

    // Placed here because of Firefox time to load.
    border.value = getCSSStyle(document.body, '--ts-border-size');
    lassoBorder.value = getCSSStyle(document.body, '--ts-lasso-border-size');

    clearTimeout(timeout);
  }, 10);
});

const handleLasso = () => {
  const rect = activeRect.value;

  if (lassoRef.value) {
    if (selection.value.size > 0) {
      lassoRef.value.style.display = '';
      lassoRef.value.style.left = `${rect.pos.x}px`;
      lassoRef.value.style.top = `${rect.pos.y}px`;
      lassoRef.value.style.width = `calc(${rect.size.width}px - ${border.value} - ${lassoBorder.value})`;
      lassoRef.value.style.height = `calc(${rect.size.height}px - ${lassoBorder.value})`;
    } else {
      lassoRef.value.style.display = 'none';
    }
  }
};

const mountStyle = () => {
  styleElement = document.createElement('style');
  document.head.appendChild(styleElement);
};

onBeforeUnmount(() => {
  //
});

const onSelectAll = () => {
  if (tableRef.value) {
    tableRef.value.focus();
  }
  selectAll(true);
};

const onClickRow = (event: PointerEvent, row: number) => {
  if ((event.target as HTMLElement).classList.contains('resize-handle'))
    return false;

  const shift = event.shiftKey;
  const cmdOrControl = navigator.userAgent.toLowerCase().includes('mac')
    ? event.metaKey
    : event.ctrlKey;

  if ((shift && cmdOrControl) || (!shift && !cmdOrControl)) {
    // Replace selection adn set active cell at the beginning of the row.
    selectRow(row, true, true);
  } else if (cmdOrControl && !shift) {
    // Add to selection and move active cell.
    selectRow(row, true, false);
  } else {
    // Shift is pressed.

    if (activeCell.value) {
      const activeRow = activeCell.value.row;

      // const existingRange =
      const begin = row > activeRow ? activeRow + 1 : row;
      const end = row < activeRow ? activeRow - 1 : row;

      console.log(row, activeCell.value.row, begin, end, selectedRows.value);

      for (let i = begin; i <= end; i++) {
        selectRow(i, false, false);
      }
    } else {
      selectRow(row, true, true);
    }
  }

  if (tableRef.value) {
    tableRef.value.focus();
  }
};

const onClickCol = (event: PointerEvent, col: number) => {
  if ((event.target as HTMLElement).classList.contains('resize-handle'))
    return false;

  const shift = event.shiftKey;
  const cmdOrControl = navigator.userAgent.toLowerCase().includes('mac')
    ? event.metaKey
    : event.ctrlKey;

  if ((shift && cmdOrControl) || (!shift && !cmdOrControl)) {
    // Replace selection.
    selectCol(col, true);
  } else if (cmdOrControl && !shift) {
    // Add to selection.
    selectCol(col, false);
  } else {
    // Shift is pressed.

    if (activeCell.value) {
      const begin = col > activeCell.value.col ? activeCell.value.col : col;
      const end = col < activeCell.value.col ? activeCell.value.col : col;

      for (let i = begin; i <= end; i++) {
        selectCol(i, false);
      }
    } else {
      selectCol(col, true);
    }
  }

  if (tableRef.value) {
    tableRef.value.focus();
  }
};

const onResizeRow = (event: DragEvent, index: number) => {
  // FIXME: happens after 'click' (that selects the row).

  // To avoid the jump on release
  // https://stackoverflow.com/a/47241403/1060921
  if (!event.screenX && !event.screenY) return;

  // Get parent (row) of the draggable element.
  const parent = (event.target as HTMLElement).parentElement;

  setCSSStyle(
    styleElement.sheet!,
    `.row-${index}`,
    'min-height',
    `${parent!.offsetHeight + event.offsetY}px`
  );

  computeActiveRect();

  if (tableRef.value) {
    tableRef.value.focus();
  }
};

const onResizeCol = (event: DragEvent, index: number) => {
  if (!event.screenX && !event.screenY) return;

  // Get parent (row) of the draggable element.
  const parent = (event.target as HTMLElement).parentElement;

  setCSSStyle(
    styleElement.sheet!,
    `.col-${index}`,
    'min-width',
    `${parent!.offsetWidth + event.offsetX}px`
  );

  computeActiveRect();

  if (tableRef.value) {
    tableRef.value.focus();
  }
};

let srcSelection: CellBounds | undefined = undefined;
let srcRange: CellRange | undefined = undefined;
let dstRange: CellRange | undefined = undefined;
const onMoveStart = (event: DragEvent) => {
  srcSelection = unref(selectionBounds);

  if (selectionBounds.value) {
    srcRange = {
      index: {
        row: selectionBounds.value.begin.row,
        col: selectionBounds.value.begin.col,
      },
      size: {
        width:
          selectionBounds.value.end.col - selectionBounds.value.begin.col + 1,
        height:
          selectionBounds.value.end.row - selectionBounds.value.begin.row + 1,
      },
    };

    lockSelection();

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onWindowUp);
  }
};

const onMove = (event: any) => {
  const element = document
    .elementsFromPoint(event.x, event.y)
    .find((element: Element) =>
      element.classList.contains('col')
    ) as HTMLElement;

  if (element) {
    const row = element.getAttribute(TableSelectDataAttributes.Row);
    const col = element.getAttribute(TableSelectDataAttributes.Col);

    if (row && col && srcSelection) {
      dstRange = {
        index: {
          row: parseInt(row),
          col: parseInt(col),
        },
        size: srcRange!.size,
      };

      const endCell = cellAtIndex(
        parseInt(row) + srcRange!.size.height - 1,
        parseInt(col) + srcRange!.size.width - 1
      );
      const endElement = endCell!.element;

      // console.log(row, col);

      const rect = {
        pos: {
          x: element.offsetLeft,
          y: element.offsetTop,
        },
        size: {
          width:
            endElement.offsetLeft + endElement.offsetWidth - element.offsetLeft,
          height:
            endElement.offsetTop + endElement.offsetHeight - element.offsetTop,
        },
      };

      if (lassoMoveRef.value) {
        lassoMoveRef.value.style.display = '';
        lassoMoveRef.value.style.left = `${rect.pos.x}px`;
        lassoMoveRef.value.style.top = `${rect.pos.y}px`;
        lassoMoveRef.value.style.width = `calc(${rect.size.width}px - ${border.value} - ${lassoBorder.value})`;
        lassoMoveRef.value.style.height = `calc(${rect.size.height}px - ${lassoBorder.value})`;
      }

      // resetSelection(false);
      // console.log(couldSelectRangeByIndex(newBounds.begin, newBounds.end));
    }
  }
};

const onWindowUp = () => {
  window.removeEventListener('pointermove', onMove);
  window.removeEventListener('pointerup', onWindowUp);
  unlockSelection();

  if (srcRange && dstRange) {
    for (let row = 0; row < srcRange.size.height; row++) {
      for (let col = 0; col < srcRange.size.width; col++) {
        const srcData =
          data.value[srcRange.index.row + row][srcRange.index.col + col];

        data.value[dstRange.index.row + row][dstRange.index.col + col] =
          srcData;
        data.value[srcRange.index.row + row][srcRange.index.col + col] =
          undefined;
      }
    }

    resetSelection(false);
    selectRangeByIndex(
      {
        row: dstRange.index.row,
        col: dstRange.index.col,
      },
      {
        row: dstRange.index.row + dstRange.size.height - 1,
        col: dstRange.index.col + dstRange.size.width - 1,
      },
      true
    );

    // TODO: set active
  }

  if (lassoMoveRef.value) lassoMoveRef.value.style.display = 'none';
};

/**
 * Textarea element events handlers
 */

const onDoubleClick = (event: PointerEvent, row: number, col: number) => {
  edited.value.row = row;
  edited.value.col = col;

  nextTick(() => {
    if (textareaRef.value) {
      resetModifiers();
      lockSelection();

      // WARNING: the element ref is transformed by Vue into an array (because of its 'v-if').
      const textarea = (
        textareaRef.value as unknown as Array<HTMLTextAreaElement>
      )[0];
      textarea.readOnly = false;
      textarea.focus();
    }
  });
};

const onInput = (event: InputEvent, row: number, col: number) => {
  const target = event.target as HTMLTextAreaElement;
  const value = target.value;

  data.value[row][col] = value;

  resizeTextarea(target, row, col);
};

const onBlur = (event: Event, row: number, col: number) => {
  const target = event.target as HTMLTextAreaElement;
  target.readOnly = true;

  edited.value.row = -1;
  edited.value.col = -1;

  if (tableRef.value) {
    unlockSelection();
    tableRef.value.focus();
  }
};

const onEnter = (event: KeyboardEvent, row: number, col: number) => {
  const target = event.target as HTMLTextAreaElement;

  if (!event.altKey) {
    const row = edited.value.row;
    const col = edited.value.col;

    target.blur();

    edited.value.row = -1;
    edited.value.col = -1;

    if (tableRef.value) {
      unlockSelection();
      tableRef.value.focus();

      // Select the next cell (like in Microsoft Excel).
      selectOne(
        Math.min(row + 1, data.value.length),
        col,
        selection.value.size === 1,
        selection.value.size > 1,
        true
      );
    }

    return;
  }

  target.value = `${target.value}\r\n`;
  resizeTextarea(target, row, col);
};

const resizeTextarea = (
  target: HTMLTextAreaElement,
  row: number,
  col: number
) => {
  const lineHeigth = getPixelsForCSS(target, '--ts-row-height');
  const lines = getLinesForCSSUnitProp(target, '--ts-row-height');

  target.rows = lines;
  target.style.height = `${lineHeigth * lines}px`;

  setCSSStyle(styleElement.sheet!, `.row-${row}`, 'min-height', `${lines}lh`);

  computeActiveRect();
};
</script>
<template lang="pug">
.spreadsheet-table-container
    .spreadsheet-row-indexes
        .spreadsheet-select-all(
          @click="onSelectAll"
        )
          .triangle
        .spreadsheet-row-header(
            v-for="index in data.length",
            :class="`row-${index - 1}`, {'selected': selectedRows.includes(index - 1)}",
            :key="`row-${index - 1}`",

            @mousedown="onClickRow($event, index - 1)"
        ) 
          .index {{ index }}
          .resize-handle(
            draggable="true",

            @drag="onResizeRow($event, index - 1)",
          )


    .spreadsheet-table-main
        .spreadsheet-col-indexes
            .spreadsheet-col-header(
                v-if="data.length > 0",
                v-for="index in (data[0].length)",
                :class="`col-${index-1}`, {'selected': selectedCols.includes(index - 1)}",

                @mousedown="onClickCol($event, index - 1)"
            ) 
                .index {{ numberToSpreadsheetColumn(index - 1) }}
                .resize-handle(
                  draggable="true",
                  @drag="onResizeCol($event, index - 1)"
                )
                
        .spreadsheet-table(
            ref="tableRef"
        )
            .lasso(
              ref="lassoRef",
              style="display: none"
            )
              .lasso-move-handle.top(
                draggable="true",
                @dragstart="onMoveStart",
              )
              .lasso-move-handle.left(
                draggable="true",
                @dragstart="onMoveStart",
              )
              .lasso-move-handle.right(
                draggable="true",
                @dragstart="onMoveStart",
              )
              .lasso-move-handle.bottom(
                draggable="true",
                @dragstart="onMoveStart",
              )

              .lasso-extend-handle

            .lasso-move(
              ref="lassoMoveRef"
            )

            .row(
                v-for="(row, rowIndex) in data",
                :key="rowIndex",
                :id="`row-${rowIndex}`",
                :class="`row-${rowIndex}`"
            )
                .col(
                    v-for="(col, colIndex) in row",
                    :key="`${rowIndex}-${colIndex}`",
                    :id="`col-${rowIndex}-${colIndex}`",
                    :class="`col-${colIndex}`"

                    @dblclick="onDoubleClick($event, rowIndex, colIndex)",
                )
                    textarea( 
                      v-if="edited.row === rowIndex && edited.col === colIndex",

                      ref="textareaRef",

                      :value="col", 
                      :readonly="true", 
                      @input="onInput($event, rowIndex,colIndex)", 
                      @keydown.enter="onEnter($event, rowIndex, colIndex)", 
                      @blur="onBlur($event, rowIndex, colIndex)" 
                    )
                    .spreadsheet-cell-value(
                      v-else,
                      :innerText="col"
                    ) 
</template>
<style lang="sass">
@use "./spread-sheet"

.lasso
    position: absolute
    border-radius: var(--ts-lasso-radius)
    border: var(--ts-lasso-border-size) solid var(--ts-lasso-color)
    pointer-events: none
    transition: all 0.1s

    .lasso-extend-handle
      position: absolute
      right: calc(var(--ts-lasso-handles-size) * -0.5)
      bottom: calc(var(--ts-lasso-handles-size) * -0.5)
      width: var(--ts-lasso-handles-size)
      height: var(--ts-lasso-handles-size)
      background: var(--ts-lasso-extend-handle-color)
      pointer-events: all

      &:hover
        cursor: crosshair

    .lasso-move-handle
      position: absolute
      background: var(--ts-lasso-move-handle-color)
      cursor: grab
      pointer-events: all

      &.top
        height: var(--ts-lasso-handles-size)
        top: calc(var(--ts-lasso-handles-size) * -1)
        left: calc(var(--ts-lasso-handles-size) * -0.5)
        right: calc(var(--ts-lasso-handles-size) * -0.5)
        z-index: 1

      &.bottom
        height: var(--ts-lasso-handles-size)
        bottom: calc(var(--ts-lasso-handles-size) * -1)
        left: calc(var(--ts-lasso-handles-size) * -0.5)
        right: calc(var(--ts-lasso-handles-size) * 0.5)
        z-index: 1

      &.right
        width: var(--ts-lasso-handles-size)
        top: calc(var(--ts-lasso-handles-size) * -1)
        right: calc(var(--ts-lasso-handles-size) * -0.5)
        bottom: calc(var(--ts-lasso-handles-size) * 0.5)
        z-index: 1

      &.left
        width: var(--ts-lasso-handles-size)
        left: calc(var(--ts-lasso-handles-size) * -1)
        top: calc(var(--ts-lasso-handles-size) * -1)
        bottom: calc(var(--ts-lasso-handles-size) * -1)
        z-index: 1

.lasso-move
    position: absolute
    border-radius: var(--ts-lasso-radius)
    border: var(--ts-lasso-border-size) solid red
    pointer-events: none
</style>
