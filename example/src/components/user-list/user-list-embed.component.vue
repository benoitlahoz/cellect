<script lang="ts">
export default {
  name: 'UserListEmbed',
};
</script>

<script setup lang="ts">
import UserItem from './user-item.component.vue';

const props = defineProps({
  remoteUsers: {
    type: Array,
    required: true,
  },
  suggestedUsers: {
    type: Array,
    required: true,
  },
});
</script>

<template lang="pug">
.user-list
    .list(
        v-for="(row, rowIndex) in remoteUsers", 
        :key="`remote-${rowIndex}`",
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
    div SUGGESTIONS
    .list(
        v-for="(row, rowIndex) in suggestedUsers", 
        :key="`sug-row-${rowIndex}`",
        :id="`sug-row-${rowIndex}`"
    )
        user-item(
            v-for="(user, colIndex) in row",
            :key="`sug-${rowIndex}-${colIndex}`",
            :id="`sug-col-${rowIndex}-${colIndex}`",

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
    height: 0
    flex-grow: 1

    .user-list
        display: flex
        flex-direction: column
        flex-shrink: 0
        width: 300px
        padding: 1rem
        overflow-y: scroll

        &:focus
            outline: none
</style>
