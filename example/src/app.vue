<script setup lang="ts">
import { ref } from 'vue';
import SpreadSheet from './components/spread-sheet.vue';

const selected = ref([]);
const onSpreadsheetSelect = (event: any) => {
  selected.value = event.data;
};
</script>
<template lang="pug">
spread-sheet(
    @select="onSpreadsheetSelect"
)
div(style="display: flex") 
    div(
        v-for="selection in selected",
        style="margin: 1rem"
    )
        pre {{ selection.cell.row }}-{{ selection.cell.col }}: {{ selection.data }}
</template>
/* textarea( :value="col", :readonly="true", @input="onInput($event, rowIndex,
colIndex)", @keydown.enter="onEnter($event, rowIndex, colIndex)",
@blur="onBlur($event, rowIndex, colIndex)" ) */
