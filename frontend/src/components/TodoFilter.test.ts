import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import TodoFilter from './TodoFilter.vue';
import type { FilterType } from '../types/todo';

describe('TodoFilter Component - Rendering', () => {
  it('should render the filter header', () => {
    const wrapper = mount(TodoFilter, {
      props: {
        currentFilter: 'all',
        activeCount: 5,
        completedCount: 3,
      },
    });
    
    const header = wrapper.find('.filter-header h3');
    expect(header.exists()).toBe(true);
    expect(header.text()).toBe('Filter Todos');
  });

  it('should render active count badge', () => {
    const wrapper = mount(TodoFilter, {
      props: {
        currentFilter: 'all',
        activeCount: 5,
        completedCount: 3,
      },
    });
    
    const activeBadge = wrapper.find('.count-active');
    expect(activeBadge.exists()).toBe(true);
    expect(activeBadge.text()).toBe('Active: 5');
  });

  it('should render completed count badge', () => {
    const wrapper = mount(TodoFilter, {
      props: {
        currentFilter: 'all',
        activeCount: 5,
        completedCount: 3,
      },
    });
    
    const completedBadge = wrapper.find('.count-completed');
    expect(completedBadge.exists()).toBe(true);
    expect(completedBadge.text()).toBe('Completed: 3');
  });

  it('should render all three filter buttons', () => {
    const wrapper = mount(TodoFilter, {
      props: {
        currentFilter: 'all',
        activeCount: 5,
        completedCount: 3,
      },
    });
    
    const buttons = wrapper.findAll('.filter-btn');
    expect(buttons).toHaveLength(3);
    expect(buttons[0].text()).toBe('All');
    expect(buttons[1].text()).toBe('Active');
    expect(buttons[2].text()).toBe('Completed');
  });

  it('should update counts when props change', async () => {
    const wrapper = mount(TodoFilter, {
      props: {
        currentFilter: 'all',
        activeCount: 5,
        completedCount: 3,
      },
    });
    
    await wrapper.setProps({
      activeCount: 10,
      completedCount: 7,
    });
    
    expect(wrapper.find('.count-active').text()).toBe('Active: 10');
    expect(wrapper.find('.count-completed').text()).toBe('Completed: 7');
  });
});

describe('TodoFilter Component - Filter Button States', () => {
  it('should highlight "All" button when currentFilter is "all"', () => {
    const wrapper = mount(TodoFilter, {
      props: {
        currentFilter: 'all',
        activeCount: 5,
        completedCount: 3,
      },
    });
    
    const buttons = wrapper.findAll('.filter-btn');
    expect(buttons[0].classes()).toContain('filter-btn-active');
    expect(buttons[1].classes()).not.toContain('filter-btn-active');
    expect(buttons[2].classes()).not.toContain('filter-btn-active');
  });

  it('should highlight "Active" button when currentFilter is "active"', () => {
    const wrapper = mount(TodoFilter, {
      props: {
        currentFilter: 'active',
        activeCount: 5,
        completedCount: 3,
      },
    });
    
    const buttons = wrapper.findAll('.filter-btn');
    expect(buttons[0].classes()).not.toContain('filter-btn-active');
    expect(buttons[1].classes()).toContain('filter-btn-active');
    expect(buttons[2].classes()).not.toContain('filter-btn-active');
  });

  it('should highlight "Completed" button when currentFilter is "completed"', () => {
    const wrapper = mount(TodoFilter, {
      props: {
        currentFilter: 'completed',
        activeCount: 5,
        completedCount: 3,
      },
    });
    
    const buttons = wrapper.findAll('.filter-btn');
    expect(buttons[0].classes()).not.toContain('filter-btn-active');
    expect(buttons[1].classes()).not.toContain('filter-btn-active');
    expect(buttons[2].classes()).toContain('filter-btn-active');
  });

  it('should update highlighted button when currentFilter prop changes', async () => {
    const wrapper = mount(TodoFilter, {
      props: {
        currentFilter: 'all' as FilterType,
        activeCount: 5,
        completedCount: 3,
      },
    });
    
    const buttons = wrapper.findAll('.filter-btn');
    expect(buttons[0].classes()).toContain('filter-btn-active');
    
    await wrapper.setProps({ currentFilter: 'active' });
    expect(buttons[0].classes()).not.toContain('filter-btn-active');
    expect(buttons[1].classes()).toContain('filter-btn-active');
    
    await wrapper.setProps({ currentFilter: 'completed' });
    expect(buttons[1].classes()).not.toContain('filter-btn-active');
    expect(buttons[2].classes()).toContain('filter-btn-active');
  });
});

