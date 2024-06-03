<script lang="ts">
export default {
  name: 'UserList',
};
</script>
<script setup lang="ts">
import { onMounted, provide, ref, nextTick, watch } from 'vue';
import type { Component, Ref } from 'vue';
import { useCellect, CellectKey } from '../../../../src/useCellect';

import UserListEmbed from './user-list-embed.component.vue';
import UserCard from './user-card.component.vue';

const tableRef: Ref<Component | undefined> = ref();
const remoteUsers: Ref<any> = ref([]);
const suggestedUsers: Ref<any> = ref([]);

const tableSelect = useCellect(tableRef, {
  rowSelector: 'list',
  colSelector: 'user-item',
  selectedSelector: 'selected',
  focusSelector: 'focused',
  resetOnChange: true,
  clearOnBlur: false, //true,
  debug: true,
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
  resetCells,
} = tableSelect;

onMounted(async () => {
  const remote = await fetch('https://randomuser.me/api/?results=30');
  const remoteJSON = await remote.json();

  remoteUsers.value = remoteJSON.results
    .map((user: any) => {
      return [
        {
          id: user.login.uuid,
          firstname: user.name.first,
          lastname: user.name.last,
          connected: Boolean(Math.floor(Math.random() * 2)),
          avatar: user.picture.thumbnail,
          picture: user.picture.large,
          gender: user.gender,
          email: user.email,
        },
      ];
    })
    .sort((a: any, b: any) => b[0].connected - a[0].connected);

  const suggestions = await fetch('https://randomuser.me/api/?results=10');
  const suggestionsJSON = await suggestions.json();

  suggestedUsers.value = suggestionsJSON.results
    .map((user: any) => {
      return [
        {
          id: user.login.uuid,
          firstname: user.name.first,
          lastname: user.name.last,
          avatar: user.picture.thumbnail,
          picture: user.picture.large,
          gender: user.gender,
          email: user.email,
          suggestion: true,
        },
      ];
    })
    .sort((a: any, b: any) => b[0].connected - a[0].connected);

  const timeout = setTimeout(() => {
    resetCells();
    selectOne(0, 0);

    if (tableRef.value) {
      (tableRef.value as any).$el.focus();
    }

    clearTimeout(timeout);
  }, 10);
});

const getDataAtPosition = (row: number, col: number) => {
  if (row >= remoteUsers.value.length) {
    const newRow = row - remoteUsers.value.length;
    console.log(suggestedUsers.value[newRow]);
    return suggestedUsers.value[newRow][col];
  }
  return remoteUsers.value[row][col];
};
</script>
<template lang="pug">
.user-component
  user-list-embed(
    ref="tableRef",
    :remote-users="remoteUsers",
    :suggested-users="suggestedUsers",
    :focused="focused"
  )

  .user-selection 
    .focused(
        v-if="focused",
        :set="user = getDataAtPosition(focused.row, focused.col)"
    ) 
        .base
            img(:src="user.picture")
            .name 
                .first {{ user.firstname }}
                .last &nbsp;{{ user.lastname }}
        div {{ user.gender }}
        div {{ user.email }}

    template(
        v-if="focused && selection",
        v-for="(cell, index) in selection",
    )
        user-card(
            v-if="getDataAtPosition(cell.row, cell.col) !== getDataAtPosition(focused.row, focused.col)",
            :set="user = getDataAtPosition(cell.row, cell.col)"

            :avatar-url="user.picture",
            :firstname="user.firstname",
            :lastname="user.lastname"
            :connected="user.connected"
        )
</template>
<style lang="sass" scoped>
.user-component
    display: flex
    width: 100%
    height: 0
    flex-grow: 1

    .user-selection
        flex-grow: 1
        padding: 1rem
        display: flex
        flex-wrap: wrap
        align-content: flex-start

        .focused
            display: flex
            flex-direction: column
            justify-content: center
            width: 520px
            min-width: 520px
            height: 260px
            margin: 0.1rem
            border-radius: 0.5rem
            border: 1px solid black
            font-size: 2rem
            line-height: 2.5rem

            .base
                display: flex
                align-items: center

                img
                    border-radius: 50%

                .name
                    display: flex
                    margin-left: 1rem

                    .last
                        text-transform: uppercase
                        font-weight: bold
</style>
