<script lang="ts">
export default {
  name: 'SpreadSheet',
};
</script>
<script setup lang="ts">
import {
  ref,
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick,
  provide,
  inject,
  toRaw,
} from 'vue';
import type { Ref } from 'vue';
import { numberToSpreadsheetColumn } from './spread-sheet.utils';
import { useCellect, CellectKey } from '../../../../src/useCellect';
import type { AbstractCell } from 'cell-collection';

import type { UseStyle } from '../../use/useStyle';
import { UseStyleKey } from '../../injection-keys.types';

import { useSelectionMove } from '../../use/useSelectionMove';

import SpreadSheetItem from './spread-sheet-item.component.vue';

const emit = defineEmits(['select']);

const data: Ref<Array<Array<any>>> = ref([]);
const tableRef: Ref<HTMLElement | undefined> = ref();
const lassoRef: Ref<HTMLElement | undefined> = ref();
const lassoMoveRef: Ref<HTMLElement | undefined> = ref();

const lassoBorder: Ref<string> = ref('');

const edited = ref({
  row: -1,
  col: -1,
});

const useStyle = inject<UseStyle>(UseStyleKey);
if (!useStyle) {
  throw new Error(`Could not resolve ${UseStyleKey.description}`);
}

const { setCSSStyle, getCSSStyle } = useStyle();

const tableSelect = useCellect(tableRef, {
  rowSelector: 'row',
  colSelector: 'col',
  selectedSelector: 'selected',
  focusSelector: 'focused',
  resetOnChange: false,
  clearOnBlur: false,
});
provide(CellectKey, tableSelect);

const {
  selection,
  focused,
  selectionBounds,
  selectedRows,
  selectedCols,
  focusedRect,
  selectOne,
  selectRow,
  selectCol,
  selectAll,
  lockSelection,
  unlockSelection,
  resetModifiers,
  computeFocusedRect,
} = tableSelect;

const { onMoveStart } = useSelectionMove(tableSelect, data, lassoMoveRef);

const selectedData = ref();

watch(
  () => [
    selection.value,
    focused.value,
    selectionBounds.value,
    selectedRows.value,
    selectedCols.value,
    focusedRect.value,
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
          row: cell.row,
          col: cell.col,
          data: data.value[cell.row][cell.col],
        };
      });

    emit('select', {
      data: selectedData.value,
      rows: toRaw(selectedRows.value),
      cols: toRaw(selectedCols.value),
    });
  },
  { immediate: false, deep: true }
);

onMounted(() => {
  for (let row = 0; row < 20; row++) {
    const cols = [];
    for (let col = 0; col < 20; col++) {
      cols[col] = undefined; // `${row} ${col}`;
    }
    data.value.push(cols);
  }

  const timeout = setTimeout(() => {
    selectOne(0, 0);

    if (tableRef.value) {
      tableRef.value.focus();
    }

    // Placed here because of Firefox time to load.
    lassoBorder.value = getCSSStyle(document.body, '--ts-lasso-border-size');

    clearTimeout(timeout);
  }, 10);
});