describe('TodoFilter Component - Button Click Events', () => {
  it('should emit filter-change event with "all" when All button is clicked', async () => {
    const wrapper = mount(TodoFilter, {
      props: {
        currentFilter: 'active',
        activeCount: 5,
        completedCount: 3,
      },
    });
    
    const buttons = wrapper.findAll('.filter-btn');
    await buttons[0].trigger('click');
    
    expect(wrapper.emitted('filter-change')).toBeTruthy();
    expect(wrapper.emitted('filter-change')?.[0]).toEqual(['all']);
  });

  it('should emit filter-change event with "active" when Active button is clicked', async () => {
    const wrapper = mount(TodoFilter, {
      props: {
        currentFilter: 'all',
        activeCount: 5,
        completedCount: 3,
      },
    });
    
    const buttons = wrapper.findAll('.filter-btn');
    await buttons[1].trigger('click');
    
    expect(wrapper.emitted('filter-change')).toBeTruthy();
    expect(wrapper.emitted('filter-change')?.[0]).toEqual(['active']);
  });

  it('should emit filter-change event with "completed" when Completed button is clicked', async () => {
    const wrapper = mount(TodoFilter, {
      props: {
        currentFilter: 'all',
        activeCount: 5,
        completedCount: 3,
      },
    });
    
    const buttons = wrapper.findAll('.filter-btn');
    await buttons[2].trigger('click');
    
    expect(wrapper.emitted('filter-change')).toBeTruthy();
    expect(wrapper.emitted('filter-change')?.[0]).toEqual(['completed']);
  });

  it('should emit filter-change event even when clicking already active filter', async () => {
    const wrapper = mount(TodoFilter, {
      props: {
        currentFilter: 'all',
        activeCount: 5,
        completedCount: 3,
      },
    });
    
    const buttons = wrapper.findAll('.filter-btn');
    await buttons[0].trigger('click');
    
    expect(wrapper.emitted('filter-change')).toBeTruthy();
    expect(wrapper.emitted('filter-change')?.[0]).toEqual(['all']);
  });

  it('should emit multiple filter-change events for multiple clicks', async () => {
    const wrapper = mount(TodoFilter, {
      props: {
        currentFilter: 'all',
        activeCount: 5,
        completedCount: 3,
      },
    });
    
    const buttons = wrapper.findAll('.filter-btn');
    
    await buttons[0].trigger('click');
    await buttons[1].trigger('click');
    await buttons[2].trigger('click');
    
    expect(wrapper.emitted('filter-change')?.length).toBe(3);
    expect(wrapper.emitted('filter-change')?.[0]).toEqual(['all']);
    expect(wrapper.emitted('filter-change')?.[1]).toEqual(['active']);
    expect(wrapper.emitted('filter-change')?.[2]).toEqual(['completed']);
  });
});

