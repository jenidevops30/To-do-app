<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuth } from '../composables/useAuth';

const { isAuthenticated, user, logout, loading } = useAuth();

const showLogoutConfirm = ref(false);

const displayName = computed(() => {
  return user?.value?.username || 'User';
});

const handleLogoutClick = () => {
  showLogoutConfirm.value = true;
};

const confirmLogout = async () => {
  showLogoutConfirm.value = false;
  await logout();
};

const cancelLogout = () => {
  showLogoutConfirm.value = false;
};

const emit = defineEmits<{
  'logout-success': [];
}>();
</script>

<template>
  <nav class="navigation" role="navigation" aria-label="Main navigation">
    <div class="nav-content">
      <!-- Left side - Logo/Brand -->
      <div class="nav-brand">
        <span class="nav-icon" aria-hidden="true">✓</span>
        <span class="nav-title">Todo App</span>
      </div>

      <!-- Right side - Auth Actions -->
      <div class="nav-actions">
        <!-- Authenticated User Section -->
        <div v-if="isAuthenticated" class="auth-section">
          <span class="user-greeting" aria-label="Current user">
            Welcome, <span class="username">{{ displayName }}</span>
          </span>

          <button
            type="button"
            class="logout-button"
            @click="handleLogoutClick"
            :disabled="loading"
            aria-label="Log out from your account"
          >
            <span class="logout-icon" aria-hidden="true">🚪</span>
            <span class="logout-text">Logout</span>
          </button>
        </div>

        <!-- Unauthenticated User Section -->
        <div v-else class="unauth-section">
          <p class="unauth-message">Not logged in</p>
        </div>
      </div>
    </div>

    <!-- Logout Confirmation Dialog -->
    <div
      v-if="showLogoutConfirm"
      class="logout-modal-overlay"
      @click="cancelLogout"
      role="presentation"
    >
      <div
        class="logout-modal"
        @click.stop
        role="alertdialog"
        aria-labelledby="logout-title"
        aria-describedby="logout-description"
      >
        <div class="modal-header">
          <h2 id="logout-title" class="modal-title">Confirm Logout</h2>
        </div>

        <div class="modal-body">
          <p id="logout-description" class="modal-description">
            Are you sure you want to log out? You'll need to log in again to
            access your todos.
          </p>
        </div>

        <div class="modal-footer">
          <button
            type="button"
            class="btn-cancel"
            @click="cancelLogout"
            :disabled="loading"
          >
            Cancel
          </button>
          <button
            type="button"
            class="btn-confirm"
            @click="confirmLogout"
            :disabled="loading"
            :aria-busy="loading"
          >
            <span v-if="!loading">Logout</span>
            <span v-else>
              <span class="spinner" aria-hidden="true"></span>
              Logging out...
            </span>
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.navigation {
  background: linear-gradient(
    135deg,
    var(--color-primary) 0%,
    var(--color-primary-dark) 100%
  );
  color: white;
  padding: 1rem;
  box-shadow: 0 2px 8px var(--color-shadow);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
}

/* Brand Section */
.nav-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 600;
  font-size: 1.125rem;
  flex-shrink: 0;
}

.nav-icon {
  font-size: 1.5rem;
  background: white;
  color: var(--color-primary);
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-weight: bold;
}

.nav-title {
  letter-spacing: -0.3px;
}

/* Actions Section */
.nav-actions {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-left: auto;
}

/* Authenticated Section */
.auth-section {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.user-greeting {
  font-size: 0.95rem;
  opacity: 0.95;
  white-space: nowrap;
}

.username {
  font-weight: 600;
  color: white;
}

.logout-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 40px;
  white-space: nowrap;
}

.logout-button:hover:not(:disabled) {
  background-color: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-1px);
}

.logout-button:active:not(:disabled) {
  transform: translateY(0);
}

.logout-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.logout-icon {
  font-size: 1rem;
}

.logout-text {
  display: inline;
}

