<script setup lang="ts">
import { provide, ref } from 'vue';
import type { Ref } from 'vue';
import { useRouter } from 'vue-router';
import { useStyle } from './use/useStyle';
import { UseStyleKey } from './injection-keys.types';

const router = useRouter();

const styleElement: HTMLStyleElement = document.createElement('style');
document.head.appendChild(styleElement);

provide(UseStyleKey, useStyle);

const selected: Ref<Array<any>> = ref([]);
const onSpreadsheetSelect = (event: any) => {
  selected.value = event.data;
};
</script>
<template lang="pug">
.toolbar 
    button(
        @click="router.push('/example')"
    ) Spreadsheet
    button(
        @click="router.push('/example/users')"
    ) Users List


router-view(
    to="/",
    v-slot="{ Component }"
)
    keep-alive
        component(
            :is="Component",
            @select="onSpreadsheetSelect",
        )

div(style="display: flex") 
    div(
        v-for="selection in selected",
        :key="`${selection.row}-${selection.col}`",
        style="margin: 1rem"
    )
        pre {{ selection.row }}-{{ selection.col }}: {{ selection.data }}
</template>
<style lang="sass">
.toolbar
    display: flex
    padding: 0.5rem

    button
        margin-right: 0.5rem
</style>
