<script lang="ts">
export default {
  name: 'SelectionBounds',
};
</script>
<script setup lang="ts">
const props = defineProps({
  row: {
    type: Number,
    default: -1,
  },
  col: {
    type: Number,
    default: -1,
  },
  height: {
    type: Number,
    default: 0,
  },
  width: {
    type: Number,
    default: 0,
  },
});
</script>
<template lang="pug">
div SelectionBounds component
</template>
<style lang="sass" scoped></style>
