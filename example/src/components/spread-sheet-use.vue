<script lang="ts">
export default {
  name: 'SpreadSheetUse',
};
</script>
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import type { Ref } from 'vue';
import { useTableSelect } from '../../../src/useTableSelect';

const data: Ref<Array<Array<any>>> = ref([]);
const tableRef: Ref<HTMLElement | undefined> = ref();
const lassoRef: Ref<HTMLElement | undefined> = ref();
const horizontalGuideRef: Ref<HTMLElement | undefined> = ref();

let styleElement: HTMLStyleElement;

const {
  selection,
  activeCell,
  selectionBounds,
  selectedRows,
  selectedCols,
  selectionCoords,
  resetSelection,
} = useTableSelect(tableRef, data, {
  rowSelector: 'row',
  colSelector: 'col',
  selectedSelector: 'selected',
  activeSelector: 'active',
  ringSelectorPrefix: 'ring',
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
    selectionCoords.value,
  ],
  () => {
    const coords = selectionCoords.value;
    if (lassoRef.value && selection.value.size > 0) {
      lassoRef.value.style.left = `${coords.pos.x - 1}px`; // Remove the border size
      lassoRef.value.style.top = `${coords.pos.y - 1}px`;
      lassoRef.value.style.width = `${coords.size.width - 3}px`;
      lassoRef.value.style.height = `${coords.size.height - 2}px`;
    }

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

  if (horizontalGuideRef.value) {
    horizontalGuideRef.value.style.display = 'none';
  }
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

const onResizeRow = (event: DragEvent, index: number) => {
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
};

/**
 * Input elements events handlers
 */

const onDoubleClick = (event: PointerEvent) => {
  const target = event.target as HTMLTextAreaElement;

  target.readOnly = false;
  target.focus();
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
};

const onEnter = (event: KeyboardEvent, row: number, col: number) => {
  const target = event.target as HTMLTextAreaElement;
  if (!event.altKey) {
    target.blur();
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

  const rowEl = tableRef.value!.querySelector(`#row-${row}`);
  if (rowEl) {
    (rowEl as HTMLElement).style.height = `${lines}lh`; //
  }
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
        .spreadsheet-select-all 
        .spreadsheet-row-header(
            v-for="index in data.length",
            :class="`row-${index - 1}`, {'selected': selectedRows.includes(index - 1)}"
            :key="`row-${index - 1}`",
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
                :class="`col-${index-1}`, {'selected': selectedCols.includes(index - 1)}"
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
              ref="lassoRef"
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

                    @dblclick="onDoubleClick",
                )
                    .spreadsheet-cell-value {{ col }}
                    // TODO: add textarea when necessary
</template>
<style lang="sass">
@use "./spread-sheet"

.lasso
    position: absolute
    border-radius: 3px
    border: 2px solid blue
    pointer-events: none
    transition: all 0.125s
</style>
