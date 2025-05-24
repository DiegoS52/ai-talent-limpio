<script setup>
import { useUserStore } from '@/stores/user'
import { useRoute } from 'vue-router'
import MainLayout from './layouts/MainLayout.vue'

const userStore = useUserStore()
const route = useRoute()

const shouldShowLayout = () => {
  return userStore.isAuthenticated && route.path !== '/'
}
</script>

<template>
  <MainLayout v-if="shouldShowLayout()">
    <router-view />
  </MainLayout>
  <router-view v-else />
</template>

<style>
#app {
  width: 100%;
  min-height: 100vh;
}
</style>