/* Unauthenticated Section */
.unauth-section {
  display: flex;
  align-items: center;
}

.unauth-message {
  font-size: 0.95rem;
  opacity: 0.9;
  margin: 0;
}

/* Logout Modal */
.logout-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.logout-modal {
  background: var(--color-surface);
  border-radius: 12px;
  box-shadow: 0 8px 32px var(--color-shadow-lg);
  max-width: 400px;
  width: 100%;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.modal-body {
  padding: 1.5rem;
}

.modal-description {
  font-size: 0.95rem;
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.5;
}

.modal-footer {
  padding: 1.5rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.btn-cancel,
.btn-confirm {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-cancel {
  background-color: var(--color-background);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.btn-cancel:hover:not(:disabled) {
  background-color: var(--color-surface-hover);
  border-color: var(--color-border-hover);
}

.btn-confirm {
  background-color: var(--color-error);
  color: white;
}

.btn-confirm:hover:not(:disabled) {
  background-color: var(--color-error-dark);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--color-shadow-md);
}

.btn-confirm:active:not(:disabled) {
  transform: translateY(0);
}

.btn-cancel:disabled,
.btn-confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  display: inline-block;
  width: 0.875rem;
  height: 0.875rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Responsive Design - Tablets */
@media (max-width: 768px) {
  .nav-content {
    gap: 1rem;
  }

  .nav-brand {
    gap: 0.5rem;
    font-size: 1rem;
  }

  .nav-icon {
    width: 1.75rem;
    height: 1.75rem;
    font-size: 1.25rem;
  }

  .auth-section {
    gap: 1rem;
  }

  .user-greeting {
    font-size: 0.875rem;
  }

  .logout-button {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }
}

/* Responsive Design - Mobile */
@media (max-width: 480px) {
  .navigation {
    padding: 0.75rem;
  }

  .nav-content {
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .nav-brand {
    gap: 0.5rem;
    font-size: 0.95rem;
    order: 1;
  }

  .nav-icon {
    width: 1.5rem;
    height: 1.5rem;
    font-size: 1rem;
  }

  .nav-actions {
    order: 2;
    width: 100%;
    gap: 1rem;
    margin-left: 0;
  }

  .auth-section {
    width: 100%;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .user-greeting {
    font-size: 0.8125rem;
    width: 100%;
    order: 1;
  }

  .logout-button {
    order: 2;
    flex: 1;
    min-width: 120px;
    padding: 0.5rem 0.75rem;
    font-size: 0.8125rem;
    justify-content: center;
  }

  .logout-text {
    display: none;
  }

  .logout-icon {
    font-size: 1.125rem;
  }

  .logout-modal {
    max-width: 90vw;
  }

  .modal-header,
  .modal-body,
  .modal-footer {
    padding: 1rem;
  }

  .modal-title {
    font-size: 1.125rem;
  }

  .modal-description {
    font-size: 0.875rem;
  }

  .btn-cancel,
  .btn-confirm {
    flex: 1;
    padding: 0.625rem 1rem;
    font-size: 0.875rem;
  }

  .modal-footer {
    flex-direction: column;
    gap: 0.75rem;
  }
}

/* Reduced Motion Support */
@media (prefers-reduced-motion: reduce) {
  .logout-modal-overlay,
  .logout-modal {
    animation: none;
  }

  .logout-button,
  .btn-cancel,
  .btn-confirm {
    transition: none;
  }

  .spinner {
    animation: none;
    border-top-color: white;
  }
}

/* High Contrast Mode Support */
@media (prefers-contrast: high) {
  .navigation {
    border-bottom: 3px solid white;
  }

  .logout-button {
    border: 2px solid white;
  }

  .logout-modal {
    border: 2px solid var(--color-text-primary);
  }

  .btn-cancel,
  .btn-confirm {
    border: 2px solid currentColor;
  }
}

/* Dark Mode Support */
@media (prefers-color-scheme: dark) {
  .navigation {
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  }
}
</style>
