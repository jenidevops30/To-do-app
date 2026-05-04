import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import type { AxiosError } from 'axios';
import type { Todo, CreateTodoDto, UpdateTodoDto } from '../types/todo';

// Mock axios
vi.mock('axios');

describe('TodoApiClient', () => {
  let mockAxiosInstance: any;
  let mockInterceptors: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock interceptors
    mockInterceptors = {
      request: {
        use: vi.fn((success, error) => {
          mockInterceptors.request.successHandler = success;
          mockInterceptors.request.errorHandler = error;
        }),
      },
      response: {
        use: vi.fn((success, error) => {
          mockInterceptors.response.successHandler = success;
          mockInterceptors.response.errorHandler = error;
        }),
      },
    };

    // Create a mock axios instance
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      defaults: {
        headers: {
          common: {},
        },
      },
      interceptors: mockInterceptors,
    };

    // Mock axios.create to return our mock instance
    vi.mocked(axios.create).mockReturnValue(mockAxiosInstance);

    // Reset modules to clear any cached instances
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create axios instance with correct configuration', async () => {
      const { apiClient } = await import('./api');

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

    it('should set up request interceptor', async () => {
      const { apiClient } = await import('./api');

      expect(mockInterceptors.request.use).toHaveBeenCalled();
    });

    it('should set up response interceptor', async () => {
      const { apiClient } = await import('./api');

      expect(mockInterceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('CSRF Token Handling', () => {
    it('should set CSRF token', async () => {
      const { apiClient } = await import('./api');

      const token = 'test-csrf-token-123';
      apiClient.setCsrfToken(token);

      expect(mockAxiosInstance.defaults.headers.common['X-CSRF-Token']).toBe(
        token
      );
    });

    it('should add CSRF token to POST requests', async () => {
      const { apiClient } = await import('./api');

      const token = 'test-csrf-token-123';
      apiClient.setCsrfToken(token);

      const config = {
        method: 'post',
        headers: {},
      };

      const result = mockInterceptors.request.successHandler(config);

      expect(result.headers['X-CSRF-Token']).toBe(token);
    });

    it('should add CSRF token to PUT requests', async () => {
      const { apiClient } = await import('./api');

      const token = 'test-csrf-token-123';
      apiClient.setCsrfToken(token);

      const config = {
        method: 'put',
        headers: {},
      };

      const result = mockInterceptors.request.successHandler(config);

      expect(result.headers['X-CSRF-Token']).toBe(token);
    });

    it('should add CSRF token to DELETE requests', async () => {
      const { apiClient } = await import('./api');

      const token = 'test-csrf-token-123';
      apiClient.setCsrfToken(token);

      const config = {
        method: 'delete',
        headers: {},
      };

      const result = mockInterceptors.request.successHandler(config);

      expect(result.headers['X-CSRF-Token']).toBe(token);
    });

    it('should not add CSRF token to GET requests', async () => {
      const { apiClient } = await import('./api');

      const token = 'test-csrf-token-123';
      apiClient.setCsrfToken(token);

      const config = {
        method: 'get',
        headers: {},
      };

      const result = mockInterceptors.request.successHandler(config);

      expect(result.headers['X-CSRF-Token']).toBeUndefined();
    });

    it('should not add CSRF token if not set', async () => {
      const { apiClient } = await import('./api');

      const config = {
        method: 'post',
        headers: {},
      };

      const result = mockInterceptors.request.successHandler(config);

      expect(result.headers['X-CSRF-Token']).toBeUndefined();
    });
  });

  describe('Request Interceptor', () => {
    it('should pass through successful requests', async () => {
      const { apiClient } = await import('./api');

      const config = {
        method: 'get',
        headers: {},
      };

      const result = mockInterceptors.request.successHandler(config);

      expect(result).toEqual(config);
    });

    it('should handle request errors', async () => {
      const { apiClient } = await import('./api');

      const error = new Error('Request error');

      const promise = mockInterceptors.request.errorHandler(error);

      await expect(promise).rejects.toThrow('Request error');
    });
  });

  describe('Response Interceptor - 401 Unauthorized', () => {
    it('should handle 401 response', async () => {
      const { apiClient } = await import('./api');

      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

      const error: AxiosError = {
        response: {
          status: 401,
          data: { error: 'Session expired' },
        },
      } as any;

      const promise = mockInterceptors.response.errorHandler(error);

      await expect(promise).rejects.toEqual(error);
      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'auth:expired',
        })
      );

      dispatchEventSpy.mockRestore();
    });

    it('should use default message for 401 if no error message provided', async () => {
      const { apiClient } = await import('./api');

      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

      const error: AxiosError = {
        response: {
          status: 401,
          data: {},
        },
      } as any;

      mockInterceptors.response.errorHandler(error);

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'auth:expired',
          detail: expect.objectContaining({
            message: 'Your session has expired. Please log in again.',
          }),
        })
      );

      dispatchEventSpy.mockRestore();
    });

    it('should redirect to login on 401', async () => {
      const { apiClient } = await import('./api');

      // Mock window.location
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = { href: '', pathname: '/' } as any;

      const error: AxiosError = {
        response: {
          status: 401,
          data: { error: 'Unauthorized' },
        },
      } as any;

      mockInterceptors.response.errorHandler(error);

      expect(window.location.href).toBe('/login');

      // Restore window.location
      (window as any).location = originalLocation;
    });

    it('should not redirect to login if already on login page', async () => {
      const { apiClient } = await import('./api');

      // Mock window.location
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = { href: '', pathname: '/login' } as any;

      const error: AxiosError = {
        response: {
          status: 401,
          data: { error: 'Unauthorized' },
        },
      } as any;

      mockInterceptors.response.errorHandler(error);

      expect(window.location.href).toBe('');

      // Restore window.location
      (window as any).location = originalLocation;
    });
  });

  describe('Response Interceptor - 403 Forbidden', () => {
    it('should handle 403 response', async () => {
      const { apiClient } = await import('./api');

      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

      const error: AxiosError = {
        response: {
          status: 403,
          data: { error: 'Forbidden' },
        },
      } as any;

      const promise = mockInterceptors.response.errorHandler(error);

      await expect(promise).rejects.toEqual(error);
      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'auth:forbidden',
        })
      );

      dispatchEventSpy.mockRestore();
    });

    it('should use default message for 403 if no error message provided', async () => {
      const { apiClient } = await import('./api');

      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

      const error: AxiosError = {
        response: {
          status: 403,
          data: {},
        },
      } as any;

      mockInterceptors.response.errorHandler(error);

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'auth:forbidden',
          detail: expect.objectContaining({
            message: "You don't have permission to access this resource",
          }),
        })
      );

      dispatchEventSpy.mockRestore();
    });

    it('should not redirect on 403', async () => {
      const { apiClient } = await import('./api');

      // Mock window.location
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = { href: '', pathname: '/' } as any;

      const error: AxiosError = {
        response: {
          status: 403,
          data: { error: 'Forbidden' },
        },
      } as any;

      mockInterceptors.response.errorHandler(error);

      // Should not redirect
      expect(window.location.href).toBe('');

      // Restore window.location
      (window as any).location = originalLocation;
    });
  });

  describe('Response Interceptor - Other Errors', () => {
    it('should pass through other error responses', async () => {
      const { apiClient } = await import('./api');

      const error: AxiosError = {
        response: {
          status: 500,
          data: { error: 'Server error' },
        },
      } as any;

      const promise = mockInterceptors.response.errorHandler(error);

      await expect(promise).rejects.toEqual(error);
    });

    it('should pass through successful responses', async () => {
      const { apiClient } = await import('./api');

      const response = { status: 200, data: { success: true } };

      const result = mockInterceptors.response.successHandler(response);

      expect(result).toEqual(response);
    });
  });

  describe('Todo API Methods', () => {
    it('should get all todos', async () => {
      const { apiClient } = await import('./api');

      const mockTodos: Todo[] = [
        { id: 1, title: 'Test 1', completed: false, user_id: '1' },
        { id: 2, title: 'Test 2', completed: true, user_id: '1' },
      ];

      mockAxiosInstance.get.mockResolvedValue({ data: mockTodos });

      const result = await apiClient.getAllTodos();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('todos');
      expect(result).toEqual(mockTodos);
    });

    it('should create a todo', async () => {
      const { apiClient } = await import('./api');

      const newTodo: CreateTodoDto = { title: 'New Todo' };
      const createdTodo: Todo = {
        id: 1,
        title: 'New Todo',
        completed: false,
        user_id: '1',
      };

      mockAxiosInstance.post.mockResolvedValue({ data: createdTodo });

      const result = await apiClient.createTodo(newTodo);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('todos', newTodo);
      expect(result).toEqual(createdTodo);
    });

    it('should update a todo', async () => {
      const { apiClient } = await import('./api');

      const updateData: UpdateTodoDto = { title: 'Updated', completed: true };
      const updatedTodo: Todo = {
        id: 1,
        title: 'Updated',
        completed: true,
        user_id: '1',
      };

      mockAxiosInstance.put.mockResolvedValue({ data: updatedTodo });

      const result = await apiClient.updateTodo(1, updateData);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('todos/1', updateData);
      expect(result).toEqual(updatedTodo);
    });

    it('should delete a todo', async () => {
      const { apiClient } = await import('./api');

      mockAxiosInstance.delete.mockResolvedValue({});

      await apiClient.deleteTodo(1);

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('todos/1');
    });
  });
});
