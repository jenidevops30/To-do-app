<script setup lang="ts">
import { onMounted } from 'vue';
import { useAuth } from './composables/useAuth';
import Navigation from './components/Navigation.vue';

const { checkAuth } = useAuth();

// Check authentication status on app mount
onMounted(async () => {
  await checkAuth();
});
</script>

<template>
  <div id="app">
    <Navigation />
    <main class="main-content" role="main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--color-background);
  color: var(--color-text-primary);
}

.main-content {
  flex: 1;
  width: 100%;
}
</style>
