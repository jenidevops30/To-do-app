<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useAuth } from '../composables/useAuth';
import { useRouter } from 'vue-router';

const { isAuthenticated, checkAuth, loading } = useAuth();
const router = useRouter();

const isReady = computed(() => !loading.value);

onMounted(async () => {
  // Check if user is authenticated on component mount
  await checkAuth();

  // If not authenticated after check, redirect to login
  if (!isAuthenticated.value) {
    router.push('/login');
  }
});
</script>

<template>
  <div v-if="isReady && isAuthenticated" class="protected-route">
    <slot />
  </div>
  <div v-else-if="isReady" class="unauthorized">
    <p>Redirecting to login...</p>
  </div>
  <div v-else class="loading">
    <div class="spinner"></div>
    <p>Loading...</p>
  </div>
</template>

<style scoped>
.protected-route {
  width: 100%;
}

.unauthorized,
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 1rem;
  color: var(--color-text-secondary);
}

.spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
    border-top-color: var(--color-primary);
  }
}
</style>
