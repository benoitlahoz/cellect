<script lang="ts">
export default {
  name: 'UserList',
};
</script>
<script setup lang="ts">
import { onMounted, provide, ref, nextTick, watch } from 'vue';
import type { Ref } from 'vue';
import type { TableSelectionEvent } from '../../../../src/modules/table-select-event.module';
import { useTableSelect, TableSelectKey } from '../../../../src/useTableSelect';

import UserItem from './user-item.component.vue';

const tableRef: Ref<HTMLElement | undefined> = ref();
const remoteUsers: Ref<any> = ref([]);

const tableSelect = useTableSelect(
  tableRef,
  {
    rowSelector: 'list',
    colSelector: 'user-item',
    selectedSelector: 'selected',
    focusSelector: 'focused',
    resetOnChange: true,
    clearOnBlur: true,
  },
  remoteUsers
);
provide(TableSelectKey, tableSelect);

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

onMounted(async () => {
  const res = await fetch('https://randomuser.me/api/?results=30');
  const json = await res.json();

  remoteUsers.value = json.results
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

  const timeout = setTimeout(() => {
    selectOne(0, 0);

    if (tableRef.value) {
      tableRef.value.focus();
    }

    clearTimeout(timeout);
  }, 10);
});
</script>
<template lang="pug">
.user-component

    // This is the root component passed to TableSelect.

    .user-list(
        ref="tableRef"
    )
        .list(
            v-for="(row, rowIndex) in remoteUsers", 
            :key="rowIndex",
            :id="`row-${rowIndex}`",
            :class="`row-${rowIndex}`"
        )
            user-item(
                v-for="(user, colIndex) in row",
                :key="`${rowIndex}-${colIndex}`",
                :id="`col-${rowIndex}-${colIndex}`",

                :avatar-url="user.avatar",
                :firstname="user.firstname",
                :lastname="user.lastname"
                :connected="user.connected"
            )

    .user-selection 
        .focused(
            v-if="focused",
            :set="user = remoteUsers[focused.row][focused.col]"
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
            user-item(
                v-if="remoteUsers[cell.row][cell.col] !== remoteUsers[focused.row][focused.col]",
                :set="user = remoteUsers[cell.row][cell.col]"

                :avatar-url="user.avatar",
                :firstname="user.firstname",
                :lastname="user.lastname"
                :connected="user.connected"
            )
</template>
<style lang="sass" scoped>
.user-component
    display: flex
    width: 100%

    .user-list
        display: flex
        flex-direction: column
        width: 300px
        padding: 1rem
        overflow-y: scroll

        &:focus
            outline: none

    .user-selection
        flex-grow: 1
        padding: 1rem

        .focused
            display: flex
            flex-direction: column
            justify-content: center
            width: fit-content
            padding: 1rem
            border-radius: 1rem
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
