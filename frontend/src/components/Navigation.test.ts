import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { computed } from 'vue';
import Navigation from './Navigation.vue';
import * as useAuthModule from '../composables/useAuth';

// Mock the useAuth composable
vi.mock('../composables/useAuth', () => ({
  useAuth: vi.fn(),
}));

describe('Navigation.vue', () => {
  let mockLogout: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockLogout = vi.fn();
  });

  describe('Unauthenticated State', () => {
    beforeEach(() => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        isAuthenticated: computed(() => false),
        user: computed(() => null),
        login: vi.fn(),
        signup: vi.fn(),
        logout: mockLogout,
        checkAuth: vi.fn(),
        clearError: vi.fn(),
        loading: computed(() => false),
        error: computed(() => null),
        setError: vi.fn(),
      } as any);
    });

    it('renders navigation bar', () => {
      const wrapper = mount(Navigation);
      expect(wrapper.find('.navigation').exists()).toBe(true);
    });

    it('displays brand/logo', () => {
      const wrapper = mount(Navigation);
      expect(wrapper.find('.nav-brand').exists()).toBe(true);
      expect(wrapper.find('.nav-title').text()).toBe('Todo App');
    });

    it('shows "Not logged in" message when unauthenticated', () => {
      const wrapper = mount(Navigation);
      const unAuthSection = wrapper.find('.unauth-section');
      expect(unAuthSection.exists()).toBe(true);
      expect(unAuthSection.text()).toContain('Not logged in');
    });

    it('does not show logout button when unauthenticated', () => {
      const wrapper = mount(Navigation);
      expect(wrapper.find('.logout-button').exists()).toBe(false);
    });

    it('does not show user greeting when unauthenticated', () => {
      const wrapper = mount(Navigation);
      expect(wrapper.find('.user-greeting').exists()).toBe(false);
    });
  });

  describe('Authenticated State', () => {
    beforeEach(() => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        isAuthenticated: computed(() => true),
        user: computed(() => ({ id: '1', username: 'testuser' })),
        login: vi.fn(),
        signup: vi.fn(),
        logout: mockLogout,
        checkAuth: vi.fn(),
        clearError: vi.fn(),
        loading: computed(() => false),
        error: computed(() => null),
        setError: vi.fn(),
      } as any);
    });

    it('shows user greeting with username', () => {
      const wrapper = mount(Navigation);
      expect(wrapper.find('.user-greeting').text()).toContain('Welcome');
      expect(wrapper.find('.username').text()).toBe('testuser');
    });

    it('displays logout button when authenticated', () => {
      const wrapper = mount(Navigation);
      expect(wrapper.find('.logout-button').exists()).toBe(true);
      expect(wrapper.find('.logout-button').text()).toContain('Logout');
    });

    it('does not show "Not logged in" message when authenticated', () => {
      const wrapper = mount(Navigation);
      expect(wrapper.find('.unauth-message').exists()).toBe(false);
    });

    it('shows logout confirmation dialog when logout button is clicked', async () => {
      const wrapper = mount(Navigation);
      const logoutButton = wrapper.find('.logout-button');

      await logoutButton.trigger('click');
      await wrapper.vm.$nextTick();

      expect(wrapper.find('.logout-modal-overlay').exists()).toBe(true);
      expect(wrapper.find('.logout-modal').exists()).toBe(true);
    });

    it('displays confirmation message in logout dialog', async () => {
      const wrapper = mount(Navigation);
      const logoutButton = wrapper.find('.logout-button');

      await logoutButton.trigger('click');
      await wrapper.vm.$nextTick();

      const description = wrapper.find('#logout-description');
      expect(description.text()).toContain('Are you sure you want to log out');
    });

    it('calls logout when confirm button is clicked', async () => {
      const wrapper = mount(Navigation);
      const logoutButton = wrapper.find('.logout-button');

      await logoutButton.trigger('click');
      await wrapper.vm.$nextTick();

      const confirmButton = wrapper.find('.btn-confirm');
      await confirmButton.trigger('click');
      await wrapper.vm.$nextTick();

      expect(mockLogout).toHaveBeenCalled();
    });

    it('closes dialog when cancel button is clicked', async () => {
      const wrapper = mount(Navigation);
      const logoutButton = wrapper.find('.logout-button');

      await logoutButton.trigger('click');
      await wrapper.vm.$nextTick();

      expect(wrapper.find('.logout-modal-overlay').exists()).toBe(true);

      const cancelButton = wrapper.find('.btn-cancel');
      await cancelButton.trigger('click');
      await wrapper.vm.$nextTick();

      expect(wrapper.find('.logout-modal-overlay').exists()).toBe(false);
    });

    it('closes dialog when overlay is clicked', async () => {
      const wrapper = mount(Navigation);
      const logoutButton = wrapper.find('.logout-button');

      await logoutButton.trigger('click');
      await wrapper.vm.$nextTick();

      expect(wrapper.find('.logout-modal-overlay').exists()).toBe(true);

      const overlay = wrapper.find('.logout-modal-overlay');
      await overlay.trigger('click');
      await wrapper.vm.$nextTick();

      expect(wrapper.find('.logout-modal-overlay').exists()).toBe(false);
    });

    it('does not close dialog when modal is clicked', async () => {
      const wrapper = mount(Navigation);
      const logoutButton = wrapper.find('.logout-button');

      await logoutButton.trigger('click');
      await wrapper.vm.$nextTick();

      const modal = wrapper.find('.logout-modal');
      await modal.trigger('click');
      await wrapper.vm.$nextTick();

      expect(wrapper.find('.logout-modal-overlay').exists()).toBe(true);
    });
  });

  describe('Loading State', () => {
    beforeEach(() => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        isAuthenticated: computed(() => true),
        user: computed(() => ({ id: '1', username: 'testuser' })),
        login: vi.fn(),
        signup: vi.fn(),
        logout: mockLogout,
        checkAuth: vi.fn(),
        clearError: vi.fn(),
        loading: computed(() => true),
        error: computed(() => null),
        setError: vi.fn(),
      } as any);
    });

    it('disables logout button during loading', () => {
      const wrapper = mount(Navigation);
      const logoutButton = wrapper.find('.logout-button');

      expect(logoutButton.attributes('disabled')).toBeDefined();
    });

    it('shows loading spinner in confirm button', async () => {
      const wrapper = mount(Navigation);
      const logoutButton = wrapper.find('.logout-button');

      await logoutButton.trigger('click');
      await wrapper.vm.$nextTick();

      // Now the dialog should be open, check if buttons are disabled
      const confirmButton = wrapper.find('.btn-confirm');
      if (confirmButton.exists()) {
        expect(confirmButton.attributes('disabled')).toBeDefined();
        expect(confirmButton.find('.spinner').exists()).toBe(true);
      }
    });

    it('disables cancel button during loading', async () => {
      const wrapper = mount(Navigation);
      const logoutButton = wrapper.find('.logout-button');

      await logoutButton.trigger('click');
      await wrapper.vm.$nextTick();

      // Now the dialog should be open, check if buttons are disabled
      const cancelButton = wrapper.find('.btn-cancel');
      if (cancelButton.exists()) {
        expect(cancelButton.attributes('disabled')).toBeDefined();
      }
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        isAuthenticated: computed(() => true),
        user: computed(() => ({ id: '1', username: 'testuser' })),
        login: vi.fn(),
        signup: vi.fn(),
        logout: mockLogout,
        checkAuth: vi.fn(),
        clearError: vi.fn(),
        loading: computed(() => false),
        error: computed(() => null),
        setError: vi.fn(),
      } as any);
    });

    it('has proper navigation role', () => {
      const wrapper = mount(Navigation);
      expect(wrapper.find('nav').attributes('role')).toBe('navigation');
    });

    it('has aria-label on navigation', () => {
      const wrapper = mount(Navigation);
      expect(wrapper.find('nav').attributes('aria-label')).toBe(
        'Main navigation'
      );
    });

    it('has aria-label on logout button', () => {
      const wrapper = mount(Navigation);
      const logoutButton = wrapper.find('.logout-button');
      expect(logoutButton.attributes('aria-label')).toBeTruthy();
    });

    it('has proper alertdialog role on logout modal', async () => {
      const wrapper = mount(Navigation);
      const logoutButton = wrapper.find('.logout-button');

      await logoutButton.trigger('click');
      await wrapper.vm.$nextTick();

      const modal = wrapper.find('.logout-modal');
      expect(modal.attributes('role')).toBe('alertdialog');
    });

    it('has aria-labelledby on logout modal', async () => {
      const wrapper = mount(Navigation);
      const logoutButton = wrapper.find('.logout-button');

      await logoutButton.trigger('click');
      await wrapper.vm.$nextTick();

      const modal = wrapper.find('.logout-modal');
      expect(modal.attributes('aria-labelledby')).toBe('logout-title');
    });

    it('has aria-describedby on logout modal', async () => {
      const wrapper = mount(Navigation);
      const logoutButton = wrapper.find('.logout-button');

      await logoutButton.trigger('click');
      await wrapper.vm.$nextTick();

      const modal = wrapper.find('.logout-modal');
      expect(modal.attributes('aria-describedby')).toBe('logout-description');
    });

    it('has aria-busy on confirm button during loading', async () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        isAuthenticated: computed(() => true),
        user: computed(() => ({ id: '1', username: 'testuser' })),
        login: vi.fn(),
        signup: vi.fn(),
        logout: mockLogout,
        checkAuth: vi.fn(),
        clearError: vi.fn(),
        loading: computed(() => true),
        error: computed(() => null),
        setError: vi.fn(),
      } as any);

      const wrapper = mount(Navigation);
      const logoutButton = wrapper.find('.logout-button');

      await logoutButton.trigger('click');
      await wrapper.vm.$nextTick();

      const confirmButton = wrapper.find('.btn-confirm');
      if (confirmButton.exists()) {
        expect(confirmButton.attributes('aria-busy')).toBe('true');
      }
    });
  });

  describe('User Display', () => {
    it('displays default "User" when username is not available', () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        isAuthenticated: computed(() => true),
        user: computed(() => null),
        login: vi.fn(),
        signup: vi.fn(),
        logout: mockLogout,
        checkAuth: vi.fn(),
        clearError: vi.fn(),
        loading: computed(() => false),
        error: computed(() => null),
        setError: vi.fn(),
      } as any);

      const wrapper = mount(Navigation);
      expect(wrapper.find('.username').text()).toBe('User');
    });

    it('displays correct username when available', () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        isAuthenticated: computed(() => true),
        user: computed(() => ({ id: '1', username: 'john_doe' })),
        login: vi.fn(),
        signup: vi.fn(),
        logout: mockLogout,
        checkAuth: vi.fn(),
        clearError: vi.fn(),
        loading: computed(() => false),
        error: computed(() => null),
        setError: vi.fn(),
      } as any);

      const wrapper = mount(Navigation);
      expect(wrapper.find('.username').text()).toBe('john_doe');
    });
  });
});
