export interface User {
  id: string;
  username: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  csrfToken?: string;
  error?: string;
}

export interface SignupRequest {
  username: string;
  password: string;
  passwordConfirm: string;
}

export interface SignupResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface AuthResponse {
  user?: User;
  error?: string;
}

export interface CsrfTokenResponse {
  csrfToken: string;
}

export interface ApiError {
  error: string;
  errors?: Record<string, string[]>;
}
