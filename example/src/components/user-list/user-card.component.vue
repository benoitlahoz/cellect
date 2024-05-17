<script lang="ts">
export default {
  name: 'UserCard',
};
</script>
<script setup lang="ts">
const props = defineProps({
  firstname: {
    type: String,
    default: '',
  },
  lastname: {
    type: String,
    default: '',
  },
  avatarUrl: {
    type: String,
    default: undefined,
  },
  connected: {
    type: Boolean,
    default: false,
  },
});
</script>
<template lang="pug">
.user-card(
    :class="{ connected: connected === true }",
) 
    img(
        v-if="avatarUrl",
        :src="avatarUrl")
    .name
        .first {{ firstname }}
        .last {{ lastname }}

</template>
<style lang="sass" scoped>
.user-card
    flex-grow: 1
    display: flex
    flex-direction: column
    justify-content: center
    align-items: center
    background: lightsteelblue
    border-radius: 0.5rem
    margin: 0.1rem
    height: 260px
    max-height: 260px
    width: 260px
    max-width: 260px

    &.connected
        background: slategrey

    &:not(.connected)
        .name
            opacity: 0.5

    img
        border-radius: 50%

    .name
        display: inline-flex
        flex-direction: column
        align-items: center
        justify-content: center
        font-size: 1.5rem
        width: 100%
        overflow: hidden
        white-space: nowrap
        text-overflow: ellipsis

        .first
            padding-top: 1rem
            display: flex
            justify-content: center
            width: 100%
            overflow: hidden
            white-space: nowrap
            text-overflow: ellipsis

        .last
            display: flex
            justify-content: center
            width: 100%
            text-transform: uppercase
            font-weight: bold
            overflow: hidden
            white-space: nowrap
            text-overflow: ellipsis

    &.selected
        background: slategrey

        &.connected
            background: teal

    &.focused
        background: darkslategrey
        color: white

        &.connected
            background: darkslategrey
</style>