describe('TodoFilter Component - Accessibility', () => {
  it('should have proper ARIA role for button group', () => {
    const wrapper = mount(TodoFilter, {
      props: {
        currentFilter: 'all',
        activeCount: 5,
        completedCount: 3,
      },
    });
    
    const buttonGroup = wrapper.find('.filter-buttons');
    expect(buttonGroup.attributes('role')).toBe('group');
    expect(buttonGroup.attributes('aria-label')).toBe('Filter todos by status');
  });

  it('should have proper ARIA labels for filter buttons', () => {
    const wrapper = mount(TodoFilter, {
      props: {
        currentFilter: 'all',
        activeCount: 5,
        completedCount: 3,
      },
    });
    
    const buttons = wrapper.findAll('.filter-btn');
    expect(buttons[0].attributes('aria-label')).toBe('Show all todos');
    expect(buttons[1].attributes('aria-label')).toBe('Show active todos only');
    expect(buttons[2].attributes('aria-label')).toBe('Show completed todos only');
  });

  it('should have proper ARIA pressed state for active filter', () => {
    const wrapper = mount(TodoFilter, {
      props: {
        currentFilter: 'active',
        activeCount: 5,
        completedCount: 3,
      },
    });
    
    const buttons = wrapper.findAll('.filter-btn');
    expect(buttons[0].attributes('aria-pressed')).toBe('false');
    expect(buttons[1].attributes('aria-pressed')).toBe('true');
    expect(buttons[2].attributes('aria-pressed')).toBe('false');
  });

  it('should update ARIA pressed state when filter changes', async () => {
    const wrapper = mount(TodoFilter, {
      props: {
        currentFilter: 'all' as FilterType,
        activeCount: 5,
        completedCount: 3,
      },
    });
    
    const buttons = wrapper.findAll('.filter-btn');
    expect(buttons[0].attributes('aria-pressed')).toBe('true');
    
    await wrapper.setProps({ currentFilter: 'completed' });
    expect(buttons[0].attributes('aria-pressed')).toBe('false');
    expect(buttons[2].attributes('aria-pressed')).toBe('true');
  });

  it('should have proper ARIA labels for count badges', () => {
    const wrapper = mount(TodoFilter, {
      props: {
        currentFilter: 'all',
        activeCount: 5,
        completedCount: 3,
      },
    });
    
    const activeBadge = wrapper.find('.count-active');
    const completedBadge = wrapper.find('.count-completed');
    
    expect(activeBadge.attributes('aria-label')).toBe('5 active todos');
    expect(completedBadge.attributes('aria-label')).toBe('3 completed todos');
  });

  it('should update ARIA labels when counts change', async () => {
    const wrapper = mount(TodoFilter, {
      props: {
        currentFilter: 'all',
        activeCount: 5,
        completedCount: 3,
      },
    });
    
    await wrapper.setProps({
      activeCount: 10,
      completedCount: 7,
    });
    
    const activeBadge = wrapper.find('.count-active');
    const completedBadge = wrapper.find('.count-completed');
    
    expect(activeBadge.attributes('aria-label')).toBe('10 active todos');
    expect(completedBadge.attributes('aria-label')).toBe('7 completed todos');
  });
});

describe('TodoFilter Component - Edge Cases', () => {
  it('should handle zero active count', () => {
    const wrapper = mount(TodoFilter, {
      props: {
        currentFilter: 'all',
        activeCount: 0,
        completedCount: 5,
      },
    });
    
    const activeBadge = wrapper.find('.count-active');
    expect(activeBadge.text()).toBe('Active: 0');
    expect(activeBadge.attributes('aria-label')).toBe('0 active todos');
  });

  it('should handle zero completed count', () => {
    const wrapper = mount(TodoFilter, {
      props: {
        currentFilter: 'all',
        activeCount: 5,
        completedCount: 0,
      },
    });
    
    const completedBadge = wrapper.find('.count-completed');
    expect(completedBadge.text()).toBe('Completed: 0');
    expect(completedBadge.attributes('aria-label')).toBe('0 completed todos');
  });

  it('should handle both counts being zero', () => {
    const wrapper = mount(TodoFilter, {
      props: {
        currentFilter: 'all',
        activeCount: 0,
        completedCount: 0,
      },
    });
    
    expect(wrapper.find('.count-active').text()).toBe('Active: 0');
    expect(wrapper.find('.count-completed').text()).toBe('Completed: 0');
  });

  it('should handle very large counts', () => {
    const wrapper = mount(TodoFilter, {
      props: {
        currentFilter: 'all',
        activeCount: 999999,
        completedCount: 888888,
      },
    });
    
    expect(wrapper.find('.count-active').text()).toBe('Active: 999999');
    expect(wrapper.find('.count-completed').text()).toBe('Completed: 888888');
  });

  it('should handle rapid filter changes', async () => {
    const wrapper = mount(TodoFilter, {
      props: {
        currentFilter: 'all' as FilterType,
        activeCount: 5,
        completedCount: 3,
      },
    });
    
    const buttons = wrapper.findAll('.filter-btn');
    
    // Rapidly click different filters
    await buttons[0].trigger('click');
    await buttons[1].trigger('click');
    await buttons[2].trigger('click');
    await buttons[0].trigger('click');
    await buttons[1].trigger('click');
    
    expect(wrapper.emitted('filter-change')?.length).toBe(5);
  });

  it('should handle rapid count updates', async () => {
    const wrapper = mount(TodoFilter, {
      props: {
        currentFilter: 'all',
        activeCount: 5,
        completedCount: 3,
      },
    });
    
    // Rapidly update counts
    await wrapper.setProps({ activeCount: 10, completedCount: 7 });
    await wrapper.setProps({ activeCount: 15, completedCount: 12 });
    await wrapper.setProps({ activeCount: 20, completedCount: 18 });
    
    expect(wrapper.find('.count-active').text()).toBe('Active: 20');
    expect(wrapper.find('.count-completed').text()).toBe('Completed: 18');
  });
});

