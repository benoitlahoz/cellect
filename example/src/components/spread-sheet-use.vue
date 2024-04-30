<script lang="ts">
export default {
  name: 'SpreadSheetUse',
};
</script>
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import type { Ref } from 'vue';
import { useTableSelect } from '../../../src/useTableSelect';

const data: Ref<Array<Array<any>>> = ref([]);
const tableRef: Ref<HTMLElement | undefined> = ref();
const lassoRef: Ref<HTMLElement | undefined> = ref();
const textareaRef: Ref<HTMLTextAreaElement | undefined> = ref();

let styleElement: HTMLStyleElement;

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

  selectOne,
  selectRow,
  selectCol,
  selectAll,
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
      const rect = activeRect.value;
      if (lassoRef.value) {
        if (selection.value.size > 0) {
          lassoRef.value.style.display = '';
          lassoRef.value.style.left = `${rect.pos.x - 1}px`; // Remove the border size
          lassoRef.value.style.top = `${rect.pos.y - 1}px`;
          lassoRef.value.style.width = `${rect.size.width - 2}px`;
          lassoRef.value.style.height = `${rect.size.height - 2}px`;
        } else {
          lassoRef.value.style.display = 'none';
        }
      }
    });

    /*
    console.log(
      'SE',
      Array.from(selection.value),
      activeCell.value,
      selectionBounds.value,
      selectedRows.value,
      selectedCols.value
    );
    */
  },
  { immediate: true, deep: true }
);

onMounted(() => {
  for (let row = 0; row < 20; row++) {
    const cols = [];
    for (let col = 0; col < 20; col++) {
      cols[col] = ''; // `${row} ${col}`;
    }
    data.value.push(cols);
  }

  mountStyle();
});

const mountStyle = () => {
  styleElement = document.createElement('style');
  document.head.appendChild(styleElement);
};

onBeforeUnmount(() => {
  //
});

function setCSSStyle(selector: string, prop: string, value: string) {
  const sheet = styleElement.sheet!;

  // Replace rule.

  for (let i = 0, len = sheet.cssRules.length; i < len; i++) {
    if ((sheet.cssRules[i] as CSSStyleRule).selectorText === selector) {
      (sheet.cssRules[i] as CSSStyleRule).style[prop as any] = value;
      return;
    }
  }

  // Insert rule.

  sheet.insertRule(`${selector} { ${prop}: ${value}; }`, sheet.cssRules.length);
}

const onSelectAll = () => {
  if (tableRef.value) {
    tableRef.value.focus();
  }
  selectAll(true);
};

const onClickRow = (event: PointerEvent, row: number) => {
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
    `.col-${index}`,
    'min-width',
    `${parent!.offsetWidth + event.offsetX}px`
  );

  computeActiveRect();
  if (tableRef.value) {
    tableRef.value.focus();
  }
};

/**
 * Input elements events handlers
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

  resize(target, row, col);
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
  resize(target, row, col);
};

const resize = (target: HTMLTextAreaElement, row: number, col: number) => {
  const lht = parseInt(getStyle(target, 'line-height'), 10);
  const lines = Math.floor(target.scrollHeight / lht);

  target.rows = lines;
  target.style.height = `${lht * lines}px`;

  setCSSStyle(`.row-${row}`, 'min-height', `${lines}lh`);

  computeActiveRect();
};

const numberToColumn = (n: number): string => {
  const res = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[n % 26];
  return n >= 26 ? numberToColumn(Math.floor(n / 26) - 1) + res : res;
};

const getStyle = (el: HTMLElement, styleProp: string) => {
  let y;
  // @ts-ignore
  if (el.currentStyle) {
    // @ts-ignore
    y = el.currentStyle[styleProp]; //
    return y;
  }
  y = document
    .defaultView!.getComputedStyle(el, null)
    .getPropertyValue(styleProp);
  return y;
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
                .index {{ numberToColumn(index - 1) }}
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
              .handle


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
                      v-else
                    ) {{ col }}
</template>
<style lang="sass">
@use "./spread-sheet"

.lasso
    position: absolute
    border-radius: 3px
    border: 2px solid var(--ts-lasso-color)
    pointer-events: none
    transition: all 0.1s

    .handle
      position: absolute
      right: -5px
      bottom: -5px
      width: 10px
      height: 10px
      background: var(--ts-lasso-handle-color)
      pointer-events: all

      &:hover
        cursor: crosshair
</style>
