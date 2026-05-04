import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import App from './App.vue';
import * as useAuthModule from './composables/useAuth';

// Mock the useAuth composable
vi.mock('./composables/useAuth', () => ({
  useAuth: vi.fn(),
}));

// Mock router
vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router');
  return {
    ...actual,
    useRouter: () => ({
      push: vi.fn(),
    }),
  };
});

describe('App.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      isAuthenticated: { value: false } as any,
      user: { value: null } as any,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      checkAuth: vi.fn(),
      clearError: vi.fn(),
      loading: { value: false } as any,
      error: { value: null } as any,
    } as any);
  });

  it('should render the application', () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          RouterView: true,
          Navigation: true,
        },
      },
    });

    expect(wrapper.find('#app').exists()).toBe(true);
  });

  it('should render Navigation component', () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          RouterView: true,
        },
      },
    });

    expect(wrapper.findComponent({ name: 'Navigation' }).exists()).toBe(true);
  });

  it('should render RouterView for page content', () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          Navigation: true,
        },
      },
    });

    // Check that main content area exists (RouterView renders inside main)
    const mainContent = wrapper.find('.main-content');
    expect(mainContent.exists()).toBe(true);
  });

  it('should not show global error by default', () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          RouterView: true,
          Navigation: true,
        },
      },
    });

    const globalError = wrapper.find('.global-error');
    expect(globalError.exists()).toBe(false);
  });

  it('should have proper ARIA roles for accessibility', () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          RouterView: true,
          Navigation: true,
        },
      },
    });

    const main = wrapper.find('[role="main"]');
    expect(main.exists()).toBe(true);
  });

  it('should have proper structure with navigation and main content', () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          RouterView: true,
        },
      },
    });

    const container = wrapper.find('#app');
    expect(container.exists()).toBe(true);

    // Check that Navigation is rendered
    expect(wrapper.findComponent({ name: 'Navigation' }).exists()).toBe(true);

    // Check that main content area exists
    const mainContent = wrapper.find('.main-content');
    expect(mainContent.exists()).toBe(true);
  });

  it('should initialize auth check on mount', async () => {
    const checkAuthMock = vi.fn();
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      isAuthenticated: { value: false } as any,
      user: { value: null } as any,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      checkAuth: checkAuthMock,
      clearError: vi.fn(),
      loading: { value: false } as any,
      error: { value: null } as any,
    } as any);

    mount(App, {
      global: {
        stubs: {
          RouterView: true,
          Navigation: true,
        },
      },
    });

    // checkAuth should be called on mount
    expect(checkAuthMock).toHaveBeenCalled();
  });
});

describe('App.vue - Responsive Design', () => {
  beforeEach(() => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      isAuthenticated: { value: false } as any,
      user: { value: null } as any,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      checkAuth: vi.fn(),
      clearError: vi.fn(),
      loading: { value: false } as any,
      error: { value: null } as any,
    } as any);
  });

  it('should have responsive classes', () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          RouterView: true,
          Navigation: true,
        },
      },
    });

    // Check that main elements have proper structure for responsive design
    const container = wrapper.find('#app');
    expect(container.exists()).toBe(true);

    const mainContent = wrapper.find('.main-content');
    expect(mainContent.exists()).toBe(true);
  });
});