describe('TodoFilter Component - Button Types', () => {
  it('should have type="button" on all filter buttons', () => {
    const wrapper = mount(TodoFilter, {
      props: {
        currentFilter: 'all',
        activeCount: 5,
        completedCount: 3,
      },
    });
    
    const buttons = wrapper.findAll('.filter-btn');
    buttons.forEach(button => {
      expect(button.attributes('type')).toBe('button');
    });
  });
});

describe('TodoFilter Component - Count Display Variations', () => {
  it('should display singular form for count of 1', () => {
    const wrapper = mount(TodoFilter, {
      props: {
        currentFilter: 'all',
        activeCount: 1,
        completedCount: 1,
      },
    });
    
    // Note: The component uses "Active: 1" and "Completed: 1" format
    // which doesn't distinguish singular/plural, but we test the display
    expect(wrapper.find('.count-active').text()).toBe('Active: 1');
    expect(wrapper.find('.count-completed').text()).toBe('Completed: 1');
    expect(wrapper.find('.count-active').attributes('aria-label')).toBe('1 active todos');
    expect(wrapper.find('.count-completed').attributes('aria-label')).toBe('1 completed todos');
  });

  it('should display counts correctly for various numbers', () => {
    const testCases = [
      { active: 0, completed: 0 },
      { active: 1, completed: 1 },
      { active: 5, completed: 10 },
      { active: 100, completed: 200 },
    ];
    
    testCases.forEach(({ active, completed }) => {
      const wrapper = mount(TodoFilter, {
        props: {
          currentFilter: 'all',
          activeCount: active,
          completedCount: completed,
        },
      });
      
      expect(wrapper.find('.count-active').text()).toBe(`Active: ${active}`);
      expect(wrapper.find('.count-completed').text()).toBe(`Completed: ${completed}`);
    });
  });
});

describe('TodoFilter Component - Integration Scenarios', () => {
  it('should work correctly when switching between all filters', async () => {
    const wrapper = mount(TodoFilter, {
      props: {
        currentFilter: 'all' as FilterType,
        activeCount: 5,
        completedCount: 3,
      },
    });
    
    const buttons = wrapper.findAll('.filter-btn');
    
    // Start with "all"
    expect(buttons[0].classes()).toContain('filter-btn-active');
    
    // Switch to "active"
    await buttons[1].trigger('click');
    await wrapper.setProps({ currentFilter: 'active' });
    expect(buttons[1].classes()).toContain('filter-btn-active');
    expect(wrapper.emitted('filter-change')?.[0]).toEqual(['active']);
    
    // Switch to "completed"
    await buttons[2].trigger('click');
    await wrapper.setProps({ currentFilter: 'completed' });
    expect(buttons[2].classes()).toContain('filter-btn-active');
    expect(wrapper.emitted('filter-change')?.[1]).toEqual(['completed']);
    
    // Switch back to "all"
    await buttons[0].trigger('click');
    await wrapper.setProps({ currentFilter: 'all' });
    expect(buttons[0].classes()).toContain('filter-btn-active');
    expect(wrapper.emitted('filter-change')?.[2]).toEqual(['all']);
  });

  it('should maintain correct state when counts change while filter is active', async () => {
    const wrapper = mount(TodoFilter, {
      props: {
        currentFilter: 'active',
        activeCount: 5,
        completedCount: 3,
      },
    });
    
    const buttons = wrapper.findAll('.filter-btn');
    expect(buttons[1].classes()).toContain('filter-btn-active');
    
    // Update counts
    await wrapper.setProps({
      activeCount: 10,
      completedCount: 7,
    });
    
    // Filter should still be active
    expect(buttons[1].classes()).toContain('filter-btn-active');
    expect(wrapper.find('.count-active').text()).toBe('Active: 10');
    expect(wrapper.find('.count-completed').text()).toBe('Completed: 7');
  });
});
