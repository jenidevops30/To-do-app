<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';

const router = useRouter();
const { signup, loading, error, clearError } = useAuth();

const username = ref('');
const password = ref('');
const passwordConfirm = ref('');
const formErrors = ref<Record<string, string>>({});

// Validation rules
const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 50;
const MIN_PASSWORD_LENGTH = 8;

// Validation functions
const validateUsername = (value: string): string | null => {
  if (value.length === 0) {
    return null; // No error if empty (not yet filled)
  }
  if (value.length < MIN_USERNAME_LENGTH) {
    return `Username must be at least ${MIN_USERNAME_LENGTH} characters`;
  }
  if (value.length > MAX_USERNAME_LENGTH) {
    return `Username must be at most ${MAX_USERNAME_LENGTH} characters`;
  }
  if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    return 'Username can only contain letters, numbers, and underscores';
  }
  return null;
};

const validatePassword = (value: string): string | null => {
  if (value.length === 0) {
    return null; // No error if empty (not yet filled)
  }
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  const hasLetters = /[a-zA-Z]/.test(value);
  const hasNumbers = /[0-9]/.test(value);
  if (!hasLetters || !hasNumbers) {
    return 'Password must contain both letters and numbers';
  }
  return null;
};

const validatePasswordConfirm = (
  pwd: string,
  confirm: string
): string | null => {
  if (confirm.length === 0) {
    return null; // No error if empty (not yet filled)
  }
  if (pwd !== confirm) {
    return 'Passwords do not match';
  }
  return null;
};

// Real-time validation
const usernameError = computed(() => {
  if (username.value.length === 0) return null;
  return validateUsername(username.value);
});

const passwordError = computed(() => {
  if (password.value.length === 0) return null;
  return validatePassword(password.value);
});

const passwordConfirmError = computed(() => {
  if (passwordConfirm.value.length === 0) return null;
  return validatePasswordConfirm(password.value, passwordConfirm.value);
});

// Form validation
const isFormValid = computed(() => {
  return (
    username.value.length > 0 &&
    password.value.length > 0 &&
    passwordConfirm.value.length > 0 &&
    !usernameError.value &&
    !passwordError.value &&
    !passwordConfirmError.value
  );
});

onMounted(() => {
  clearError();
});

const handleSubmit = async (e: Event) => {
  e.preventDefault();
  formErrors.value = {};

  // Final validation
  const usernameErr = validateUsername(username.value);
  const passwordErr = validatePassword(password.value);
  const confirmErr = validatePasswordConfirm(password.value, passwordConfirm.value);

  if (usernameErr || passwordErr || confirmErr) {
    if (usernameErr) formErrors.value.username = usernameErr;
    if (passwordErr) formErrors.value.password = passwordErr;
    if (confirmErr) formErrors.value.passwordConfirm = confirmErr;
    return;
  }

  const success = await signup({
    username: username.value.trim(),
    password: password.value,
    passwordConfirm: passwordConfirm.value,
  });

  // Clear sensitive fields
  password.value = '';
  passwordConfirm.value = '';

  if (success) {
    // Clear all fields after successful signup
    username.value = '';
    // Redirect to login page after successful signup
    await router.push('/login');
  } else {
    formErrors.value.general = error?.value || 'Signup failed. Please try again.';
  }
};

const navigateToLogin = async () => {
  clearError();
  formErrors.value = {};
  username.value = '';
  password.value = '';
  passwordConfirm.value = '';
  await router.push('/login');
};
</script>

