import { ref, computed } from 'vue';
import { authService } from '../services/authService';
import { apiClient } from '../services/api';
import type { User, LoginRequest, SignupRequest } from '../types/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const authState = ref<AuthState>({
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
});

export function useAuth() {
  const user = computed(() => authState.value.user);
  const isAuthenticated = computed(() => authState.value.isAuthenticated);
  const loading = computed(() => authState.value.loading);
  const error = computed(() => authState.value.error);

  const setError = (message: string | null) => {
    authState.value.error = message;
  };

  const clearError = () => {
    authState.value.error = null;
  };

  const login = async (credentials: LoginRequest): Promise<boolean> => {
    authState.value.loading = true;
    authState.value.error = null;

    try {
      const response = await authService.login(credentials);

      if (response.success && response.csrfToken) {
        authService.setAuthHeader(response.csrfToken);
        apiClient.setCsrfToken(response.csrfToken);
        const currentUser = await authService.getCurrentUser();

        if (currentUser) {
          authState.value.user = currentUser;
          authState.value.isAuthenticated = true;
          return true;
        }
      } else {
        authState.value.error =
          response.error || 'Login failed. Please try again.';
      }
    } catch (err) {
      authState.value.error =
        'Connection error. Please check your internet and try again.';
      console.error('Login error:', err);
    } finally {
      authState.value.loading = false;
    }

    return false;
  };

  const signup = async (data: SignupRequest): Promise<boolean> => {
    authState.value.loading = true;
    authState.value.error = null;

    try {
      const response = await authService.signup(data);

      if (response.success) {
        return true;
      } else {
        authState.value.error = response.error || 'Signup failed. Please try again.';
      }
    } catch (err) {
      authState.value.error =
        'Connection error. Please check your internet and try again.';
      console.error('Signup error:', err);
    } finally {
      authState.value.loading = false;
    }

    return false;
  };

  const logout = async (): Promise<void> => {
    authState.value.loading = true;

    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      authState.value.user = null;
      authState.value.isAuthenticated = false;
      authState.value.loading = false;
      authState.value.error = null;
    }
  };

  const checkAuth = async (): Promise<void> => {
    authState.value.loading = true;

    try {
      const currentUser = await authService.getCurrentUser();

      if (currentUser) {
        authState.value.user = currentUser;
        authState.value.isAuthenticated = true;
      } else {
        authState.value.user = null;
        authState.value.isAuthenticated = false;
      }
    } catch (err) {
      console.error('Auth check error:', err);
      authState.value.user = null;
      authState.value.isAuthenticated = false;
    } finally {
      authState.value.loading = false;
    }
  };

  return {
    user,
    isAuthenticated,
    loading,
    error,
    login,
    signup,
    logout,
    checkAuth,
    setError,
    clearError,
  };
}
