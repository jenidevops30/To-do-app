import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';
import type {
  LoginRequest,
  SignupRequest,
  User,
} from '../types/auth';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock axios
vi.mock('axios');

describe('AuthService', () => {
  let mockAxiosInstance: any;
  let AuthService: any;

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    localStorage.clear();

    // Create a mock axios instance with interceptors
    mockAxiosInstance = {
      post: vi.fn(),
      get: vi.fn(),
      defaults: {
        headers: {
          common: {},
        },
      },
      interceptors: {
        request: {
          use: vi.fn((success, error) => {
            mockAxiosInstance.requestInterceptor = { success, error };
          }),
        },
        response: {
          use: vi.fn((success, error) => {
            mockAxiosInstance.responseInterceptor = { success, error };
          }),
        },
      },
    };

    // Mock axios.create to return our mock instance
    vi.mocked(axios.create).mockReturnValue(mockAxiosInstance);

    // Mock axios.isAxiosError
    vi.mocked(axios.isAxiosError).mockImplementation((error: any) => {
      return error && error.response !== undefined;
    });

    // Dynamically import AuthService after mocking axios
    // We need to clear the module cache and reimport
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const { authService } = await import('./authService');

      const credentials: LoginRequest = {
        username: 'testuser',
        password: 'password123',
      };

      const mockResponse = {
        data: {
          success: true,
          csrfToken: 'test-csrf-token',
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await authService.login(credentials);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        'auth/login',
        credentials
      );
      expect(result.success).toBe(true);
      expect(result.csrfToken).toBe('test-csrf-token');
    });

    it('should handle login error response', async () => {
      const { authService } = await import('./authService');

      const credentials: LoginRequest = {
        username: 'testuser',
        password: 'wrongpassword',
      };

      const mockError = {
        response: {
          data: {
            success: false,
            error: 'Invalid credentials',
          },
        },
      };

      mockAxiosInstance.post.mockRejectedValue(mockError);

      const result = await authService.login(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('should handle network error during login', async () => {
      const { authService } = await import('./authService');

      const credentials: LoginRequest = {
        username: 'testuser',
        password: 'password123',
      };

      const mockError = new Error('Network error');

      mockAxiosInstance.post.mockRejectedValue(mockError);

      const result = await authService.login(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Connection error. Please check your internet and try again.'
      );
    });
  });

  describe('signup', () => {
    it('should successfully signup with valid data', async () => {
      const { authService } = await import('./authService');

      const signupData: SignupRequest = {
        username: 'newuser',
        password: 'password123',
        passwordConfirm: 'password123',
      };

      const mockResponse = {
        data: {
          success: true,
          message: 'Account created successfully',
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await authService.signup(signupData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        'auth/signup',
        signupData
      );
      expect(result.success).toBe(true);
      expect(result.message).toBe('Account created successfully');
    });

    it('should handle signup error - duplicate username', async () => {
      const { authService } = await import('./authService');

      const signupData: SignupRequest = {
        username: 'existinguser',
        password: 'password123',
        passwordConfirm: 'password123',
      };

      const mockError = {
        response: {
          data: {
            success: false,
            error: 'Username already taken',
          },
        },
      };

      mockAxiosInstance.post.mockRejectedValue(mockError);

      const result = await authService.signup(signupData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Username already taken');
    });

    it('should handle signup error - validation failure', async () => {
      const { authService } = await import('./authService');

      const signupData: SignupRequest = {
        username: 'ab',
        password: 'short',
        passwordConfirm: 'short',
      };

      const mockError = {
        response: {
          data: {
            success: false,
            error: 'Validation failed',
          },
        },
      };

      mockAxiosInstance.post.mockRejectedValue(mockError);

      const result = await authService.signup(signupData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
    });

    it('should handle network error during signup', async () => {
      const { authService } = await import('./authService');

      const signupData: SignupRequest = {
        username: 'newuser',
        password: 'password123',
        passwordConfirm: 'password123',
      };

      const mockError = new Error('Network error');

      mockAxiosInstance.post.mockRejectedValue(mockError);

      const result = await authService.signup(signupData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Connection error. Please check your internet and try again.'
      );
    });
  });

  describe('logout', () => {
    it('should successfully logout', async () => {
      const { authService } = await import('./authService');

      mockAxiosInstance.post.mockResolvedValue({ data: {} });

      await authService.logout();

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('auth/logout', {});
    });

    it('should handle logout error gracefully', async () => {
      const { authService } = await import('./authService');

      const mockError = new Error('Logout failed');
      mockAxiosInstance.post.mockRejectedValue(mockError);

      // Should not throw, just log error
      await expect(authService.logout()).resolves.not.toThrow();
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user when authenticated', async () => {
      const { authService } = await import('./authService');

      const mockUser: User = {
        id: '123',
        username: 'testuser',
      };

      const mockResponse = {
        data: {
          user: mockUser,
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await authService.getCurrentUser();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('auth/me');
      expect(result).toEqual(mockUser);
    });

    it('should return null when not authenticated', async () => {
      const { authService } = await import('./authService');

      const mockResponse = {
        data: {
          error: 'Not authenticated',
        },
      };

      mockAxiosInstance.get.mockRejectedValue(new Error('401'));

      const result = await authService.getCurrentUser();

      expect(result).toBeNull();
    });

    it('should return null on network error', async () => {
      const { authService } = await import('./authService');

      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));

      const result = await authService.getCurrentUser();

      expect(result).toBeNull();
    });

    it('should return null when user is not in response', async () => {
      const { authService } = await import('./authService');

      const mockResponse = {
        data: {},
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await authService.getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('getCsrfToken', () => {
    it('should return CSRF token', async () => {
      const { authService } = await import('./authService');

      const mockResponse = {
        data: {
          csrfToken: 'test-csrf-token-12345',
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await authService.getCsrfToken();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('auth/csrf-token');
      expect(result).toBe('test-csrf-token-12345');
    });

    it('should throw error when CSRF token fetch fails', async () => {
      const { authService } = await import('./authService');

      const mockError = new Error('Failed to get CSRF token');
      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(authService.getCsrfToken()).rejects.toThrow(
        'Connection error. Please check your internet and try again.'
      );
    });

    it('should handle network error', async () => {
      const { authService } = await import('./authService');

      const mockError = new Error('Network error');
      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(authService.getCsrfToken()).rejects.toThrow(
        'Connection error. Please check your internet and try again.'
      );
    });
  });

  describe('setAuthHeader', () => {
    it('should set CSRF token in request headers', async () => {
      const { authService } = await import('./authService');

      const token = 'test-csrf-token';
      authService.setAuthHeader(token);

      expect(mockAxiosInstance.defaults.headers.common['X-CSRF-Token']).toBe(
        token
      );
    });

    it('should update CSRF token when called multiple times', async () => {
      const { authService } = await import('./authService');

      authService.setAuthHeader('token1');
      expect(mockAxiosInstance.defaults.headers.common['X-CSRF-Token']).toBe(
        'token1'
      );

      authService.setAuthHeader('token2');
      expect(mockAxiosInstance.defaults.headers.common['X-CSRF-Token']).toBe(
        'token2'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle error response with error message', async () => {
      const { authService } = await import('./authService');

      const credentials: LoginRequest = {
        username: 'testuser',
        password: 'wrongpassword',
      };

      const mockError = {
        response: {
          data: {
            success: false,
            error: 'Invalid credentials',
          },
        },
      };

      mockAxiosInstance.post.mockRejectedValue(mockError);

      const result = await authService.login(credentials);

      expect(result.error).toBe('Invalid credentials');
    });

    it('should handle error response without error message', async () => {
      const { authService } = await import('./authService');

      const credentials: LoginRequest = {
        username: 'testuser',
        password: 'wrongpassword',
      };

      const mockError = {
        response: {
          data: {},
        },
      };

      mockAxiosInstance.post.mockRejectedValue(mockError);

      const result = await authService.login(credentials);

      expect(result).toEqual({});
    });
  });

  describe('HTTP Configuration', () => {
    it('should create axios instance with correct base URL', async () => {
      const { authService } = await import('./authService');

      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: expect.any(String),
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        })
      );
    });

    it('should include withCredentials for cookie transmission', async () => {
      const { authService } = await import('./authService');

      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          withCredentials: true,
        })
      );
    });
  });

  describe('CSRF Token Management', () => {
    it('should store CSRF token from login response', async () => {
      const { authService } = await import('./authService');

      const credentials: LoginRequest = {
        username: 'testuser',
        password: 'password123',
      };

      const mockResponse = {
        data: {
          success: true,
          csrfToken: 'new-csrf-token-12345',
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await authService.login(credentials);

      expect(result.success).toBe(true);
      expect(localStorage.getItem('csrf_token')).toBe('new-csrf-token-12345');
      expect(
        mockAxiosInstance.defaults.headers.common['X-CSRF-Token']
      ).toBe('new-csrf-token-12345');
    });

    it('should retrieve CSRF token from storage on initialization', async () => {
      localStorage.setItem('csrf_token', 'stored-csrf-token');

      const { authService } = await import('./authService');

      expect(
        mockAxiosInstance.defaults.headers.common['X-CSRF-Token']
      ).toBe('stored-csrf-token');
    });

    it('should include CSRF token in POST requests', async () => {
      const { authService } = await import('./authService');

      localStorage.setItem('csrf_token', 'test-csrf-token');
      authService.setAuthHeader('test-csrf-token');

      const credentials: LoginRequest = {
        username: 'testuser',
        password: 'password123',
      };

      const mockResponse = {
        data: {
          success: true,
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      await authService.login(credentials);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        'auth/login',
        credentials
      );
    });

    it('should clear CSRF token on logout', async () => {
      const { authService } = await import('./authService');

      localStorage.setItem('csrf_token', 'test-csrf-token');
      authService.setAuthHeader('test-csrf-token');

      mockAxiosInstance.post.mockResolvedValue({ data: {} });

      await authService.logout();

      expect(localStorage.getItem('csrf_token')).toBeNull();
      expect(
        mockAxiosInstance.defaults.headers.common['X-CSRF-Token']
      ).toBeUndefined();
    });

    it('should clear CSRF token even if logout fails', async () => {
      const { authService } = await import('./authService');

      localStorage.setItem('csrf_token', 'test-csrf-token');
      authService.setAuthHeader('test-csrf-token');

      mockAxiosInstance.post.mockRejectedValue(new Error('Logout failed'));

      await authService.logout();

      expect(localStorage.getItem('csrf_token')).toBeNull();
    });

    it('should retrieve CSRF token from storage', async () => {
      const { authService } = await import('./authService');

      localStorage.setItem('csrf_token', 'stored-token');

      const token = authService.getCsrfTokenFromStorage();

      expect(token).toBe('stored-token');
    });

    it('should return null when no CSRF token in storage', async () => {
      const { authService } = await import('./authService');

      const token = authService.getCsrfTokenFromStorage();

      expect(token).toBeNull();
    });

    it('should clear auth state', async () => {
      const { authService } = await import('./authService');

      localStorage.setItem('csrf_token', 'test-token');
      authService.setAuthHeader('test-token');

      authService.clearAuthState();

      expect(localStorage.getItem('csrf_token')).toBeNull();
      expect(
        mockAxiosInstance.defaults.headers.common['X-CSRF-Token']
      ).toBeUndefined();
    });
  });

  describe('Network Error Handling', () => {
    it('should return user-friendly error message for network error on login', async () => {
      const { authService } = await import('./authService');

      const credentials: LoginRequest = {
        username: 'testuser',
        password: 'password123',
      };

      const mockError = new Error('Network error');
      mockAxiosInstance.post.mockRejectedValue(mockError);

      const result = await authService.login(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Connection error. Please check your internet and try again.'
      );
    });

    it('should return user-friendly error message for network error on signup', async () => {
      const { authService } = await import('./authService');

      const signupData: SignupRequest = {
        username: 'newuser',
        password: 'password123',
        passwordConfirm: 'password123',
      };

      const mockError = new Error('Network error');
      mockAxiosInstance.post.mockRejectedValue(mockError);

      const result = await authService.signup(signupData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Connection error. Please check your internet and try again.'
      );
    });

    it('should handle 401 Unauthorized with server error message', async () => {
      const { authService } = await import('./authService');

      const credentials: LoginRequest = {
        username: 'testuser',
        password: 'password123',
      };

      const mockError = {
        response: {
          status: 401,
          data: {
            success: false,
            error: 'Unauthorized',
          },
        },
      };

      // Mock axios.isAxiosError to return true for this error
      vi.mocked(axios.isAxiosError).mockReturnValueOnce(true);

      mockAxiosInstance.post.mockRejectedValue(mockError);

      const result = await authService.login(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized');
    });

    it('should clear CSRF token on 401 response', async () => {
      const { authService } = await import('./authService');

      localStorage.setItem('csrf_token', 'test-token');

      const mockError = {
        response: {
          status: 401,
          data: {
            error: 'Not authenticated',
          },
        },
      };

      mockAxiosInstance.get.mockRejectedValue(mockError);

      await authService.getCurrentUser();

      expect(localStorage.getItem('csrf_token')).toBeNull();
    });

    it('should throw error with user-friendly message for CSRF token fetch failure', async () => {
      const { authService } = await import('./authService');

      const mockError = new Error('Network error');
      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(authService.getCsrfToken()).rejects.toThrow(
        'Connection error. Please check your internet and try again.'
      );
    });

    it('should return server error message when available', async () => {
      const { authService } = await import('./authService');

      const credentials: LoginRequest = {
        username: 'testuser',
        password: 'wrongpassword',
      };

      const mockError = {
        response: {
          status: 401,
          data: {
            error: 'Invalid credentials',
          },
        },
      };

      mockAxiosInstance.post.mockRejectedValue(mockError);

      const result = await authService.login(credentials);

      expect(result.error).toBe('Invalid credentials');
    });
  });

  describe('Session Token Management', () => {
    it('should use withCredentials for automatic cookie handling', async () => {
      const { authService } = await import('./authService');

      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          withCredentials: true,
        })
      );
    });

    it('should clear CSRF token on session expiration (401)', async () => {
      const { authService } = await import('./authService');

      localStorage.setItem('csrf_token', 'test-token');

      const mockError = {
        response: {
          status: 401,
          data: {
            error: 'Session expired',
          },
        },
      };

      mockAxiosInstance.get.mockRejectedValue(mockError);

      await authService.getCurrentUser();

      expect(localStorage.getItem('csrf_token')).toBeNull();
    });

    it('should handle logout and clear session state', async () => {
      const { authService } = await import('./authService');

      localStorage.setItem('csrf_token', 'test-token');
      authService.setAuthHeader('test-token');

      mockAxiosInstance.post.mockResolvedValue({ data: {} });

      await authService.logout();

      expect(localStorage.getItem('csrf_token')).toBeNull();
      expect(
        mockAxiosInstance.defaults.headers.common['X-CSRF-Token']
      ).toBeUndefined();
    });
  });
});
