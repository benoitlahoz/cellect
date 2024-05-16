<script lang="ts">
export default {
  name: 'SpreadSheetItem',
};
</script>
<script setup lang="ts">
import { inject, nextTick, ref, watch } from 'vue';
import type { Ref } from 'vue';
import type { UseStyle } from '../../use/useStyle';
import { UseStyleKey } from '../../injection-keys.types';

const props = defineProps({
  row: {
    type: Number,
    required: true,
  },
  col: {
    type: Number,
    required: true,
  },
  value: {
    type: String,
    default: '',
  },
  focused: {
    type: Boolean,
    default: false,
  },
  editing: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['input', 'blur']);

const useStyle = inject<UseStyle>(UseStyleKey);
if (!useStyle) {
  throw new Error(`Could not resolve ${UseStyleKey.description}`);
}
const { setCSSStyle, getPixelsForCSS, getLinesForCSSUnitProp } = useStyle();

const textareaRef: Ref<HTMLTextAreaElement | undefined> = ref();

watch(
  () => props.editing,
  () => {
    nextTick(() => {
      if (textareaRef.value) {
        if (props.editing) {
          textareaRef.value.readOnly = false;
          textareaRef.value.focus();
        } else {
          textareaRef.value.blur();
        }
      }
    });
  }
);

const isNumber = (value: string) => /^[-+]?[0-9]*\.?[0-9]*$/.test(value);

const onInput = (event: InputEvent) => {
  const target = event.target as HTMLTextAreaElement;
  resizeTextarea(target);
  emit('input', props.row, props.col, target.value);
};

const onBlur = (event: Event) => {
  const target = event.target as HTMLTextAreaElement;
  target.readOnly = true;
  emit('blur', props.row, props.col, target.value);
};

const onEnter = (event: KeyboardEvent) => {
  const target = event.target as HTMLTextAreaElement;

  if (!event.altKey) {
    target.blur();
    return;
  }

  target.value = `${target.value}\r\n`;
  resizeTextarea(target);
  emit('input', props.row, props.col, target.value);
};

const resizeTextarea = (target: HTMLTextAreaElement) => {
  const lineHeigth = getPixelsForCSS(target, '--ts-row-height');
  const lines = getLinesForCSSUnitProp(target, '--ts-row-height');

  target.rows = lines;
  target.style.height = `${lineHeigth * lines}px`;

  setCSSStyle(`.row-${props.row}`, 'min-height', `${lines}lh`);
};
</script>
<template lang="pug">
.spreadsheet-item
    textarea( 
        v-if="editing",
        ref="textareaRef",

        :value="value", 
        :readonly="true",

        @input="onInput", 
        @keydown.enter="onEnter", 
        @blur="onBlur" 
    )
    .spreadsheet-item-value(
        v-else,
        :style="isNumber(value) ? 'text-align: right;' : 'text-align: left;'",
        :innerText="value"
    )
</template>
<style lang="sass" scoped>
.spreadsheet-item
    width: 100%
    height: 100%

    textarea
        font-family: 'Lato'
        font-weight: 400
        font-size: 0.9rem
        line-height: inherit
        display: block
        border: 0
        outline: none
        // background: transparent
        background: white
        width: 100%
        height: 100%
        resize: none
        margin: 0
        padding: 0
        vertical-align: middle
        cursor: default

        &::-webkit-scrollbar
            display: none

    .spreadsheet-item-value
        width: 100%
        height: 100%
        margin: 0
        padding: 0
        vertical-align: middle
        user-select: none
</style>
