<script lang="ts">
export default {
  name: 'SelectionBounds',
};
</script>
<script setup lang="ts">
import { inject, ref, watch } from 'vue';
import { TableSelectKey } from './injection-keys.types';

const tableSelect = inject(TableSelectKey);
if (!tableSelect) {
  throw new Error(`Could not resolve ${TableSelectKey.description}`);
}

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
} = tableSelect;

const display = ref('none');

const x = ref('0px');
const y = ref('0px');
const width = ref('0px');
const height = ref('0px');

watch(
  () => activeRect.value,
  () => {
    if (
      activeRect.value &&
      activeRect.value.size.width > 0 &&
      activeRect.value.size.height > 0
    ) {
      display.value = '';
      x.value = `${activeRect.value.pos.x}px`;
      y.value = `${activeRect.value.pos.y}px`;
      width.value = `${activeRect.value.size.width}px`;
      height.value = `${activeRect.value.size.height}px`;
    } else {
      display.value = '';
    }
  },
  { immediate: false, deep: true }
);
</script>
<template lang="pug">
.selection-bounds
</template>
<style lang="sass" scoped>
.selection-bounds
    position: absolute
    display: v-bind(display)
    pointer-events: none
    left: v-bind(x)
    top: v-bind(y)
    width: v-bind(width)
    height: v-bind(height)
    border: solid 2px red
</style>