const handleLasso = () => {
  const rect = focusedRect.value;

  if (lassoRef.value) {
    if (selection.value.length > 0) {
      lassoRef.value.style.display = '';
      lassoRef.value.style.left = `${rect.pos.x}px`;
      lassoRef.value.style.top = `${rect.pos.y}px`;
      lassoRef.value.style.width = `calc(${rect.size.width}px - ${lassoBorder.value})`;
      lassoRef.value.style.height = `calc(${rect.size.height}px - ${lassoBorder.value})`;
    } else {
      lassoRef.value.style.display = 'none';
    }
  }
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
    // Replace selection and set focused cell at the beginning of the row.
    selectRow(row, true, true);
  } else if (cmdOrControl && !shift) {
    // Add to selection and move focused cell.
    selectRow(row, true, false);
  } else {
    // Shift is pressed.

    if (focused.value) {
      const activeRow = focused.value.row;

      // const existingRange =
      const begin = row > activeRow ? activeRow + 1 : row;
      const end = row < activeRow ? activeRow - 1 : row;

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

    if (focused.value) {
      const begin = col > focused.value.col ? focused.value.col : col;
      const end = col < focused.value.col ? focused.value.col : col;

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
    `.row-${index}`,
    'min-height',
    `${parent!.offsetHeight + event.offsetY}px`
  );

  computeFocusedRect();

  if (tableRef.value) {
    tableRef.value.focus();
  }
};

const onResizeCol = (event: DragEvent, index: number) => {
  if (!event.screenX && !event.screenY) return;

  // Get parent (row) of the draggable element.
  const parent = (event.target as HTMLElement).parentElement;

  setCSSStyle(
    `.col-${index}`,
    'min-width',
    `${parent!.offsetWidth + event.offsetX}px`
  );

  computeFocusedRect();

  if (tableRef.value) {
    tableRef.value.focus();
  }
};

const onEnter = (event: KeyboardEvent) => {
  event.preventDefault();
  const cell = focused.value;

  if (cell && (edited.value.row === -1 || edited.value.col === -1)) {
    edited.value.row = cell.row;
    edited.value.col = cell.col;

    resetModifiers();
    lockSelection();
  }
};

/**
 * Textarea element events handlers
 */

const onDoubleClick = (event: PointerEvent, row: number, col: number) => {
  event.preventDefault();
  edited.value.row = row;
  edited.value.col = col;
};

const onItemChange = (row: number, col: number, value: any) => {
  data.value[row][col] = value;
  computeFocusedRect();
};

const onItemBlur = (row: number, col: number, value: any) => {
  data.value[row][col] = value;

  if (tableRef.value) {
    unlockSelection();
    tableRef.value.focus();

    // Select the next cell (like in Microsoft Excel).
    // TODO: pass to next col if in a selection range.
    selectOne(
      // Next row.
      Math.min(row + 1, data.value.length),
      // This column.
      col,
      // Reset selection only if it was one cell.
      selection.value.length === 1,
      // Compute coordinates of the selection + active cell if alt modifier is pressed or selection is wide.
      selection.value.length > 1,
      // Focus on the newly selected cell.
      true
    );

    const timeout = setTimeout(() => {
      clearTimeout(timeout);
      edited.value.row = -1;
      edited.value.col = -1;
    }, 10);
  }
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

                @mousedown="onClickCol($event, index - 1)",
            ) 
                .index {{ numberToSpreadsheetColumn(index - 1) }}
                .resize-handle(
                  draggable="true",
                  @drag="onResizeCol($event, index - 1)"
                )

        .spreadsheet-table(
            ref="tableRef",
            @keydown.enter="onEnter"
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
              ref="lassoMoveRef",
              style="display: none"
            )
            
            // selectionBounds

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
                    :class="`col-${colIndex}`",

                    tabindex="-1",

                    @dblclick="onDoubleClick($event, rowIndex, colIndex)",
                )
                    spread-sheet-item(
                      :row="rowIndex",
                      :col="colIndex",
                      :value="col",
                      :editing="edited.row === rowIndex && edited.col === colIndex",

                      @input="onItemChange",
                      @blur="onItemBlur",
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
      right: calc(var(--ts-lasso-handles-size) * -1)
      bottom: calc(var(--ts-lasso-handles-size) * -1)
      width: calc(var(--ts-lasso-handles-size) * 2)
      height: calc(var(--ts-lasso-handles-size) * 2)
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
/* selection-bounds( v-if="selectionBounds && focusedRect",
:table-select="tableSelect", :rect="focusedRect", :bounds="selectionBounds"
selector="col", :x="focusedRect.pos.x", :y="focusedRect.pos.y",
:width="focusedRect.size.width" :height="focusedRect.size.height", ) */
