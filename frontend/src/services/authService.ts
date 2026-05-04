import axios, { type AxiosInstance } from 'axios';
import type {
  User,
  LoginRequest,
  LoginResponse,
  SignupRequest,
  SignupResponse,
  AuthResponse,
  CsrfTokenResponse,
} from '../types/auth';

const CSRF_TOKEN_STORAGE_KEY = 'csrf_token';
const NETWORK_ERROR_MESSAGE =
  'Connection error. Please check your internet and try again.';
const SESSION_EXPIRED_MESSAGE =
  'Your session has expired. Please log in again.';

class AuthService {
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

    // Initialize CSRF token from localStorage
    this.initializeCsrfToken();

    // Setup request interceptor to include CSRF token
    this.setupRequestInterceptor();

    // Setup response interceptor to handle session expiration
    this.setupResponseInterceptor();
  }

  private initializeCsrfToken(): void {
    const storedToken = localStorage.getItem(CSRF_TOKEN_STORAGE_KEY);
    if (storedToken) {
      this.csrfToken = storedToken;
      this.setAuthHeader(storedToken);
    }
  }

  private setupRequestInterceptor(): void {
    this.client.interceptors.request.use(
      (config) => {
        // Include CSRF token in headers for state-changing requests
        if (
          this.csrfToken &&
          config.method &&
          ['post', 'put', 'delete'].includes(config.method)
        ) {
          config.headers['X-CSRF-Token'] = this.csrfToken;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }

  private setupResponseInterceptor(): void {
    this.client.interceptors.response.use(
      (response) => {
        // Update CSRF token if provided in response
        if (response.data?.csrfToken) {
          this.storeCsrfToken(response.data.csrfToken);
        }
        return response;
      },
      (error) => {
        // Handle session expiration (401 Unauthorized)
        if (
          axios.isAxiosError(error) &&
          error.response?.status === 401
        ) {
          // Clear stored CSRF token on session expiration
          this.clearCsrfToken();
        }
        return Promise.reject(error);
      }
    );
  }

  private storeCsrfToken(token: string): void {
    this.csrfToken = token;
    localStorage.setItem(CSRF_TOKEN_STORAGE_KEY, token);
    this.setAuthHeader(token);
  }

  private clearCsrfToken(): void {
    this.csrfToken = null;
    localStorage.removeItem(CSRF_TOKEN_STORAGE_KEY);
    delete this.client.defaults.headers.common['X-CSRF-Token'];
  }

  private handleNetworkError(error: unknown): string {
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        // Network error (no response from server)
        return NETWORK_ERROR_MESSAGE;
      }
      if (error.response.status === 401) {
        return SESSION_EXPIRED_MESSAGE;
      }
      // Return server error message if available
      if (error.response.data?.error) {
        return error.response.data.error;
      }
    }
    return NETWORK_ERROR_MESSAGE;
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      // Get CSRF token first if not already available
      if (!this.csrfToken) {
        await this.getCsrfToken();
      }

      // Include CSRF token in the request
      const loginData = {
        ...credentials,
        csrfToken: this.csrfToken,
      };

      const response = await this.client.post<LoginResponse>(
        'auth/login',
        loginData
      );
      // Store CSRF token from login response
      if (response.data.csrfToken) {
        this.storeCsrfToken(response.data.csrfToken);
      }
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        return error.response.data as LoginResponse;
      }
      // Return user-friendly error message for network errors
      return {
        success: false,
        error: this.handleNetworkError(error),
      };
    }
  }

  async signup(data: SignupRequest): Promise<SignupResponse> {
    try {
      // Get CSRF token first if not already available
      if (!this.csrfToken) {
        await this.getCsrfToken();
      }

      // Include CSRF token in the request
      const signupData = {
        ...data,
        csrfToken: this.csrfToken,
      };

      const response = await this.client.post<SignupResponse>(
        'auth/signup',
        signupData
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        return error.response.data as SignupResponse;
      }
      // Return user-friendly error message for network errors
      return {
        success: false,
        error: this.handleNetworkError(error),
      };
    }
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('auth/logout', {});
      // Clear CSRF token on logout
      this.clearCsrfToken();
    } catch (error) {
      // Clear CSRF token even if logout fails
      this.clearCsrfToken();
      console.error('Logout error:', error);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await this.client.get<AuthResponse>('auth/me');
      return response.data.user || null;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        // Session expired, clear CSRF token
        this.clearCsrfToken();
      }
      return null;
    }
  }

  async getCsrfToken(): Promise<string> {
    try {
      const response = await this.client.get<CsrfTokenResponse>(
        'auth/csrf-token'
      );
      // Store CSRF token for future requests
      if (response.data.csrfToken) {
        this.storeCsrfToken(response.data.csrfToken);
      }
      return response.data.csrfToken;
    } catch (error) {
      const errorMessage = this.handleNetworkError(error);
      console.error('Failed to get CSRF token:', errorMessage);
      throw new Error(errorMessage);
    }
  }

  setAuthHeader(token: string): void {
    this.client.defaults.headers.common['X-CSRF-Token'] = token;
  }

  getCsrfTokenFromStorage(): string | null {
    return this.csrfToken || localStorage.getItem(CSRF_TOKEN_STORAGE_KEY);
  }

  clearAuthState(): void {
    this.clearCsrfToken();
  }
}


const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  const hostname = window.location.hostname;
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `http://${hostname}:5000/api`;
  }

  return 'http://localhost:5000/api';
};

export const authService = new AuthService(getBaseURL());
