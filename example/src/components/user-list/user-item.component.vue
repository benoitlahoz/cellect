<script lang="ts">
export default {
  name: 'UserItem',
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
.user-item(
    :class="{ connected: connected === true }",
) 
    img(
        v-if="avatarUrl",
        :src="avatarUrl", 
        height="30", 
        width="30").rounded-full
    .name
        .first {{ firstname }}
        .last &nbsp;{{ lastname }}

</template>
<style lang="sass" scoped>
.user-item
    flex-grow: 1
    display: flex
    align-items: center
    padding: 0.5rem
    background: lightsteelblue
    border-radius: 0.5rem
    margin: 0.1rem

    &.connected
        background: slategrey

    &:not(.connected)
        .name
            opacity: 0.5

    img
        margin-right: 1rem
        border-radius: 50%

    .name
        display: flex

        .last
            text-transform: uppercase
            font-weight: bold

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