<template>
  <div class="signup-page">
    <div class="signup-container">
      <div class="signup-card">
        <!-- Header -->
        <div class="signup-header">
          <h1 class="signup-title">Create Account</h1>
          <p class="signup-subtitle">Join us to manage your todos</p>
        </div>

        <!-- General Error Message -->
        <div
          v-if="formErrors.general"
          class="error-message"
          role="alert"
          aria-live="polite"
        >
          <span class="error-icon" aria-hidden="true">⚠️</span>
          <span class="error-text">{{ formErrors.general }}</span>
        </div>

        <!-- Signup Form -->
        <form @submit="handleSubmit" class="signup-form" novalidate>
          <!-- Username Field -->
          <div class="form-group">
            <label for="username" class="form-label">Username</label>
            <input
              id="username"
              v-model="username"
              type="text"
              class="form-input"
              :class="{ 'form-input-error': usernameError }"
              placeholder="Choose a username"
              required
              aria-required="true"
              aria-describedby="username-error"
              :aria-invalid="usernameError ? 'true' : 'false'"
              autocomplete="username"
              :disabled="loading"
            />
            <div
              v-if="usernameError"
              id="username-error"
              class="field-error"
              role="alert"
            >
              {{ usernameError }}
            </div>
            <div v-else class="field-hint">
              3-50 characters, letters, numbers, and underscores only
            </div>
          </div>

          <!-- Password Field -->
          <div class="form-group">
            <label for="password" class="form-label">Password</label>
            <input
              id="password"
              v-model="password"
              type="password"
              class="form-input"
              :class="{ 'form-input-error': passwordError }"
              placeholder="Create a password"
              required
              aria-required="true"
              aria-describedby="password-error"
              :aria-invalid="passwordError ? 'true' : 'false'"
              autocomplete="new-password"
              :disabled="loading"
            />
            <div
              v-if="passwordError"
              id="password-error"
              class="field-error"
              role="alert"
            >
              {{ passwordError }}
            </div>
            <div v-else class="field-hint">
              At least 8 characters with letters and numbers
            </div>
          </div>

          <!-- Password Confirmation Field -->
          <div class="form-group">
            <label for="password-confirm" class="form-label">
              Confirm Password
            </label>
            <input
              id="password-confirm"
              v-model="passwordConfirm"
              type="password"
              class="form-input"
              :class="{ 'form-input-error': passwordConfirmError }"
              placeholder="Confirm your password"
              required
              aria-required="true"
              aria-describedby="password-confirm-error"
              :aria-invalid="passwordConfirmError ? 'true' : 'false'"
              autocomplete="new-password"
              :disabled="loading"
            />
            <div
              v-if="passwordConfirmError"
              id="password-confirm-error"
              class="field-error"
              role="alert"
            >
              {{ passwordConfirmError }}
            </div>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            class="submit-button"
            :disabled="!isFormValid || loading"
            :aria-busy="loading"
          >
            <span v-if="!loading" class="button-text">Create Account</span>
            <span v-else class="button-text">
              <span class="loading-spinner" aria-hidden="true"></span>
              Creating account...
            </span>
          </button>
        </form>

        <!-- Loading Indicator -->
        <div v-if="loading" class="loading-indicator" aria-live="polite">
          <div class="spinner" aria-hidden="true"></div>
          <p class="loading-text">Setting up your account...</p>
        </div>

        <!-- Login Link -->
        <div class="login-section">
          <p class="login-text">
            Already have an account?
            <button
              type="button"
              class="login-link"
              @click="navigateToLogin"
              :disabled="loading"
            >
              Sign in here
            </button>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.signup-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1rem;
  background: linear-gradient(
    135deg,
    var(--color-primary) 0%,
    var(--color-primary-dark) 100%
  );
}

.signup-container {
  width: 100%;
  max-width: 450px;
}

.signup-card {
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
.signup-header {
  text-align: center;
  margin-bottom: 2rem;
}

.signup-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 0.5rem 0;
  letter-spacing: -0.5px;
}

.signup-subtitle {
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
.signup-form {
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

.form-input-error {
  border-color: var(--color-error);
}

.form-input-error:focus {
  box-shadow: 0 0 0 3px var(--color-error-light);
}

/* Field Error and Hint */
.field-error {
  font-size: 0.875rem;
  color: var(--color-error);
  font-weight: 500;
  animation: slideDown 0.2s ease-out;
}

.field-hint {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  font-weight: 400;
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

/* Login Section */
.login-section {
  text-align: center;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.login-text {
  font-size: 0.95rem;
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.5;
}

.login-link {
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

.login-link:hover:not(:disabled) {
  color: var(--color-primary-dark);
  text-decoration: underline;
}

.login-link:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

/* Responsive Design - Tablets */
@media (max-width: 768px) {
  .signup-card {
    padding: 2rem 1.5rem;
  }

  .signup-title {
    font-size: 1.5rem;
  }

  .signup-subtitle {
    font-size: 0.9rem;
  }
}

/* Responsive Design - Mobile */
@media (max-width: 480px) {
  .signup-page {
    padding: 1rem 0.75rem;
  }

  .signup-card {
    padding: 1.5rem 1.25rem;
  }

  .signup-title {
    font-size: 1.375rem;
  }

  .signup-subtitle {
    font-size: 0.875rem;
  }

  .signup-form {
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

  .field-error,
  .field-hint {
    font-size: 0.8125rem;
  }
}

/* Reduced Motion Support */
@media (prefers-reduced-motion: reduce) {
  .signup-card,
  .error-message,
  .field-error {
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
  .signup-card {
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
  .signup-page {
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  }
}
</style>
