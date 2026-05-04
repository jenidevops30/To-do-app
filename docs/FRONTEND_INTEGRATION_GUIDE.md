# Frontend Integration Guide: User Login Feature

## Overview

This guide explains how to integrate the authentication system into your Vue.js 3 frontend application. It covers the AuthService, useAuth composable, ProtectedRoute component, and error handling patterns.

**Validates**: Requirements 2.1, 4.1, 6.1, 6.2, 6.3

---

## Table of Contents

1. [AuthService Usage](#authservice-usage)
2. [useAuth Composable](#useauth-composable)
3. [ProtectedRoute Component](#protectedroute-component)
4. [Error Handling](#error-handling)
5. [Integration Examples](#integration-examples)
6. [Best Practices](#best-practices)

---

## AuthService Usage

### Overview

The `AuthService` is a TypeScript service that handles all authentication API calls. It provides methods for signup, login, logout, and session management.

**Location**: `frontend/src/services/authService.ts`

### Methods

#### login(username: string, password: string): Promise<LoginResponse>

Authenticate a user with username and password.

**Parameters**:
- `username`: User's username
- `password`: User's password

**Returns**: Promise resolving to LoginResponse object

**Response**:
```typescript
interface LoginResponse {
  success: boolean;
  csrfToken: string;
  user?: {
    id: string;
    username: string;
  };
  error?: string;
}
```

**Example**:
```typescript
import { authService } from '@/services/authService';

try {
  const response = await authService.login('john_doe', 'SecurePass123');
  if (response.success) {
    console.log('Login successful');
    console.log('User:', response.user);
  } else {
    console.error('Login failed:', response.error);
  }
} catch (error) {
  console.error('Network error:', error);
}
```

**Validates**: Requirements 2.1

---

#### signup(username: string, password: string, passwordConfirm: string): Promise<SignupResponse>

Create a new user account.

**Parameters**:
- `username`: Desired username (3-50 characters)
- `password`: Desired password (8+ characters, letters and numbers)
- `passwordConfirm`: Password confirmation (must match password)

**Returns**: Promise resolving to SignupResponse object

**Response**:
```typescript
interface SignupResponse {
  success: boolean;
  message?: string;
  errors?: {
    [key: string]: string[];
  };
  error?: string;
}
```

**Example**:
```typescript
import { authService } from '@/services/authService';

try {
  const response = await authService.signup(
    'john_doe',
    'SecurePass123',
    'SecurePass123'
  );
  if (response.success) {
    console.log('Signup successful');
    // Redirect to login page
  } else {
    console.error('Signup failed:', response.errors);
  }
} catch (error) {
  console.error('Network error:', error);
}
```

**Validates**: Requirements 1.1

---

#### logout(): Promise<LogoutResponse>

Logout the current user and invalidate the session.

**Parameters**: None

**Returns**: Promise resolving to LogoutResponse object

**Response**:
```typescript
interface LogoutResponse {
  success: boolean;
  message?: string;
  error?: string;
}
```

**Example**:
```typescript
import { authService } from '@/services/authService';

try {
  const response = await authService.logout();
  if (response.success) {
    console.log('Logout successful');
    // Redirect to login page
  } else {
    console.error('Logout failed:', response.error);
  }
} catch (error) {
  console.error('Network error:', error);
}
```

**Validates**: Requirements 4.1

---

#### getCurrentUser(): Promise<CurrentUserResponse>

Get information about the currently authenticated user.

**Parameters**: None

**Returns**: Promise resolving to CurrentUserResponse object

**Response**:
```typescript
interface CurrentUserResponse {
  user?: {
    id: string;
    username: string;
  };
  error?: string;
}
```

**Example**:
```typescript
import { authService } from '@/services/authService';

try {
  const response = await authService.getCurrentUser();
  if (response.user) {
    console.log('Current user:', response.user);
  } else {
    console.log('Not authenticated');
  }
} catch (error) {
  console.error('Network error:', error);
}
```

**Validates**: Requirements 6.1, 6.2, 6.3

---

#### getCsrfToken(): Promise<CsrfTokenResponse>

Get a CSRF token for state-changing requests.

**Parameters**: None

**Returns**: Promise resolving to CsrfTokenResponse object

**Response**:
```typescript
interface CsrfTokenResponse {
  csrfToken: string;
}
```

**Example**:
```typescript
import { authService } from '@/services/authService';

try {
  const response = await authService.getCsrfToken();
  console.log('CSRF token:', response.csrfToken);
} catch (error) {
  console.error('Network error:', error);
}
```

**Validates**: Requirements 11.1, 11.4

---

## useAuth Composable

### Overview

The `useAuth` composable provides reactive authentication state and actions for use in Vue components. It manages login state, current user, loading state, and error messages.

**Location**: `frontend/src/composables/useAuth.ts`

### State Properties

```typescript
interface AuthState {
  isAuthenticated: Ref<boolean>;
  user: Ref<User | null>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
}
```

**Properties**:
- `isAuthenticated`: Whether the user is currently authenticated
- `user`: Current user object (id, username) or null
- `loading`: Whether an authentication request is in progress
- `error`: Error message from the last failed request

### Usage

```typescript
import { useAuth } from '@/composables/useAuth';

export default {
  setup() {
    const { isAuthenticated, user, loading, error } = useAuth();

    return {
      isAuthenticated,
      user,
      loading,
      error
    };
  }
};
```

### Actions

#### login(username: string, password: string): Promise<void>

Authenticate a user.

**Example**:
```typescript
import { useAuth } from '@/composables/useAuth';

export default {
  setup() {
    const { login, loading, error } = useAuth();

    const handleLogin = async () => {
      try {
        await login('john_doe', 'SecurePass123');
        // Redirect to todos page
      } catch (err) {
        console.error('Login failed:', error.value);
      }
    };

    return { handleLogin, loading, error };
  }
};
```

**Validates**: Requirements 2.1

---

#### signup(username: string, password: string, passwordConfirm: string): Promise<void>

Create a new user account.

**Example**:
```typescript
import { useAuth } from '@/composables/useAuth';

export default {
  setup() {
    const { signup, loading, error } = useAuth();

    const handleSignup = async () => {
      try {
        await signup('john_doe', 'SecurePass123', 'SecurePass123');
        // Redirect to login page
      } catch (err) {
        console.error('Signup failed:', error.value);
      }
    };

    return { handleSignup, loading, error };
  }
};
```

**Validates**: Requirements 1.1

---

#### logout(): Promise<void>

Logout the current user.

**Example**:
```typescript
import { useAuth } from '@/composables/useAuth';

export default {
  setup() {
    const { logout, loading, error } = useAuth();

    const handleLogout = async () => {
      try {
        await logout();
        // Redirect to login page
      } catch (err) {
        console.error('Logout failed:', error.value);
      }
    };

    return { handleLogout, loading, error };
  }
};
```

**Validates**: Requirements 4.1

---

#### checkAuth(): Promise<void>

Check if the user is currently authenticated and restore session state.

**Example**:
```typescript
import { useAuth } from '@/composables/useAuth';
import { onMounted } from 'vue';

export default {
  setup() {
    const { checkAuth, isAuthenticated } = useAuth();

    onMounted(async () => {
      await checkAuth();
      if (isAuthenticated.value) {
        console.log('User is authenticated');
      } else {
        console.log('User is not authenticated');
      }
    });

    return { isAuthenticated };
  }
};
```

**Validates**: Requirements 6.2, 6.3, 6.4

---

#### clearError(): void

Clear the current error message.

**Example**:
```typescript
import { useAuth } from '@/composables/useAuth';

export default {
  setup() {
    const { error, clearError } = useAuth();

    const handleDismissError = () => {
      clearError();
    };

    return { error, handleDismissError };
  }
};
```

---

## ProtectedRoute Component

### Overview

The `ProtectedRoute` component is a wrapper that protects routes from unauthenticated access. It redirects unauthenticated users to the login page.

**Location**: `frontend/src/components/ProtectedRoute.vue`

**Validates**: Requirements 13.1, 13.5

### Usage

Wrap your protected routes with the ProtectedRoute component:

```typescript
import { createRouter, createWebHistory } from 'vue-router';
import ProtectedRoute from '@/components/ProtectedRoute.vue';
import TodoList from '@/pages/TodoList.vue';
import LoginPage from '@/pages/LoginPage.vue';

const routes = [
  {
    path: '/login',
    component: LoginPage
  },
  {
    path: '/todos',
    component: ProtectedRoute,
    children: [
      {
        path: '',
        component: TodoList
      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
```

### How It Works

1. **Mount**: When the component mounts, it checks for a valid session token
2. **Validate**: It calls `checkAuth()` to validate the session
3. **Redirect**: If not authenticated, it redirects to the login page
4. **Render**: If authenticated, it renders the child component

### Example

```vue
<template>
  <div v-if="isAuthenticated" class="protected-content">
    <slot />
  </div>
  <div v-else class="loading">
    <p>Checking authentication...</p>
  </div>
</template>

<script setup lang="ts">
import { useAuth } from '@/composables/useAuth';
import { useRouter } from 'vue-router';
import { onMounted } from 'vue';

const { isAuthenticated, checkAuth } = useAuth();
const router = useRouter();

onMounted(async () => {
  await checkAuth();
  if (!isAuthenticated.value) {
    router.push('/login');
  }
});
</script>
```

---

## Error Handling

### Overview

The authentication system provides comprehensive error handling with user-friendly messages. Errors are categorized by type and handled appropriately.

**Validates**: Requirements 14.1, 14.2, 14.3, 14.4

### Error Types

#### Authentication Errors

Returned when login/signup credentials are invalid.

**Example**:
```typescript
const response = await authService.login('john_doe', 'WrongPassword');
// Response: { success: false, error: "Invalid credentials" }
```

**Handling**:
```typescript
if (!response.success) {
  // Display generic error message to user
  showErrorMessage('Invalid credentials. Please try again.');
}
```

#### Validation Errors

Returned when input validation fails (e.g., password too short).

**Example**:
```typescript
const response = await authService.signup('ab', 'pass', 'pass');
// Response: {
//   success: false,
//   errors: {
//     username: ["Username must be at least 3 characters"],
//     password: ["Password must contain both letters and numbers"]
//   }
// }
```

**Handling**:
```typescript
if (!response.success && response.errors) {
  // Display field-specific error messages
  for (const [field, messages] of Object.entries(response.errors)) {
    showFieldError(field, messages[0]);
  }
}
```

#### Session Errors

Returned when session is invalid or expired.

**Example**:
```typescript
const response = await authService.getCurrentUser();
// Response: { error: "Not authenticated" }
```

**Handling**:
```typescript
if (response.error) {
  // Redirect to login page
  router.push('/login');
  showErrorMessage('Your session has expired. Please log in again.');
}
```

#### Network Errors

Thrown when network request fails.

**Example**:
```typescript
try {
  await authService.login('john_doe', 'SecurePass123');
} catch (error) {
  // Network error occurred
  showErrorMessage('Connection error. Please check your internet and try again.');
}
```

**Handling**:
```typescript
try {
  await authService.login(username, password);
} catch (error) {
  if (error instanceof TypeError) {
    // Network error
    showErrorMessage('Connection error. Please check your internet and try again.');
  } else {
    // Other error
    showErrorMessage('An unexpected error occurred. Please try again.');
  }
}
```

### Error Display Patterns

#### Inline Field Errors

Display errors below the relevant form field:

```vue
<template>
  <form @submit.prevent="handleLogin">
    <div class="form-group">
      <label for="username">Username</label>
      <input
        id="username"
        v-model="username"
        type="text"
        class="form-control"
        :class="{ 'is-invalid': errors.username }"
      />
      <div v-if="errors.username" class="invalid-feedback">
        {{ errors.username[0] }}
      </div>
    </div>

    <div class="form-group">
      <label for="password">Password</label>
      <input
        id="password"
        v-model="password"
        type="password"
        class="form-control"
        :class="{ 'is-invalid': errors.password }"
      />
      <div v-if="errors.password" class="invalid-feedback">
        {{ errors.password[0] }}
      </div>
    </div>

    <button type="submit" :disabled="loading">
      {{ loading ? 'Logging in...' : 'Login' }}
    </button>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuth } from '@/composables/useAuth';

const username = ref('');
const password = ref('');
const errors = ref({});
const { login, loading } = useAuth();

const handleLogin = async () => {
  errors.value = {};
  const response = await authService.login(username.value, password.value);
  
  if (!response.success) {
    if (response.errors) {
      errors.value = response.errors;
    } else {
      // Generic error
      showErrorMessage(response.error || 'Login failed');
    }
  }
};
</script>
```

#### Alert Messages

Display generic error messages in an alert:

```vue
<template>
  <div v-if="error" class="alert alert-danger" role="alert">
    {{ error }}
    <button
      type="button"
      class="btn-close"
      @click="clearError"
      aria-label="Close"
    />
  </div>
</template>

<script setup lang="ts">
import { useAuth } from '@/composables/useAuth';

const { error, clearError } = useAuth();
</script>
```

#### Toast Notifications

Display errors as toast notifications:

```typescript
import { useToast } from '@/composables/useToast';

const { showError } = useToast();

try {
  await authService.login(username, password);
} catch (error) {
  showError('Connection error. Please try again.');
}
```

---

## Integration Examples

### Complete Login Page

```vue
<template>
  <div class="login-page">
    <div class="login-container">
      <h1>Login</h1>

      <div v-if="error" class="alert alert-danger" role="alert">
        {{ error }}
        <button
          type="button"
          class="btn-close"
          @click="clearError"
          aria-label="Close"
        />
      </div>

      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="username">Username</label>
          <input
            id="username"
            v-model="username"
            type="text"
            class="form-control"
            required
            :disabled="loading"
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="form-control"
            required
            :disabled="loading"
          />
        </div>

        <button
          type="submit"
          class="btn btn-primary"
          :disabled="loading"
        >
          {{ loading ? 'Logging in...' : 'Login' }}
        </button>
      </form>

      <p class="signup-link">
        Don't have an account?
        <router-link to="/signup">Sign up here</router-link>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import { authService } from '@/services/authService';

const router = useRouter();
const username = ref('');
const password = ref('');
const { loading, error, clearError } = useAuth();

const handleLogin = async () => {
  const response = await authService.login(username.value, password.value);
  
  if (response.success) {
    // Redirect to todos page
    router.push('/todos');
  } else {
    // Error is automatically set by useAuth
    // Clear password field for security
    password.value = '';
  }
};
</script>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.login-container {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

.form-group {
  margin-bottom: 1rem;
}

.signup-link {
  margin-top: 1rem;
  text-align: center;
}
</style>
```

### Complete Signup Page

```vue
<template>
  <div class="signup-page">
    <div class="signup-container">
      <h1>Create Account</h1>

      <div v-if="generalError" class="alert alert-danger" role="alert">
        {{ generalError }}
        <button
          type="button"
          class="btn-close"
          @click="generalError = ''"
          aria-label="Close"
        />
      </div>

      <form @submit.prevent="handleSignup">
        <div class="form-group">
          <label for="username">Username</label>
          <input
            id="username"
            v-model="username"
            type="text"
            class="form-control"
            :class="{ 'is-invalid': errors.username }"
            required
            :disabled="loading"
          />
          <div v-if="errors.username" class="invalid-feedback">
            {{ errors.username[0] }}
          </div>
          <small class="form-text text-muted">
            3-50 characters, alphanumeric and underscores only
          </small>
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="form-control"
            :class="{ 'is-invalid': errors.password }"
            required
            :disabled="loading"
          />
          <div v-if="errors.password" class="invalid-feedback">
            {{ errors.password[0] }}
          </div>
          <small class="form-text text-muted">
            8+ characters, must contain letters and numbers
          </small>
        </div>

        <div class="form-group">
          <label for="passwordConfirm">Confirm Password</label>
          <input
            id="passwordConfirm"
            v-model="passwordConfirm"
            type="password"
            class="form-control"
            :class="{ 'is-invalid': passwordMismatch }"
            required
            :disabled="loading"
          />
          <div v-if="passwordMismatch" class="invalid-feedback">
            Passwords do not match
          </div>
        </div>

        <button
          type="submit"
          class="btn btn-primary"
          :disabled="loading || !isFormValid"
        >
          {{ loading ? 'Creating account...' : 'Sign Up' }}
        </button>
      </form>

      <p class="login-link">
        Already have an account?
        <router-link to="/login">Log in here</router-link>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { authService } from '@/services/authService';

const router = useRouter();
const username = ref('');
const password = ref('');
const passwordConfirm = ref('');
const loading = ref(false);
const errors = ref({});
const generalError = ref('');

const passwordMismatch = computed(() => {
  return password.value && passwordConfirm.value && password.value !== passwordConfirm.value;
});

const isFormValid = computed(() => {
  return (
    username.value.length >= 3 &&
    password.value.length >= 8 &&
    password.value === passwordConfirm.value &&
    !passwordMismatch.value
  );
});

const handleSignup = async () => {
  loading.value = true;
  errors.value = {};
  generalError.value = '';

  try {
    const response = await authService.signup(
      username.value,
      password.value,
      passwordConfirm.value
    );

    if (response.success) {
      // Redirect to login page
      router.push('/login');
    } else if (response.errors) {
      errors.value = response.errors;
    } else {
      generalError.value = response.error || 'Signup failed. Please try again.';
    }
  } catch (error) {
    generalError.value = 'Connection error. Please check your internet and try again.';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.signup-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.signup-container {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

.form-group {
  margin-bottom: 1rem;
}

.login-link {
  margin-top: 1rem;
  text-align: center;
}
</style>
```

### Navigation with Logout

```vue
<template>
  <nav class="navbar">
    <div class="navbar-brand">
      <router-link to="/">Todo App</router-link>
    </div>

    <div class="navbar-menu">
      <div v-if="isAuthenticated" class="navbar-item">
        <span class="username">{{ user?.username }}</span>
        <button
          class="btn btn-logout"
          @click="handleLogout"
          :disabled="loading"
        >
          Logout
        </button>
      </div>
      <div v-else class="navbar-item">
        <router-link to="/login" class="btn btn-login">Login</router-link>
        <router-link to="/signup" class="btn btn-signup">Sign Up</router-link>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';

const router = useRouter();
const { isAuthenticated, user, loading, logout } = useAuth();

const handleLogout = async () => {
  if (confirm('Are you sure you want to logout?')) {
    await logout();
    router.push('/login');
  }
};
</script>

<style scoped>
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: #333;
  color: white;
}

.navbar-brand a {
  color: white;
  text-decoration: none;
  font-weight: bold;
}

.navbar-menu {
  display: flex;
  gap: 1rem;
}

.navbar-item {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.username {
  font-weight: bold;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: none;
}

.btn-logout {
  background-color: #dc3545;
  color: white;
}

.btn-login {
  background-color: #007bff;
  color: white;
}

.btn-signup {
  background-color: #28a745;
  color: white;
}
</style>
```

---

## Best Practices

### 1. Always Check Authentication on App Load

```typescript
import { useAuth } from '@/composables/useAuth';
import { onMounted } from 'vue';

export default {
  setup() {
    const { checkAuth } = useAuth();

    onMounted(async () => {
      await checkAuth();
    });
  }
};
```

### 2. Clear Sensitive Data on Logout

```typescript
const handleLogout = async () => {
  await logout();
  // Clear any sensitive data from local storage
  localStorage.removeItem('user_preferences');
  router.push('/login');
};
```

### 3. Handle Session Expiration Gracefully

```typescript
// In axios interceptor
response.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Session expired
      useAuth().logout();
      router.push('/login');
    }
    return Promise.reject(error);
  }
);
```

### 4. Validate Input Before Submission

```typescript
const isFormValid = computed(() => {
  return (
    username.value.length >= 3 &&
    password.value.length >= 8 &&
    password.value === passwordConfirm.value
  );
});
```

### 5. Disable Submit Button During Request

```vue
<button
  type="submit"
  :disabled="loading"
>
  {{ loading ? 'Loading...' : 'Submit' }}
</button>
```

### 6. Display User-Friendly Error Messages

```typescript
// Don't expose technical details
// ❌ Bad: "TypeError: Network request failed"
// ✅ Good: "Connection error. Please check your internet and try again."
```

### 7. Use CSRF Tokens for State-Changing Requests

```typescript
// AuthService automatically includes CSRF tokens
// No manual handling needed
const response = await authService.login(username, password);
```

### 8. Protect Routes with ProtectedRoute

```typescript
const routes = [
  {
    path: '/todos',
    component: ProtectedRoute,
    children: [
      {
        path: '',
        component: TodoList
      }
    ]
  }
];
```

### 9. Store Session Token in HTTP-Only Cookie

```typescript
// Session token is automatically stored in HTTP-only cookie
// Never access it from JavaScript
// ❌ Bad: localStorage.setItem('session_token', token)
// ✅ Good: Let the browser handle the cookie
```

### 10. Implement Proper Error Recovery

```typescript
const handleLogin = async () => {
  try {
    const response = await authService.login(username, password);
    if (response.success) {
      router.push('/todos');
    } else {
      // Show error to user
      error.value = response.error;
      // Clear password for security
      password.value = '';
    }
  } catch (err) {
    // Network error
    error.value = 'Connection error. Please try again.';
  }
};
```

