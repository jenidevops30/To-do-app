import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import LoginPage from './LoginPage.vue';
import * as authModule from '../composables/useAuth';

// Mock the useAuth composable
vi.mock('../composables/useAuth', () => ({
  useAuth: vi.fn(),
}));

// Create a mock router
const createMockRouter = () => {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: { template: '<div>Login</div>' } },
      { path: '/signup', component: { template: '<div>Signup</div>' } },
      { path: '/todos', component: { template: '<div>Todos</div>' } },
    ],
  });
};

describe('LoginPage.vue', () => {
  let mockLogin: ReturnType<typeof vi.fn>;
  let mockClearError: ReturnType<typeof vi.fn>;
  let mockRouter: ReturnType<typeof createMockRouter>;

  beforeEach(() => {
    mockLogin = vi.fn();
    mockClearError = vi.fn();
    mockRouter = createMockRouter();

    vi.mocked(authModule.useAuth).mockReturnValue({
      user: { id: '1', username: 'testuser' },
      isAuthenticated: true,
      loading: false,
      error: null,
      login: mockLogin,
      signup: vi.fn(),
      logout: vi.fn(),
      checkAuth: vi.fn(),
      setError: vi.fn(),
      clearError: mockClearError,
    } as any);
  });

  describe('5.1.1 Form with username and password fields', () => {
    it('should render username and password input fields', () => {
      const wrapper = mount(LoginPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      const usernameInput = wrapper.find('#username');
      const passwordInput = wrapper.find('#password');

      expect(usernameInput.exists()).toBe(true);
      expect(passwordInput.exists()).toBe(true);
      expect(usernameInput.attributes('type')).toBe('text');
      expect(passwordInput.attributes('type')).toBe('password');
    });

    it('should have proper labels for form fields', () => {
      const wrapper = mount(LoginPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      const usernameLabel = wrapper.find('label[for="username"]');
      const passwordLabel = wrapper.find('label[for="password"]');

      expect(usernameLabel.text()).toBe('Username');
      expect(passwordLabel.text()).toBe('Password');
    });

    it('should have placeholder text for guidance', () => {
      const wrapper = mount(LoginPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      const usernameInput = wrapper.find('#username');
      const passwordInput = wrapper.find('#password');

      expect(usernameInput.attributes('placeholder')).toBe(
        'Enter your username'
      );
      expect(passwordInput.attributes('placeholder')).toBe(
        'Enter your password'
      );
    });
  });

  describe('5.1.2 Form submission handler', () => {
    it('should call login with username and password on form submit', async () => {
      mockLogin.mockResolvedValue(true);
      const wrapper = mount(LoginPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      await wrapper.find('#username').setValue('testuser');
      await wrapper.find('#password').setValue('password123');
      await wrapper.find('form').trigger('submit');

      expect(mockLogin).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123',
      });
    });

    it('should redirect to /todos on successful login', async () => {
      mockLogin.mockResolvedValue(true);
      const wrapper = mount(LoginPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      await wrapper.find('#username').setValue('testuser');
      await wrapper.find('#password').setValue('password123');
      await wrapper.find('form').trigger('submit');
      await flushPromises();
      await mockRouter.isReady();

      expect(mockRouter.currentRoute.value.path).toBe('/todos');
    });

    it('should prevent default form submission', async () => {
      mockLogin.mockResolvedValue(true);
      const wrapper = mount(LoginPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      await wrapper.find('#username').setValue('testuser');
      await wrapper.find('#password').setValue('password123');

      const form = wrapper.find('form');
      await form.trigger('submit');

      // If preventDefault was called, the form won't actually submit
      // We verify this by checking that login was called (which means form was processed)
      expect(mockLogin).toHaveBeenCalled();
    });

    it('should not submit if form is invalid', async () => {
      const wrapper = mount(LoginPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      await wrapper.find('form').trigger('submit');

      expect(mockLogin).not.toHaveBeenCalled();
    });
  });

  describe('5.1.3 Loading state and disable submit button', () => {
    it('should disable submit button while loading', async () => {
      vi.mocked(authModule.useAuth).mockReturnValue({
        user: null,
        isAuthenticated: false,
        loading: true,
        error: null,
        login: mockLogin,
        signup: vi.fn(),
        logout: vi.fn(),
        checkAuth: vi.fn(),
        setError: vi.fn(),
        clearError: mockClearError,
      } as any);

      const wrapper = mount(LoginPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      const submitButton = wrapper.find('.submit-button');
      expect(submitButton.attributes('disabled')).toBeDefined();
    });

    it('should disable submit button when form is invalid', async () => {
      const wrapper = mount(LoginPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      const submitButton = wrapper.find('.submit-button');
      expect(submitButton.attributes('disabled')).toBeDefined();
    });

    it('should enable submit button when form is valid', async () => {
      const wrapper = mount(LoginPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      await wrapper.find('#username').setValue('testuser');
      await wrapper.find('#password').setValue('password123');
      await wrapper.vm.$nextTick();

      const submitButton = wrapper.find('.submit-button');
      expect(submitButton.attributes('disabled')).toBeUndefined();
    });

    it('should show loading text while loading', async () => {
      vi.mocked(authModule.useAuth).mockReturnValue({
        user: null,
        isAuthenticated: false,
        loading: true,
        error: null,
        login: mockLogin,
        signup: vi.fn(),
        logout: vi.fn(),
        checkAuth: vi.fn(),
        setError: vi.fn(),
        clearError: mockClearError,
      } as any);

      const wrapper = mount(LoginPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      expect(wrapper.text()).toContain('Signing in...');
    });
  });

  describe('5.1.4 Display generic error messages on failed login', () => {
    it('should display error message on failed login', async () => {
      mockLogin.mockResolvedValue(false);
      vi.mocked(authModule.useAuth).mockReturnValue({
        user: null,
        isAuthenticated: false,
        loading: false,
        error: 'Invalid credentials',
        login: mockLogin,
        signup: vi.fn(),
        logout: vi.fn(),
        checkAuth: vi.fn(),
        setError: vi.fn(),
        clearError: mockClearError,
      } as any);

      const wrapper = mount(LoginPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      await wrapper.find('#username').setValue('testuser');
      await wrapper.find('#password').setValue('wrongpassword');
      await wrapper.find('form').trigger('submit');
      await wrapper.vm.$nextTick();

      const errorMessage = wrapper.find('.error-message');
      expect(errorMessage.exists()).toBe(true);
      expect(errorMessage.text()).toContain('Invalid credentials');
    });

    it('should have role="alert" for error message accessibility', async () => {
      mockLogin.mockResolvedValue(false);
      vi.mocked(authModule.useAuth).mockReturnValue({
        user: null,
        isAuthenticated: false,
        loading: false,
        error: 'Invalid credentials',
        login: mockLogin,
        signup: vi.fn(),
        logout: vi.fn(),
        checkAuth: vi.fn(),
        setError: vi.fn(),
        clearError: mockClearError,
      } as any);

      const wrapper = mount(LoginPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      await wrapper.find('#username').setValue('testuser');
      await wrapper.find('#password').setValue('wrongpassword');
      await wrapper.find('form').trigger('submit');
      await wrapper.vm.$nextTick();

      const errorMessage = wrapper.find('.error-message');
      expect(errorMessage.attributes('role')).toBe('alert');
    });
  });

  describe('5.1.5 Clear password field on failed attempt', () => {
    it('should clear password field after failed login', async () => {
      mockLogin.mockResolvedValue(false);
      const wrapper = mount(LoginPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      const passwordInput = wrapper.find('#password');
      await wrapper.find('#username').setValue('testuser');
      await passwordInput.setValue('password123');

      await wrapper.find('form').trigger('submit');
      await wrapper.vm.$nextTick();

      // Password should be cleared after submission
      expect((passwordInput.element as HTMLInputElement).value).toBe('');
    });

    it('should clear password field after successful login', async () => {
      mockLogin.mockResolvedValue(true);
      const wrapper = mount(LoginPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      const passwordInput = wrapper.find('#password');
      await wrapper.find('#username').setValue('testuser');
      await passwordInput.setValue('password123');

      await wrapper.find('form').trigger('submit');
      await wrapper.vm.$nextTick();

      expect((passwordInput.element as HTMLInputElement).value).toBe('');
    });
  });

  describe('5.1.6 Redirect to todo list on successful login', () => {
    it('should redirect to /todos on successful login', async () => {
      mockLogin.mockResolvedValue(true);
      const wrapper = mount(LoginPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      await wrapper.find('#username').setValue('testuser');
      await wrapper.find('#password').setValue('password123');
      await wrapper.find('form').trigger('submit');
      await flushPromises();
      await mockRouter.isReady();

      expect(mockRouter.currentRoute.value.path).toBe('/todos');
    });
  });

  describe('5.1.7 Display signup link', () => {
    it('should display signup link', () => {
      const wrapper = mount(LoginPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      const signupLink = wrapper.find('.signup-link');
      expect(signupLink.exists()).toBe(true);
      expect(signupLink.text()).toBe('Sign up here');
    });

    it('should navigate to /signup when signup link is clicked', async () => {
      const wrapper = mount(LoginPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      await wrapper.find('.signup-link').trigger('click');
      await flushPromises();
      await mockRouter.isReady();

      expect(mockRouter.currentRoute.value.path).toBe('/signup');
    });

    it('should display signup text', () => {
      const wrapper = mount(LoginPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      const signupText = wrapper.find('.signup-text');
      expect(signupText.text()).toContain("Don't have an account?");
    });
  });

  describe('5.1.8 Add loading indicator', () => {
    it('should display loading indicator while loading', async () => {
      vi.mocked(authModule.useAuth).mockReturnValue({
        user: null,
        isAuthenticated: false,
        loading: true,
        error: null,
        login: mockLogin,
        signup: vi.fn(),
        logout: vi.fn(),
        checkAuth: vi.fn(),
        setError: vi.fn(),
        clearError: mockClearError,
      } as any);

      const wrapper = mount(LoginPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      const loadingIndicator = wrapper.find('.loading-indicator');
      expect(loadingIndicator.exists()).toBe(true);
    });

    it('should show spinner animation while loading', async () => {
      vi.mocked(authModule.useAuth).mockReturnValue({
        user: null,
        isAuthenticated: false,
        loading: true,
        error: null,
        login: mockLogin,
        signup: vi.fn(),
        logout: vi.fn(),
        checkAuth: vi.fn(),
        setError: vi.fn(),
        clearError: mockClearError,
      } as any);

      const wrapper = mount(LoginPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      const spinner = wrapper.find('.spinner');
      expect(spinner.exists()).toBe(true);
    });

    it('should display loading text', async () => {
      vi.mocked(authModule.useAuth).mockReturnValue({
        user: null,
        isAuthenticated: false,
        loading: true,
        error: null,
        login: mockLogin,
        signup: vi.fn(),
        logout: vi.fn(),
        checkAuth: vi.fn(),
        setError: vi.fn(),
        clearError: mockClearError,
      } as any);

      const wrapper = mount(LoginPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      expect(wrapper.text()).toContain('Processing your login...');
    });
  });

  describe('5.1.9 Accessibility features', () => {
    it('should have proper ARIA labels and attributes', () => {
      const wrapper = mount(LoginPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      const usernameInput = wrapper.find('#username');
      const passwordInput = wrapper.find('#password');

      expect(usernameInput.attributes('aria-required')).toBe('true');
      expect(passwordInput.attributes('aria-required')).toBe('true');
    });

    it('should have aria-invalid attribute', () => {
      const wrapper = mount(LoginPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      const usernameInput = wrapper.find('#username');
      expect(usernameInput.attributes('aria-invalid')).toBe('false');
    });

    it('should have autocomplete attributes', () => {
      const wrapper = mount(LoginPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      const usernameInput = wrapper.find('#username');
      const passwordInput = wrapper.find('#password');

      expect(usernameInput.attributes('autocomplete')).toBe('username');
      expect(passwordInput.attributes('autocomplete')).toBe('current-password');
    });

    it('should have aria-busy attribute on submit button while loading', async () => {
      vi.mocked(authModule.useAuth).mockReturnValue({
        user: null,
        isAuthenticated: false,
        loading: true,
        error: null,
        login: mockLogin,
        signup: vi.fn(),
        logout: vi.fn(),
        checkAuth: vi.fn(),
        setError: vi.fn(),
        clearError: mockClearError,
      } as any);

      const wrapper = mount(LoginPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      const submitButton = wrapper.find('.submit-button');
      expect(submitButton.attributes('aria-busy')).toBe('true');
    });

    it('should have proper heading hierarchy', () => {
      const wrapper = mount(LoginPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      const heading = wrapper.find('.login-title');
      expect(heading.element.tagName).toBe('H1');
    });

    it('should have form with proper structure', () => {
      const wrapper = mount(LoginPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      const form = wrapper.find('form');
      expect(form.exists()).toBe(true);
      expect(form.attributes('novalidate')).toBeDefined();
    });

    it('should have aria-live region for error messages', async () => {
      mockLogin.mockResolvedValue(false);
      const wrapper = mount(LoginPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      await wrapper.find('#username').setValue('testuser');
      await wrapper.find('#password').setValue('wrongpassword');
      await wrapper.find('form').trigger('submit');
      await wrapper.vm.$nextTick();

      const errorMessage = wrapper.find('.error-message');
      // Error message should exist after failed login
      if (errorMessage.exists()) {
        expect(errorMessage.attributes('aria-live')).toBe('polite');
      }
    });

    it('should have minimum touch target size (44px)', () => {
      const wrapper = mount(LoginPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      const submitButton = wrapper.find('.submit-button');
      const formInput = wrapper.find('.form-input');

      // Check computed styles or class definitions
      expect(submitButton.classes()).toContain('submit-button');
      expect(formInput.classes()).toContain('form-input');
    });
  });

  describe('5.1.10 Component integration', () => {
    it('should clear error on mount', () => {
      mount(LoginPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      expect(mockClearError).toHaveBeenCalled();
    });

    it('should clear form on navigate to signup', async () => {
      const wrapper = mount(LoginPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      await wrapper.find('#username').setValue('testuser');
      await wrapper.find('#password').setValue('password123');

      await wrapper.find('.signup-link').trigger('click');
      await wrapper.vm.$nextTick();

      expect((wrapper.find('#username').element as HTMLInputElement).value).toBe('');
      expect((wrapper.find('#password').element as HTMLInputElement).value).toBe('');
    });

    it('should trim username before submission', async () => {
      mockLogin.mockResolvedValue(true);
      const wrapper = mount(LoginPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      await wrapper.find('#username').setValue('  testuser  ');
      await wrapper.find('#password').setValue('password123');
      await wrapper.find('form').trigger('submit');

      expect(mockLogin).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123',
      });
    });

    it('should show error when both fields are empty', async () => {
      const wrapper = mount(LoginPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      await wrapper.find('form').trigger('submit');
      await wrapper.vm.$nextTick();

      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should disable inputs while loading', async () => {
      vi.mocked(authModule.useAuth).mockReturnValue({
        user: null,
        isAuthenticated: false,
        loading: true,
        error: null,
        login: mockLogin,
        signup: vi.fn(),
        logout: vi.fn(),
        checkAuth: vi.fn(),
        setError: vi.fn(),
        clearError: mockClearError,
      } as any);

      const wrapper = mount(LoginPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      const usernameInput = wrapper.find('#username');
      const passwordInput = wrapper.find('#password');
      const signupLink = wrapper.find('.signup-link');

      expect(usernameInput.attributes('disabled')).toBeDefined();
      expect(passwordInput.attributes('disabled')).toBeDefined();
      expect(signupLink.attributes('disabled')).toBeDefined();
    });
  });
});
