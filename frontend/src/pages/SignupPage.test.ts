import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { computed } from 'vue';
import SignupPage from './SignupPage.vue';
import * as useAuthModule from '../composables/useAuth';

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

describe('SignupPage.vue', () => {
  let mockSignup: ReturnType<typeof vi.fn>;
  let mockClearError: ReturnType<typeof vi.fn>;
  let mockRouter: ReturnType<typeof createMockRouter>;

  beforeEach(() => {
    mockSignup = vi.fn();
    mockClearError = vi.fn();
    mockRouter = createMockRouter();

    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      signup: mockSignup,
      login: vi.fn(),
      logout: vi.fn(),
      checkAuth: vi.fn(),
      clearError: mockClearError,
      isAuthenticated: computed(() => false),
      user: computed(() => null),
      loading: computed(() => false),
      error: computed(() => null),
      setError: vi.fn(),
    } as any);
  });

  describe('Component Rendering', () => {
    it('renders signup form with all required fields', () => {
      const wrapper = mount(SignupPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      expect(wrapper.find('.signup-title').text()).toBe('Create Account');
      expect(wrapper.find('input#username').exists()).toBe(true);
      expect(wrapper.find('input#password').exists()).toBe(true);
      expect(wrapper.find('input#password-confirm').exists()).toBe(true);
      expect(wrapper.find('button[type="submit"]').exists()).toBe(true);
    });

    it('renders signup and login links', () => {
      const wrapper = mount(SignupPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      expect(wrapper.find('.signup-subtitle').text()).toContain(
        'Join us to manage your todos'
      );
      expect(wrapper.find('.login-link').exists()).toBe(true);
    });

    it('displays field hints for username and password', () => {
      const wrapper = mount(SignupPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      const hints = wrapper.findAll('.field-hint');
      expect(hints.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Username Validation', () => {
    it('shows error for username shorter than 3 characters', async () => {
      const wrapper = mount(SignupPage, {
        global: {
          plugins: [mockRouter],
        },
      });
      const usernameInput = wrapper.find('input#username');

      await usernameInput.setValue('ab');
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const error = wrapper.find('#username-error');
      expect(error.exists()).toBe(true);
      expect(error.text()).toContain('at least 3 characters');
    });

    it('shows error for username longer than 50 characters', async () => {
      const wrapper = mount(SignupPage, {
        global: {
          plugins: [mockRouter],
        },
      });
      const usernameInput = wrapper.find('input#username');

      const longUsername = 'a'.repeat(51);
      await usernameInput.setValue(longUsername);
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const error = wrapper.find('#username-error');
      expect(error.exists()).toBe(true);
      expect(error.text()).toContain('at most 50 characters');
    });

    it('shows error for username with invalid characters', async () => {
      const wrapper = mount(SignupPage, {
        global: {
          plugins: [mockRouter],
        },
      });
      const usernameInput = wrapper.find('input#username');

      await usernameInput.setValue('user@name');
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const error = wrapper.find('#username-error');
      expect(error.exists()).toBe(true);
      expect(error.text()).toContain('letters, numbers, and underscores');
    });

    it('accepts valid username', async () => {
      const wrapper = mount(SignupPage, {
        global: {
          plugins: [mockRouter],
        },
      });
      const usernameInput = wrapper.find('input#username');

      await usernameInput.setValue('valid_user123');
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const error = wrapper.find('#username-error');
      expect(error.exists()).toBe(false);
    });

    it('does not show error for empty username', async () => {
      const wrapper = mount(SignupPage, {
        global: {
          plugins: [mockRouter],
        },
      });
      const usernameInput = wrapper.find('input#username');

      await usernameInput.setValue('');
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const error = wrapper.find('#username-error');
      expect(error.exists()).toBe(false);
    });
  });

  describe('Password Validation', () => {
    it('shows error for password shorter than 8 characters', async () => {
      const wrapper = mount(SignupPage, {
        global: {
          plugins: [mockRouter],
        },
      });
      const passwordInput = wrapper.find('input#password');

      await passwordInput.setValue('Pass1');
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const error = wrapper.find('#password-error');
      expect(error.exists()).toBe(true);
      expect(error.text()).toContain('at least 8 characters');
    });

    it('shows error for password with only letters', async () => {
      const wrapper = mount(SignupPage, {
        global: {
          plugins: [mockRouter],
        },
      });
      const passwordInput = wrapper.find('input#password');

      await passwordInput.setValue('Password');
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const error = wrapper.find('#password-error');
      expect(error.exists()).toBe(true);
      expect(error.text()).toContain('letters and numbers');
    });

    it('shows error for password with only numbers', async () => {
      const wrapper = mount(SignupPage, {
        global: {
          plugins: [mockRouter],
        },
      });
      const passwordInput = wrapper.find('input#password');

      await passwordInput.setValue('12345678');
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const error = wrapper.find('#password-error');
      expect(error.exists()).toBe(true);
      expect(error.text()).toContain('letters and numbers');
    });

    it('accepts valid password', async () => {
      const wrapper = mount(SignupPage, {
        global: {
          plugins: [mockRouter],
        },
      });
      const passwordInput = wrapper.find('input#password');

      await passwordInput.setValue('ValidPass123');
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const error = wrapper.find('#password-error');
      expect(error.exists()).toBe(false);
    });

    it('does not show error for empty password', async () => {
      const wrapper = mount(SignupPage, {
        global: {
          plugins: [mockRouter],
        },
      });
      const passwordInput = wrapper.find('input#password');

      await passwordInput.setValue('');
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const error = wrapper.find('#password-error');
      expect(error.exists()).toBe(false);
    });
  });

  describe('Password Confirmation Validation', () => {
    it('shows error when passwords do not match', async () => {
      const wrapper = mount(SignupPage, {
        global: {
          plugins: [mockRouter],
        },
      });
      const passwordInput = wrapper.find('input#password');
      const confirmInput = wrapper.find('input#password-confirm');

      await passwordInput.setValue('ValidPass123');
      await confirmInput.setValue('DifferentPass123');
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const error = wrapper.find('#password-confirm-error');
      expect(error.exists()).toBe(true);
      expect(error.text()).toContain('do not match');
    });

    it('does not show error when passwords match', async () => {
      const wrapper = mount(SignupPage, {
        global: {
          plugins: [mockRouter],
        },
      });
      const passwordInput = wrapper.find('input#password');
      const confirmInput = wrapper.find('input#password-confirm');

      await passwordInput.setValue('ValidPass123');
      await confirmInput.setValue('ValidPass123');
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const error = wrapper.find('#password-confirm-error');
      expect(error.exists()).toBe(false);
    });

    it('does not show error for empty confirmation', async () => {
      const wrapper = mount(SignupPage, {
        global: {
          plugins: [mockRouter],
        },
      });
      const confirmInput = wrapper.find('input#password-confirm');

      await confirmInput.setValue('');
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const error = wrapper.find('#password-confirm-error');
      expect(error.exists()).toBe(false);
    });
  });

  describe('Form Submission', () => {
    it('disables submit button when form is invalid', async () => {
      const wrapper = mount(SignupPage, {
        global: {
          plugins: [mockRouter],
        },
      });
      const submitButton = wrapper.find('button[type="submit"]');

      expect(submitButton.attributes('disabled')).toBeDefined();
    });

    it('enables submit button when form is valid', async () => {
      const wrapper = mount(SignupPage, {
        global: {
          plugins: [mockRouter],
        },
      });
      const usernameInput = wrapper.find('input#username');
      const passwordInput = wrapper.find('input#password');
      const confirmInput = wrapper.find('input#password-confirm');
      const submitButton = wrapper.find('button[type="submit"]');

      await usernameInput.setValue('validuser123');
      await passwordInput.setValue('ValidPass123');
      await confirmInput.setValue('ValidPass123');
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      expect(submitButton.attributes('disabled')).toBeUndefined();
    });

    it('calls signup with correct data on form submission', async () => {
      mockSignup.mockResolvedValue(true);

      const wrapper = mount(SignupPage, {
        global: {
          plugins: [mockRouter],
        },
      });
      const usernameInput = wrapper.find('input#username');
      const passwordInput = wrapper.find('input#password');
      const confirmInput = wrapper.find('input#password-confirm');
      const form = wrapper.find('form');

      await usernameInput.setValue('validuser123');
      await passwordInput.setValue('ValidPass123');
      await confirmInput.setValue('ValidPass123');
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      await form.trigger('submit');
      await wrapper.vm.$nextTick();

      expect(mockSignup).toHaveBeenCalledWith({
        username: 'validuser123',
        password: 'ValidPass123',
        passwordConfirm: 'ValidPass123',
      });
    });

    it('clears password fields after successful signup', async () => {
      mockSignup.mockResolvedValue(true);

      const wrapper = mount(SignupPage, {
        global: {
          plugins: [mockRouter],
        },
      });
      const usernameInput = wrapper.find('input#username');
      const passwordInput = wrapper.find('input#password');
      const confirmInput = wrapper.find('input#password-confirm');
      const form = wrapper.find('form');

      await usernameInput.setValue('validuser123');
      await passwordInput.setValue('ValidPass123');
      await confirmInput.setValue('ValidPass123');
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      await form.trigger('submit');
      await wrapper.vm.$nextTick();

      expect((passwordInput.element as HTMLInputElement).value).toBe('');
      expect((confirmInput.element as HTMLInputElement).value).toBe('');
    });

    it('clears all fields after successful signup', async () => {
      mockSignup.mockResolvedValue(true);

      const wrapper = mount(SignupPage, {
        global: {
          plugins: [mockRouter],
        },
      });
      const usernameInput = wrapper.find('input#username');
      const passwordInput = wrapper.find('input#password');
      const confirmInput = wrapper.find('input#password-confirm');
      const form = wrapper.find('form');

      await usernameInput.setValue('validuser123');
      await passwordInput.setValue('ValidPass123');
      await confirmInput.setValue('ValidPass123');
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      await form.trigger('submit');
      await flushPromises();

      expect((usernameInput.element as HTMLInputElement).value).toBe('');
      expect((passwordInput.element as HTMLInputElement).value).toBe('');
      expect((confirmInput.element as HTMLInputElement).value).toBe('');
    });

    it('redirects to login page on successful signup', async () => {
      mockSignup.mockResolvedValue(true);

      const wrapper = mount(SignupPage, {
        global: {
          plugins: [mockRouter],
        },
      });
      const usernameInput = wrapper.find('input#username');
      const passwordInput = wrapper.find('input#password');
      const confirmInput = wrapper.find('input#password-confirm');
      const form = wrapper.find('form');

      await usernameInput.setValue('validuser123');
      await passwordInput.setValue('ValidPass123');
      await confirmInput.setValue('ValidPass123');
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      await form.trigger('submit');
      await flushPromises();
      await mockRouter.isReady();

      expect(mockRouter.currentRoute.value.path).toBe('/login');
    });

    it('displays error message on failed signup', async () => {
      mockSignup.mockResolvedValue(false);
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        signup: mockSignup,
        login: vi.fn(),
        logout: vi.fn(),
        checkAuth: vi.fn(),
        clearError: mockClearError,
        isAuthenticated: computed(() => false),
        user: computed(() => null),
        loading: computed(() => false),
        error: computed(() => 'Username already taken'),
        setError: vi.fn(),
      } as any);

      const wrapper = mount(SignupPage, {
        global: {
          plugins: [mockRouter],
        },
      });
      const usernameInput = wrapper.find('input#username');
      const passwordInput = wrapper.find('input#password');
      const confirmInput = wrapper.find('input#password-confirm');
      const form = wrapper.find('form');

      await usernameInput.setValue('validuser123');
      await passwordInput.setValue('ValidPass123');
      await confirmInput.setValue('ValidPass123');
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      await form.trigger('submit');
      await wrapper.vm.$nextTick();

      const errorMessage = wrapper.find('.error-message');
      expect(errorMessage.exists()).toBe(true);
    });
  });

  describe('Navigation', () => {
    it('navigates to login page when login link is clicked', async () => {
      const wrapper = mount(SignupPage, {
        global: {
          plugins: [mockRouter],
        },
      });
      const loginLink = wrapper.find('.login-link');

      await loginLink.trigger('click');
      await flushPromises();
      await mockRouter.isReady();

      expect(mockRouter.currentRoute.value.path).toBe('/login');
    });

    it('clears form when navigating to login', async () => {
      const wrapper = mount(SignupPage, {
        global: {
          plugins: [mockRouter],
        },
      });
      const usernameInput = wrapper.find('input#username');
      const passwordInput = wrapper.find('input#password');
      const confirmInput = wrapper.find('input#password-confirm');
      const loginLink = wrapper.find('.login-link');

      await usernameInput.setValue('validuser123');
      await passwordInput.setValue('ValidPass123');
      await confirmInput.setValue('ValidPass123');
      await wrapper.vm.$nextTick();

      await loginLink.trigger('click');
      await wrapper.vm.$nextTick();

      expect((usernameInput.element as HTMLInputElement).value).toBe('');
      expect((passwordInput.element as HTMLInputElement).value).toBe('');
      expect((confirmInput.element as HTMLInputElement).value).toBe('');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes on form inputs', () => {
      const wrapper = mount(SignupPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      const usernameInput = wrapper.find('input#username');
      expect(usernameInput.attributes('aria-required')).toBe('true');
      expect(usernameInput.attributes('aria-describedby')).toBe('username-error');

      const passwordInput = wrapper.find('input#password');
      expect(passwordInput.attributes('aria-required')).toBe('true');
      expect(passwordInput.attributes('aria-describedby')).toBe('password-error');
    });

    it('has proper labels for all form inputs', () => {
      const wrapper = mount(SignupPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      const labels = wrapper.findAll('label');
      expect(labels.length).toBeGreaterThanOrEqual(3);

      const usernameLabel = wrapper.find('label[for="username"]');
      expect(usernameLabel.exists()).toBe(true);

      const passwordLabel = wrapper.find('label[for="password"]');
      expect(passwordLabel.exists()).toBe(true);

      const confirmLabel = wrapper.find('label[for="password-confirm"]');
      expect(confirmLabel.exists()).toBe(true);
    });

    it('displays error messages with role="alert"', async () => {
      const wrapper = mount(SignupPage, {
        global: {
          plugins: [mockRouter],
        },
      });
      const usernameInput = wrapper.find('input#username');

      await usernameInput.setValue('ab');
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const error = wrapper.find('#username-error');
      expect(error.attributes('role')).toBe('alert');
    });

    it('has proper autocomplete attributes', () => {
      const wrapper = mount(SignupPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      const usernameInput = wrapper.find('input#username');
      expect(usernameInput.attributes('autocomplete')).toBe('username');

      const passwordInput = wrapper.find('input#password');
      expect(passwordInput.attributes('autocomplete')).toBe('new-password');

      const confirmInput = wrapper.find('input#password-confirm');
      expect(confirmInput.attributes('autocomplete')).toBe('new-password');
    });
  });

  describe('Loading State', () => {
    it('disables form inputs during loading', async () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        signup: mockSignup,
        login: vi.fn(),
        logout: vi.fn(),
        checkAuth: vi.fn(),
        clearError: mockClearError,
        isAuthenticated: computed(() => false),
        user: computed(() => null),
        loading: computed(() => true),
        error: computed(() => null),
        setError: vi.fn(),
      } as any);

      const wrapper = mount(SignupPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      const usernameInput = wrapper.find('input#username');
      const passwordInput = wrapper.find('input#password');
      const confirmInput = wrapper.find('input#password-confirm');

      expect(usernameInput.attributes('disabled')).toBeDefined();
      expect(passwordInput.attributes('disabled')).toBeDefined();
      expect(confirmInput.attributes('disabled')).toBeDefined();
    });

    it('shows loading indicator during signup', async () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        signup: mockSignup,
        login: vi.fn(),
        logout: vi.fn(),
        checkAuth: vi.fn(),
        clearError: mockClearError,
        isAuthenticated: computed(() => false),
        user: computed(() => null),
        loading: computed(() => true),
        error: computed(() => null),
        setError: vi.fn(),
      } as any);

      const wrapper = mount(SignupPage, {
        global: {
          plugins: [mockRouter],
        },
      });

      const loadingIndicator = wrapper.find('.loading-indicator');
      expect(loadingIndicator.exists()).toBe(true);
    });
  });
});
