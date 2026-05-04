<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';

const router = useRouter();
const { login, loading, error, clearError } = useAuth();

const username = ref('');
const password = ref('');
const formError = ref<string | null>(null);

const isFormValid = computed(() => {
  return username.value.trim().length > 0 && password.value.length > 0;
});

onMounted(() => {
  clearError();
});

const handleSubmit = async (e: Event) => {
  e.preventDefault();
  formError.value = null;

  if (!isFormValid.value) {
    formError.value = 'Please enter both username and password';
    return;
  }

  const success = await login({
    username: username.value.trim(),
    password: password.value,
  });

  // Always clear password field for security
  password.value = '';

  if (success) {
    // Redirect to todo list on successful login
    await router.push('/todos');
  } else {
    formError.value = error?.value || 'Invalid credentials';
  }
};

const navigateToSignup = () => {
  clearError();
  formError.value = null;
  username.value = '';
  password.value = '';
  // Navigate to signup page
  router.push('/signup');
};
</script>

<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-card">
        <!-- Header -->
        <div class="login-header">
          <h1 class="login-title">Welcome Back</h1>
          <p class="login-subtitle">Sign in to your account to continue</p>
        </div>

        <!-- Error Message -->
        <div
          v-if="formError"
          class="error-message"
          role="alert"
          aria-live="polite"
        >
          <span class="error-icon" aria-hidden="true">⚠️</span>
          <span class="error-text">{{ formError }}</span>
        </div>

        <!-- Login Form -->
        <form @submit="handleSubmit" class="login-form" novalidate>
          <!-- Username Field -->
          <div class="form-group">
            <label for="username" class="form-label">Username</label>
            <input
              id="username"
              v-model="username"
              type="text"
              class="form-input"
              placeholder="Enter your username"
              required
              aria-required="true"
              aria-describedby="username-error"
              :aria-invalid="formError ? 'true' : 'false'"
              autocomplete="username"
              :disabled="loading"
            />
          </div>

          <!-- Password Field -->
          <div class="form-group">
            <label for="password" class="form-label">Password</label>
            <input
              id="password"
              v-model="password"
              type="password"
              class="form-input"
              placeholder="Enter your password"
              required
              aria-required="true"
              aria-describedby="password-error"
              :aria-invalid="formError ? 'true' : 'false'"
              autocomplete="current-password"
              :disabled="loading"
            />
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            class="submit-button"
            :disabled="!isFormValid || loading"
            :aria-busy="loading"
          >
            <span v-if="!loading" class="button-text">Sign In</span>
            <span v-else class="button-text">
              <span class="loading-spinner" aria-hidden="true"></span>
              Signing in...
            </span>
          </button>
        </form>

        <!-- Loading Indicator -->
        <div v-if="loading" class="loading-indicator" aria-live="polite">
          <div class="spinner" aria-hidden="true"></div>
          <p class="loading-text">Processing your login...</p>
        </div>

        <!-- Signup Link -->
        <div class="signup-section">
          <p class="signup-text">
            Don't have an account?
            <button
              type="button"
              class="signup-link"
              @click="navigateToSignup"
              :disabled="loading"
            >
              Sign up here
            </button>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1rem;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
}

.login-container {
  width: 100%;
  max-width: 400px;
}

.login-card {
  background: var(--color-surface);
  border-radius: 12px;
  box-shadow: 0 8px 32px var(--color-shadow-lg);
  padding: 2.5rem 2rem;
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

/* Header */
.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.login-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 0.5rem 0;
  letter-spacing: -0.5px;
}

.login-subtitle {
  font-size: 0.95rem;
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.5;
}

/* Error Message */
.error-message {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background-color: var(--color-error-light);
  border: 1px solid var(--color-error-border);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.error-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.error-text {
  color: var(--color-error);
  font-size: 0.95rem;
  font-weight: 500;
  line-height: 1.4;
}

/* Form */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text-primary);
  display: block;
}

.form-input {
  padding: 0.875rem 1rem;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  font-size: 1rem;
  font-family: inherit;
  color: var(--color-text-primary);
  background-color: var(--color-background);
  transition: all 0.2s ease;
  min-height: 44px;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.form-input:disabled {
  background-color: var(--color-surface-disabled);
  cursor: not-allowed;
  opacity: 0.6;
}

.form-input[aria-invalid='true'] {
  border-color: var(--color-error);
}

.form-input[aria-invalid='true']:focus {
  box-shadow: 0 0 0 3px var(--color-error-light);
}

/* Submit Button */
.submit-button {
  padding: 0.875rem 1.5rem;
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.submit-button:hover:not(:disabled) {
  background-color: var(--color-primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--color-shadow-md);
}

.submit-button:active:not(:disabled) {
  transform: translateY(0);
}

.submit-button:disabled {
  background-color: var(--color-primary-disabled);
  cursor: not-allowed;
  opacity: 0.6;
}

.button-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.loading-spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
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

/* Loading Indicator */
.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background-color: var(--color-background);
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-text {
  font-size: 0.95rem;
  color: var(--color-text-secondary);
  margin: 0;
}

/* Signup Section */
.signup-section {
  text-align: center;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.signup-text {
  font-size: 0.95rem;
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.5;
}

.signup-link {
  background: none;
  border: none;
  color: var(--color-primary);
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  font-size: inherit;
  text-decoration: none;
  transition: color 0.2s ease;
}

.signup-link:hover:not(:disabled) {
  color: var(--color-primary-dark);
  text-decoration: underline;
}

.signup-link:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

/* Responsive Design - Tablets */
@media (max-width: 768px) {
  .login-card {
    padding: 2rem 1.5rem;
  }

  .login-title {
    font-size: 1.5rem;
  }

  .login-subtitle {
    font-size: 0.9rem;
  }
}

/* Responsive Design - Mobile */
@media (max-width: 480px) {
  .login-page {
    padding: 1rem 0.75rem;
  }

  .login-card {
    padding: 1.5rem 1.25rem;
  }

  .login-title {
    font-size: 1.375rem;
  }

  .login-subtitle {
    font-size: 0.875rem;
  }

  .login-form {
    gap: 1.25rem;
  }

  .form-input {
    font-size: 16px;
  }

  .submit-button {
    font-size: 0.95rem;
  }

  .error-message {
    font-size: 0.875rem;
  }
}

/* Reduced Motion Support */
@media (prefers-reduced-motion: reduce) {
  .login-card,
  .error-message {
    animation: none;
  }

  .spinner,
  .loading-spinner {
    animation: none;
    border-top-color: var(--color-primary);
  }

  .form-input,
  .submit-button {
    transition: none;
  }
}

/* High Contrast Mode Support */
@media (prefers-contrast: high) {
  .login-card {
    border: 2px solid var(--color-text-primary);
  }

  .form-input {
    border-width: 2px;
  }

  .submit-button {
    border: 2px solid white;
  }

  .error-message {
    border-width: 2px;
  }
}

/* Dark Mode Support */
@media (prefers-color-scheme: dark) {
  .login-page {
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  }
}
</style>
