import axios, { type AxiosInstance, type AxiosError } from 'axios';
import type { Todo, CreateTodoDto, UpdateTodoDto } from '../types/todo';

class TodoApiClient {
  private client: AxiosInstance;
  private csrfToken: string | null = null;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    // Add request interceptor to include CSRF token for state-changing requests
    this.client.interceptors.request.use(
      (config) => {
        // Add CSRF token to POST, PUT, DELETE requests
        if (
          this.csrfToken &&
          ['post', 'put', 'delete'].includes(config.method?.toLowerCase() || '')
        ) {
          config.headers['X-CSRF-Token'] = this.csrfToken;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor to handle authentication and authorization errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Session expired or not authenticated
          // Redirect to login page
          const message =
            (error.response?.data as any)?.error ||
            'Your session has expired. Please log in again.';
          this.handleAuthenticationError(message);
        } else if (error.response?.status === 403) {
          // Forbidden - user doesn't have permission
          const message =
            (error.response?.data as any)?.error ||
            "You don't have permission to access this resource";
          this.handleAuthorizationError(message);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Set the CSRF token for subsequent requests
   * @param token The CSRF token to use
   */
  setCsrfToken(token: string): void {
    this.csrfToken = token;
    this.client.defaults.headers.common['X-CSRF-Token'] = token;
  }

  /**
   * Handle authentication errors (401)
   * @param message Error message to display
   */
  private handleAuthenticationError(message: string): void {
    // Dispatch event that can be listened to by the app
    window.dispatchEvent(
      new CustomEvent('auth:expired', {
        detail: { message },
      })
    );

    // Redirect to login page
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  /**
   * Handle authorization errors (403)
   * @param message Error message to display
   */
  private handleAuthorizationError(message: string): void {
    // Dispatch event that can be listened to by the app
    window.dispatchEvent(
      new CustomEvent('auth:forbidden', {
        detail: { message },
      })
    );
  }

  async getAllTodos(): Promise<Todo[]> {
    const response = await this.client.get<Todo[]>('todos');
    return response.data;
  }

  async createTodo(todo: CreateTodoDto): Promise<Todo> {
    const response = await this.client.post<Todo>('todos', todo);
    return response.data;
  }

  async updateTodo(id: number, todo: UpdateTodoDto): Promise<Todo> {
    const response = await this.client.put<Todo>(`todos/${id}`, todo);
    return response.data;
  }

  async deleteTodo(id: number): Promise<void> {
    await this.client.delete(`todos/${id}`);
  }
}

const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // If we're accessing via an IP address, use that IP for the backend too
  const hostname = window.location.hostname;
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `http://${hostname}:5000/api`;
  }
  
  return 'http://localhost:5000/api';
};

export const apiClient = new TodoApiClient(getBaseURL());
