<script setup lang="ts">
import {
  ref,
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick,
  onUpdated,
} from 'vue';
import type { Ref } from 'vue';
import { useTableSelect } from '../../src/useTableSelect';
import { getFirstElementByClassName } from '../../src/functions';
// import type { AbstractTableSelect } from '../../src/types/table-select.abstract';

const data: Ref<Array<Array<any>>> = ref([]);
const tableRef: Ref<HTMLElement | undefined> = ref();
const horizontalGuideRef: Ref<HTMLElement | undefined> = ref();

let styleElement: HTMLStyleElement;

const {
  selection,
  activeCell,
  selectionBounds,
  selectedRows,
  selectedCols,
  resetSelection,
} = useTableSelect(tableRef, data, {
  rowSelector: 'row',
  colSelector: 'col',
  selectedSelector: 'selected',
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
  ],
  () => {
    // console.log(selection.value.size);
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
  // console.log(event);
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
.mbz-table-container
    .mbz-rows
        .mbz-select-all 
        .mbz-row-header(
            v-for="index in data.length",
            :class="`row-${index - 1}`, {'selected': selectedRows.includes(index - 1)}"
            :key="`row-${index - 1}`",
        ) 
          .index {{ index }}
          .resize-handle(
            draggable="true",

            @drag="onResizeRow($event, index - 1)",
          )


    .mbz-table-main
        .mbz-cols 
            .mbz-col-header(
                v-if="data.length > 0",
                v-for="index in (data[0].length)",
                :class="`col-${index-1}`, {'selected': selectedCols.includes(index - 1)}"
            ) 
                .index {{ numberToColumn(index - 1) }}
                .resize-handle(
                  draggable="true",
                  @drag="onResizeCol($event, index - 1)"
                )
        .mbz-table(
            ref="tableRef"
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
                    .mbz-cell-value {{ col }}
                    // TODO: add textarea when necessary
</template>
<style lang="sass">
@import url(https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap)

.lato-regular
  font-family: "Lato", sans-serif
  font-weight: 400
  font-style: normal

.lato-bold
  font-family: "Lato", sans-serif
  font-weight: 700
  font-style: normal


*
    @extend .lato-regular
    font-size: 16px
    line-height: 1.5rem
    -webkit-font-smoothing: antialiased
    -moz-osx-font-smoothing: grayscale
    text-rendering: optimizeLegibility
    text-shadow: 1px 1px 1px rgba(0,0,0,0.004)
    box-sizing: border-box

.mbz-table-container
    display: flex
    overflow: scroll

    // The scrollbars

    padding-bottom: 8px
    padding-right: 8px

    .mbz-rows
        display: flex
        flex-direction: column
        font-size: 0.8rem
        color: white

        .mbz-select-all
            height: 1lh

        .mbz-row-header
            @extend .lato-bold
            display: flex
            flex-direction: column
            justify-content: center
            height: 1lh
            background: black
            border-bottom: 1px solid white
            text-align: center
            font-weight: bolder
            min-width: 30px
            position: relative
            user-select: none

            &.selected
              background: grey

            &:last-child
                border-bottom: 0

            .resize-handle
              position: absolute
              bottom: -5px
              left: 0
              right: 0
              height: 10px
              background: transparent
              cursor: ns-resize
              z-index: 999

    .mbz-table-main
        display: flex
        flex-direction: column

        .mbz-cols
            display: flex
            font-size: 0.8rem
            color: white

        .mbz-col-header
            @extend .lato-bold
            width: 120px
            height: 1lh
            background: black
            border-right: 1px solid white
            text-align: center
            font-weight: bolder
            position: relative
            user-select: none

            &.selected
              background: grey

            &:last-child
                border-right: 0

            .resize-handle
                position: absolute
                bottom: 0
                top: 0
                right: -5px
                width: 10px
                background: transparent
                cursor: ew-resize
                z-index: 999

        .mbz-table
            display: flex
            flex-direction: column
            color: black
            font-size: 0.9rem
            padding-right: 1px
            padding-bottom: 1px
            outline: none
            position: relative

            .mbz-horizontal-guide
              top: 300px
              left: 0
              right: 0
              height: 1px
              position: absolute
              z-index: 9999
              background: black

            .row
                display: flex
                width: fit-content
                height: 1lh
                border-bottom: 1px solid grey

                &:first-child
                    border-top: 1px solid grey

            .col
                width: 120px
                height: 100%
                padding: 0
                margin: 0

                &.lasso
                  z-index: 1

                &.lasso-top-left
                    border-top: 2px solid black
                    border-left: 2px solid black
                    border-top-left-radius: 3px

                &.lasso-top
                    border-top: 2px solid black

                &.lasso-top-right
                    border-top: 2px solid black
                    border-right: 2px solid black
                    border-top-right-radius: 3px

                &.lasso-right
                    border-right: 2px solid black

                &.lasso-bottom-right
                    border-bottom: 2px solid black
                    border-right: 2px solid black
                    border-bottom-right-radius: 3px

                &.lasso-bottom
                    border-bottom: 2px solid black

                &.lasso-bottom-left
                    border-bottom: 2px solid black
                    border-left: 2px solid black
                    border-bottom-left-radius: 3px

                &.lasso-left
                    border-left: 2px solid black

                &:first-child
                    border-left: 1px solid grey

                &:not(.active)
                &:not(.lasso-right)
                  &:not(.lasso-top-right)
                    &:not(.lasso-bottom-right)
                      border-right: 1px solid grey

                &:not(.active)
                  &.selected
                      background: lightgrey

                &.fmolqsjkfmlsm // active
                    border: 1px solid black
                    outline: 2px solid black
                    border-radius: 3px
                    background: #eee
                    z-index: 1

                &.active
                  background: #eee


                textarea
                    display: block
                    border: 0
                    outline: none
                    background: transparent
                    width: 100%
                    height: 100%
                    resize: none
                    margin: 0
                    padding: 0
                    vertical-align: middle
                    cursor: default

                    &::-webkit-scrollbar
                        display: none

                .mbz-cell-value
                    width: 100%
                    height: 100%
                    margin: 0
                    padding: 0
                    vertical-align: middle
                    user-select: none
</style>
/* textarea( :value="col", :readonly="true", @input="onInput($event, rowIndex,
colIndex)", @keydown.enter="onEnter($event, rowIndex, colIndex)",
@blur="onBlur($event, rowIndex, colIndex)" ) */
