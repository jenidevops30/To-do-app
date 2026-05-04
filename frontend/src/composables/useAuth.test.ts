import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAuth } from './useAuth';
import * as authServiceModule from '../services/authService';
import type { User, LoginRequest, SignupRequest } from '../types/auth';

// Mock the authService
vi.mock('../services/authService', () => ({
  authService: {
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
    getCsrfToken: vi.fn(),
    setAuthHeader: vi.fn(),
  },
}));

describe('useAuth composable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset modules to clear shared state between tests
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have initial auth state', () => {
      const { user, isAuthenticated, loading, error } = useAuth();

      expect(user.value).toBeNull();
      expect(isAuthenticated.value).toBe(false);
      expect(loading.value).toBe(false);
      expect(error.value).toBeNull();
    });

    it('should expose reactive state properties', () => {
      const { user, isAuthenticated, loading, error } = useAuth();

      expect(user).toHaveProperty('value');
      expect(isAuthenticated).toHaveProperty('value');
      expect(loading).toHaveProperty('value');
      expect(error).toHaveProperty('value');
    });
  });

  describe('login action', () => {
    it('should successfully login with valid credentials', async () => {
      const mockUser: User = { id: '1', username: 'testuser' };
      const credentials: LoginRequest = {
        username: 'testuser',
        password: 'password123',
      };

      vi.mocked(authServiceModule.authService.login).mockResolvedValue({
        success: true,
        csrfToken: 'test-csrf-token',
      });

      vi.mocked(authServiceModule.authService.getCurrentUser).mockResolvedValue(
        mockUser
      );

      const { login, isAuthenticated, user, loading, error } = useAuth();

      expect(loading.value).toBe(false);

      const result = await login(credentials);

      expect(result).toBe(true);
      expect(isAuthenticated.value).toBe(true);
      expect(user.value).toEqual(mockUser);
      expect(error.value).toBeNull();
      expect(loading.value).toBe(false);
    });

    it('should set loading state during login', async () => {
      const credentials: LoginRequest = {
        username: 'testuser',
        password: 'password123',
      };

      let loadingDuringCall = false;

      vi.mocked(authServiceModule.authService.login).mockImplementation(
        async () => {
          loadingDuringCall = true;
          return { success: true, csrfToken: 'token' };
        }
      );

      vi.mocked(authServiceModule.authService.getCurrentUser).mockResolvedValue(
        { id: '1', username: 'testuser' }
      );

      const { login, loading } = useAuth();

      const promise = login(credentials);
      // Note: loading state is set synchronously before the async call
      expect(loading.value).toBe(true);

      await promise;
      expect(loading.value).toBe(false);
    });

    it('should handle login failure with error message', async () => {
      const credentials: LoginRequest = {
        username: 'testuser',
        password: 'wrongpassword',
      };

      vi.mocked(authServiceModule.authService.login).mockResolvedValue({
        success: false,
        error: 'Invalid credentials',
      });

      const { login, error } = useAuth();

      const result = await login(credentials);

      expect(result).toBe(false);
      expect(error.value).toBe('Invalid credentials');
    });

    it('should handle login failure with default error message', async () => {
      const credentials: LoginRequest = {
        username: 'testuser',
        password: 'wrongpassword',
      };

      vi.mocked(authServiceModule.authService.login).mockResolvedValue({
        success: false,
      });

      const { login, error } = useAuth();

      await login(credentials);

      expect(error.value).toBe('Login failed. Please try again.');
    });

    it('should handle network error during login', async () => {
      const credentials: LoginRequest = {
        username: 'testuser',
        password: 'password123',
      };

      vi.mocked(authServiceModule.authService.login).mockRejectedValue(
        new Error('Network error')
      );

      const { login, error } = useAuth();

      const result = await login(credentials);

      expect(result).toBe(false);
      expect(error.value).toBe(
        'Connection error. Please check your internet and try again.'
      );
    });

    it('should set CSRF token header on successful login', async () => {
      const credentials: LoginRequest = {
        username: 'testuser',
        password: 'password123',
      };

      const csrfToken = 'test-csrf-token-123';

      vi.mocked(authServiceModule.authService.login).mockResolvedValue({
        success: true,
        csrfToken,
      });

      vi.mocked(authServiceModule.authService.getCurrentUser).mockResolvedValue(
        { id: '1', username: 'testuser' }
      );

      const { login } = useAuth();

      await login(credentials);

      expect(authServiceModule.authService.setAuthHeader).toHaveBeenCalledWith(
        csrfToken
      );
    });

    it('should clear previous error on new login attempt', async () => {
      const credentials: LoginRequest = {
        username: 'testuser',
        password: 'password123',
      };

      const { login, error, setError } = useAuth();

      // Set an error first
      setError('Previous error');
      expect(error.value).toBe('Previous error');

      // Now attempt login
      vi.mocked(authServiceModule.authService.login).mockResolvedValue({
        success: true,
        csrfToken: 'token',
      });

      vi.mocked(authServiceModule.authService.getCurrentUser).mockResolvedValue(
        { id: '1', username: 'testuser' }
      );

      await login(credentials);

      expect(error.value).toBeNull();
    });
  });

  describe('signup action', () => {
    it('should successfully signup with valid data', async () => {
      const signupData: SignupRequest = {
        username: 'newuser',
        password: 'password123',
        passwordConfirm: 'password123',
      };

      vi.mocked(authServiceModule.authService.signup).mockResolvedValue({
        success: true,
        message: 'Account created successfully',
      });

      const { signup, error } = useAuth();

      const result = await signup(signupData);

      expect(result).toBe(true);
      expect(error.value).toBeNull();
    });

    it('should handle signup failure with error message', async () => {
      const signupData: SignupRequest = {
        username: 'existinguser',
        password: 'password123',
        passwordConfirm: 'password123',
      };

      vi.mocked(authServiceModule.authService.signup).mockResolvedValue({
        success: false,
        error: 'Username already taken',
      });

      const { signup, error } = useAuth();

      const result = await signup(signupData);

      expect(result).toBe(false);
      expect(error.value).toBe('Username already taken');
    });

    it('should handle signup failure with default error message', async () => {
      const signupData: SignupRequest = {
        username: 'newuser',
        password: 'password123',
        passwordConfirm: 'password123',
      };

      vi.mocked(authServiceModule.authService.signup).mockResolvedValue({
        success: false,
      });

      const { signup, error } = useAuth();

      await signup(signupData);

      expect(error.value).toBe('Signup failed. Please try again.');
    });

    it('should handle network error during signup', async () => {
      const signupData: SignupRequest = {
        username: 'newuser',
        password: 'password123',
        passwordConfirm: 'password123',
      };

      vi.mocked(authServiceModule.authService.signup).mockRejectedValue(
        new Error('Network error')
      );

      const { signup, error } = useAuth();

      const result = await signup(signupData);

      expect(result).toBe(false);
      expect(error.value).toBe(
        'Connection error. Please check your internet and try again.'
      );
    });

    it('should set loading state during signup', async () => {
      const signupData: SignupRequest = {
        username: 'newuser',
        password: 'password123',
        passwordConfirm: 'password123',
      };

      vi.mocked(authServiceModule.authService.signup).mockResolvedValue({
        success: true,
      });

      const { signup, loading } = useAuth();

      expect(loading.value).toBe(false);

      const promise = signup(signupData);
      expect(loading.value).toBe(true);

      await promise;
      expect(loading.value).toBe(false);
    });

    it('should clear previous error on new signup attempt', async () => {
      const signupData: SignupRequest = {
        username: 'newuser',
        password: 'password123',
        passwordConfirm: 'password123',
      };

      const { signup, error, setError } = useAuth();

      // Set an error first
      setError('Previous error');
      expect(error.value).toBe('Previous error');

      // Now attempt signup
      vi.mocked(authServiceModule.authService.signup).mockResolvedValue({
        success: true,
      });

      await signup(signupData);

      expect(error.value).toBeNull();
    });
  });

  describe('logout action', () => {
    it('should successfully logout', async () => {
      const { logout, isAuthenticated, user, loading } = useAuth();

      // First set authenticated state
      // We need to manually set this since we're testing logout
      // In real usage, this would be set by login
      vi.mocked(authServiceModule.authService.logout).mockResolvedValue(
        undefined
      );

      await logout();

      expect(isAuthenticated.value).toBe(false);
      expect(user.value).toBeNull();
      expect(loading.value).toBe(false);
    });

    it('should call authService.logout', async () => {
      const { logout } = useAuth();

      vi.mocked(authServiceModule.authService.logout).mockResolvedValue(
        undefined
      );

      await logout();

      expect(authServiceModule.authService.logout).toHaveBeenCalled();
    });

    it('should handle logout error gracefully', async () => {
      const { logout, isAuthenticated, user } = useAuth();

      vi.mocked(authServiceModule.authService.logout).mockRejectedValue(
        new Error('Logout failed')
      );

      // Should not throw
      await expect(logout()).resolves.not.toThrow();

      // Should still clear auth state
      expect(isAuthenticated.value).toBe(false);
      expect(user.value).toBeNull();
    });

    it('should clear error on logout', async () => {
      const { logout, error, setError } = useAuth();

      setError('Some error');
      expect(error.value).toBe('Some error');

      vi.mocked(authServiceModule.authService.logout).mockResolvedValue(
        undefined
      );

      await logout();

      expect(error.value).toBeNull();
    });

    it('should set loading state during logout', async () => {
      const { logout, loading } = useAuth();

      vi.mocked(authServiceModule.authService.logout).mockResolvedValue(
        undefined
      );

      const promise = logout();
      expect(loading.value).toBe(true);

      await promise;
      expect(loading.value).toBe(false);
    });
  });

  describe('checkAuth action', () => {
    it('should restore authenticated state when user exists', async () => {
      const mockUser: User = { id: '1', username: 'testuser' };

      vi.mocked(authServiceModule.authService.getCurrentUser).mockResolvedValue(
        mockUser
      );

      const { checkAuth, isAuthenticated, user } = useAuth();

      await checkAuth();

      expect(isAuthenticated.value).toBe(true);
      expect(user.value).toEqual(mockUser);
    });

    it('should clear auth state when user does not exist', async () => {
      vi.mocked(authServiceModule.authService.getCurrentUser).mockResolvedValue(
        null
      );

      const { checkAuth, isAuthenticated, user } = useAuth();

      await checkAuth();

      expect(isAuthenticated.value).toBe(false);
      expect(user.value).toBeNull();
    });

    it('should handle error during checkAuth', async () => {
      vi.mocked(authServiceModule.authService.getCurrentUser).mockRejectedValue(
        new Error('Network error')
      );

      const { checkAuth, isAuthenticated, user } = useAuth();

      await checkAuth();

      expect(isAuthenticated.value).toBe(false);
      expect(user.value).toBeNull();
    });

    it('should set loading state during checkAuth', async () => {
      vi.mocked(authServiceModule.authService.getCurrentUser).mockResolvedValue(
        { id: '1', username: 'testuser' }
      );

      const { checkAuth, loading } = useAuth();

      expect(loading.value).toBe(false);

      const promise = checkAuth();
      expect(loading.value).toBe(true);

      await promise;
      expect(loading.value).toBe(false);
    });
  });

  describe('clearError action', () => {
    it('should clear error message', () => {
      const { error, setError, clearError } = useAuth();

      setError('Some error');
      expect(error.value).toBe('Some error');

      clearError();
      expect(error.value).toBeNull();
    });

    it('should work when error is already null', () => {
      const { error, clearError } = useAuth();

      expect(error.value).toBeNull();

      clearError();
      expect(error.value).toBeNull();
    });
  });

  describe('setError action', () => {
    it('should set error message', () => {
      const { error, setError } = useAuth();

      setError('New error');
      expect(error.value).toBe('New error');
    });

    it('should update error message', () => {
      const { error, setError } = useAuth();

      setError('First error');
      expect(error.value).toBe('First error');

      setError('Second error');
      expect(error.value).toBe('Second error');
    });

    it('should clear error when set to null', () => {
      const { error, setError } = useAuth();

      setError('Some error');
      expect(error.value).toBe('Some error');

      setError(null);
      expect(error.value).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing error property in login response', async () => {
      const credentials: LoginRequest = {
        username: 'testuser',
        password: 'password123',
      };

      vi.mocked(authServiceModule.authService.login).mockResolvedValue({
        success: false,
      });

      const { login, error } = useAuth();

      await login(credentials);

      expect(error.value).toBe('Login failed. Please try again.');
    });

    it('should handle missing error property in signup response', async () => {
      const signupData: SignupRequest = {
        username: 'newuser',
        password: 'password123',
        passwordConfirm: 'password123',
      };

      vi.mocked(authServiceModule.authService.signup).mockResolvedValue({
        success: false,
      });

      const { signup, error } = useAuth();

      await signup(signupData);

      expect(error.value).toBe('Signup failed. Please try again.');
    });
  });
});
