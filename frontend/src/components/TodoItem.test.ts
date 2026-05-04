import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import TodoItem from './TodoItem.vue';
import type { Todo } from '../types/todo';

describe('TodoItem Component - Rendering', () => {
  const mockTodo: Todo = {
    id: 1,
    title: 'Test Todo',
    description: 'Test Description',
    completed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('should render todo title', () => {
    const wrapper = mount(TodoItem, {
      props: {
        todo: mockTodo,
      },
    });
    
    const title = wrapper.find('.todo-title');
    expect(title.exists()).toBe(true);
    expect(title.text()).toBe(mockTodo.title);
  });

  it('should render todo description when present', () => {
    const wrapper = mount(TodoItem, {
      props: {
        todo: mockTodo,
      },
    });
    
    const description = wrapper.find('.todo-description');
    expect(description.exists()).toBe(true);
    expect(description.text()).toBe(mockTodo.description);
  });

  it('should not render description element when description is empty', () => {
    const todoWithoutDescription: Todo = {
      ...mockTodo,
      description: '',
    };
    
    const wrapper = mount(TodoItem, {
      props: {
        todo: todoWithoutDescription,
      },
    });
    
    const description = wrapper.find('.todo-description');
    expect(description.exists()).toBe(false);
  });

  it('should render completion status', () => {
    const wrapper = mount(TodoItem, {
      props: {
        todo: mockTodo,
      },
    });
    
    const status = wrapper.find('.todo-status');
    expect(status.exists()).toBe(true);
    expect(status.text()).toBe('Active');
  });

  it('should render "Completed" status for completed todos', () => {
    const completedTodo: Todo = {
      ...mockTodo,
      completed: true,
    };
    
    const wrapper = mount(TodoItem, {
      props: {
        todo: completedTodo,
      },
    });
    
    const status = wrapper.find('.todo-status');
    expect(status.text()).toBe('Completed');
  });

  it('should render checkbox', () => {
    const wrapper = mount(TodoItem, {
      props: {
        todo: mockTodo,
      },
    });
    
    const checkbox = wrapper.find('input[type="checkbox"]');
    expect(checkbox.exists()).toBe(true);
    expect(checkbox.attributes('id')).toBe(`todo-checkbox-${mockTodo.id}`);
  });

  it('should render edit button', () => {
    const wrapper = mount(TodoItem, {
      props: {
        todo: mockTodo,
      },
    });
    
    const editButton = wrapper.find('.btn-edit');
    expect(editButton.exists()).toBe(true);
    expect(editButton.text()).toContain('Edit');
  });

  it('should render delete button', () => {
    const wrapper = mount(TodoItem, {
      props: {
        todo: mockTodo,
      },
    });
    
    const deleteButton = wrapper.find('.btn-delete');
    expect(deleteButton.exists()).toBe(true);
    expect(deleteButton.text()).toContain('Delete');
  });
});

describe('TodoItem Component - Checkbox Interaction', () => {
  const mockTodo: Todo = {
    id: 1,
    title: 'Test Todo',
    description: 'Test Description',
    completed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('should have unchecked checkbox for incomplete todo', () => {
    const wrapper = mount(TodoItem, {
      props: {
        todo: mockTodo,
      },
    });
    
    const checkbox = wrapper.find('input[type="checkbox"]');
    expect((checkbox.element as HTMLInputElement).checked).toBe(false);
  });

  it('should have checked checkbox for completed todo', () => {
    const completedTodo: Todo = {
      ...mockTodo,
      completed: true,
    };
    
    const wrapper = mount(TodoItem, {
      props: {
        todo: completedTodo,
      },
    });
    
    const checkbox = wrapper.find('input[type="checkbox"]');
    expect((checkbox.element as HTMLInputElement).checked).toBe(true);
  });

  it('should emit toggle event when checkbox is clicked', async () => {
    const wrapper = mount(TodoItem, {
      props: {
        todo: mockTodo,
      },
    });
    
    const checkbox = wrapper.find('input[type="checkbox"]');
    await checkbox.trigger('change');
    
    expect(wrapper.emitted('toggle')).toBeTruthy();
    expect(wrapper.emitted('toggle')?.[0]).toEqual([mockTodo.id]);
  });

  it('should emit toggle event with correct id for different todos', async () => {
    const todo1: Todo = { ...mockTodo, id: 1 };
    const todo2: Todo = { ...mockTodo, id: 2 };
    
    const wrapper1 = mount(TodoItem, { props: { todo: todo1 } });
    const wrapper2 = mount(TodoItem, { props: { todo: todo2 } });
    
    await wrapper1.find('input[type="checkbox"]').trigger('change');
    await wrapper2.find('input[type="checkbox"]').trigger('change');
    
    expect(wrapper1.emitted('toggle')?.[0]).toEqual([1]);
    expect(wrapper2.emitted('toggle')?.[0]).toEqual([2]);
  });
});

describe('TodoItem Component - Edit Button Interaction', () => {
  const mockTodo: Todo = {
    id: 1,
    title: 'Test Todo',
    description: 'Test Description',
    completed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('should emit edit event when edit button is clicked', async () => {
    const wrapper = mount(TodoItem, {
      props: {
        todo: mockTodo,
      },
    });
    
    const editButton = wrapper.find('.btn-edit');
    await editButton.trigger('click');
    
    expect(wrapper.emitted('edit')).toBeTruthy();
    expect(wrapper.emitted('edit')?.[0]).toEqual([mockTodo]);
  });

  it('should emit edit event with complete todo object', async () => {
    const wrapper = mount(TodoItem, {
      props: {
        todo: mockTodo,
      },
    });
    
    await wrapper.find('.btn-edit').trigger('click');
    
    const emittedTodo = wrapper.emitted('edit')?.[0]?.[0] as Todo;
    expect(emittedTodo.id).toBe(mockTodo.id);
    expect(emittedTodo.title).toBe(mockTodo.title);
    expect(emittedTodo.description).toBe(mockTodo.description);
    expect(emittedTodo.completed).toBe(mockTodo.completed);
  });

  it('should emit edit event for both completed and incomplete todos', async () => {
    const incompleteTodo: Todo = { ...mockTodo, completed: false };
    const completedTodo: Todo = { ...mockTodo, completed: true };
    
    const wrapper1 = mount(TodoItem, { props: { todo: incompleteTodo } });
    const wrapper2 = mount(TodoItem, { props: { todo: completedTodo } });
    
    await wrapper1.find('.btn-edit').trigger('click');
    await wrapper2.find('.btn-edit').trigger('click');
    
    expect(wrapper1.emitted('edit')).toBeTruthy();
    expect(wrapper2.emitted('edit')).toBeTruthy();
  });
});

describe('TodoItem Component - Delete Button Interaction', () => {
  const mockTodo: Todo = {
    id: 1,
    title: 'Test Todo',
    description: 'Test Description',
    completed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('should emit delete event when delete button is clicked', async () => {
    const wrapper = mount(TodoItem, {
      props: {
        todo: mockTodo,
      },
    });
    
    const deleteButton = wrapper.find('.btn-delete');
    await deleteButton.trigger('click');
    
    expect(wrapper.emitted('delete')).toBeTruthy();
    expect(wrapper.emitted('delete')?.[0]).toEqual([mockTodo.id]);
  });

  it('should emit delete event with correct id', async () => {
    const todo1: Todo = { ...mockTodo, id: 5 };
    const todo2: Todo = { ...mockTodo, id: 10 };
    
    const wrapper1 = mount(TodoItem, { props: { todo: todo1 } });
    const wrapper2 = mount(TodoItem, { props: { todo: todo2 } });
    
    await wrapper1.find('.btn-delete').trigger('click');
    await wrapper2.find('.btn-delete').trigger('click');
    
    expect(wrapper1.emitted('delete')?.[0]).toEqual([5]);
    expect(wrapper2.emitted('delete')?.[0]).toEqual([10]);
  });
});

describe('TodoItem Component - Completed State Styling', () => {
  const mockTodo: Todo = {
    id: 1,
    title: 'Test Todo',
    description: 'Test Description',
    completed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('should not have completed class for incomplete todo', () => {
    const wrapper = mount(TodoItem, {
      props: {
        todo: mockTodo,
      },
    });
    
    const todoItem = wrapper.find('.todo-item');
    expect(todoItem.classes()).not.toContain('todo-completed');
  });

  it('should have completed class for completed todo', () => {
    const completedTodo: Todo = {
      ...mockTodo,
      completed: true,
    };
    
    const wrapper = mount(TodoItem, {
      props: {
        todo: completedTodo,
      },
    });
    
    const todoItem = wrapper.find('.todo-item');
    expect(todoItem.classes()).toContain('todo-completed');
  });

  it('should update styling when completion status changes', async () => {
    const wrapper = mount(TodoItem, {
      props: {
        todo: mockTodo,
      },
    });
    
    expect(wrapper.find('.todo-item').classes()).not.toContain('todo-completed');
    
    // Update to completed
    await wrapper.setProps({
      todo: { ...mockTodo, completed: true },
    });
    
    expect(wrapper.find('.todo-item').classes()).toContain('todo-completed');
  });
});

describe('TodoItem Component - Accessibility', () => {
  const mockTodo: Todo = {
    id: 1,
    title: 'Test Todo',
    description: 'Test Description',
    completed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('should have proper ARIA label for checkbox', () => {
    const wrapper = mount(TodoItem, {
      props: {
        todo: mockTodo,
      },
    });
    
    const checkbox = wrapper.find('input[type="checkbox"]');
    expect(checkbox.attributes('aria-label')).toBe(`Mark '${mockTodo.title}' as complete`);
  });

  it('should have proper ARIA label for completed todo checkbox', () => {
    const completedTodo: Todo = {
      ...mockTodo,
      completed: true,
    };
    
    const wrapper = mount(TodoItem, {
      props: {
        todo: completedTodo,
      },
    });
    
    const checkbox = wrapper.find('input[type="checkbox"]');
    expect(checkbox.attributes('aria-label')).toBe(`Mark '${completedTodo.title}' as incomplete`);
  });

  it('should have proper ARIA label for status', () => {
    const wrapper = mount(TodoItem, {
      props: {
        todo: mockTodo,
      },
    });
    
    const status = wrapper.find('.todo-status');
    expect(status.attributes('aria-label')).toBe('Status: Active');
  });

  it('should have proper ARIA label for edit button', () => {
    const wrapper = mount(TodoItem, {
      props: {
        todo: mockTodo,
      },
    });
    
    const editButton = wrapper.find('.btn-edit');
    expect(editButton.attributes('aria-label')).toBe(`Edit '${mockTodo.title}'`);
    expect(editButton.attributes('title')).toBe('Edit todo');
  });

  it('should have proper ARIA label for delete button', () => {
    const wrapper = mount(TodoItem, {
      props: {
        todo: mockTodo,
      },
    });
    
    const deleteButton = wrapper.find('.btn-delete');
    expect(deleteButton.attributes('aria-label')).toBe(`Delete '${mockTodo.title}'`);
    expect(deleteButton.attributes('title')).toBe('Delete todo');
  });

  it('should have proper label association for checkbox', () => {
    const wrapper = mount(TodoItem, {
      props: {
        todo: mockTodo,
      },
    });
    
    const checkbox = wrapper.find('input[type="checkbox"]');
    const label = wrapper.find('.checkbox-label');
    
    expect(checkbox.attributes('id')).toBe(`todo-checkbox-${mockTodo.id}`);
    expect(label.attributes('for')).toBe(`todo-checkbox-${mockTodo.id}`);
  });

  it('should have visually hidden text for screen readers', () => {
    const wrapper = mount(TodoItem, {
      props: {
        todo: mockTodo,
      },
    });
    
    const visuallyHidden = wrapper.find('.visually-hidden');
    expect(visuallyHidden.exists()).toBe(true);
    expect(visuallyHidden.text()).toBe('Not completed');
  });
});

describe('TodoItem Component - Edge Cases', () => {
  it('should handle very long titles', () => {
    const longTitle = 'a'.repeat(200);
    const todoWithLongTitle: Todo = {
      id: 1,
      title: longTitle,
      description: 'Description',
      completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const wrapper = mount(TodoItem, {
      props: {
        todo: todoWithLongTitle,
      },
    });
    
    const title = wrapper.find('.todo-title');
    expect(title.text()).toBe(longTitle);
  });

  it('should handle very long descriptions', () => {
    const longDescription = 'a'.repeat(1000);
    const todoWithLongDescription: Todo = {
      id: 1,
      title: 'Title',
      description: longDescription,
      completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const wrapper = mount(TodoItem, {
      props: {
        todo: todoWithLongDescription,
      },
    });
    
    const description = wrapper.find('.todo-description');
    expect(description.text()).toBe(longDescription);
  });

  it('should handle special characters in title', () => {
    const specialTitle = 'Test <script>alert("xss")</script> & "quotes"';
    const todoWithSpecialChars: Todo = {
      id: 1,
      title: specialTitle,
      description: 'Description',
      completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const wrapper = mount(TodoItem, {
      props: {
        todo: todoWithSpecialChars,
      },
    });
    
    const title = wrapper.find('.todo-title');
    expect(title.text()).toBe(specialTitle);
  });

  it('should handle special characters in description', () => {
    const specialDescription = 'Description with <html> & "quotes" and \'apostrophes\'';
    const todoWithSpecialChars: Todo = {
      id: 1,
      title: 'Title',
      description: specialDescription,
      completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const wrapper = mount(TodoItem, {
      props: {
        todo: todoWithSpecialChars,
      },
    });
    
    const description = wrapper.find('.todo-description');
    expect(description.text()).toBe(specialDescription);
  });

  it('should handle todos with large IDs', async () => {
    const todoWithLargeId: Todo = {
      id: 999999999,
      title: 'Test Todo',
      description: 'Description',
      completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const wrapper = mount(TodoItem, {
      props: {
        todo: todoWithLargeId,
      },
    });
    
    const checkbox = wrapper.find('input[type="checkbox"]');
    expect(checkbox.attributes('id')).toBe('todo-checkbox-999999999');
    
    await checkbox.trigger('change');
    expect(wrapper.emitted('toggle')?.[0]).toEqual([999999999]);
  });

  it('should handle rapid button clicks', async () => {
    const mockTodo: Todo = {
      id: 1,
      title: 'Test Todo',
      description: 'Description',
      completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const wrapper = mount(TodoItem, {
      props: {
        todo: mockTodo,
      },
    });
    
    const editButton = wrapper.find('.btn-edit');
    
    // Click multiple times rapidly
    await editButton.trigger('click');
    await editButton.trigger('click');
    await editButton.trigger('click');
    
    // Should emit for each click
    expect(wrapper.emitted('edit')?.length).toBe(3);
  });

  it('should handle todos with whitespace in title', () => {
    const todoWithWhitespace: Todo = {
      id: 1,
      title: '  Test Todo  ',
      description: 'Description',
      completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const wrapper = mount(TodoItem, {
      props: {
        todo: todoWithWhitespace,
      },
    });
    
    const title = wrapper.find('.todo-title');
    // Vue/HTML will trim whitespace in text content when rendered
    expect(title.text()).toBe('Test Todo');
  });
});

describe('TodoItem Component - Multiple Interactions', () => {
  const mockTodo: Todo = {
    id: 1,
    title: 'Test Todo',
    description: 'Test Description',
    completed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('should handle toggle and edit in sequence', async () => {
    const wrapper = mount(TodoItem, {
      props: {
        todo: mockTodo,
      },
    });
    
    await wrapper.find('input[type="checkbox"]').trigger('change');
    await wrapper.find('.btn-edit').trigger('click');
    
    expect(wrapper.emitted('toggle')).toBeTruthy();
    expect(wrapper.emitted('edit')).toBeTruthy();
  });

  it('should handle toggle and delete in sequence', async () => {
    const wrapper = mount(TodoItem, {
      props: {
        todo: mockTodo,
      },
    });
    
    await wrapper.find('input[type="checkbox"]').trigger('change');
    await wrapper.find('.btn-delete').trigger('click');
    
    expect(wrapper.emitted('toggle')).toBeTruthy();
    expect(wrapper.emitted('delete')).toBeTruthy();
  });

  it('should handle edit and delete in sequence', async () => {
    const wrapper = mount(TodoItem, {
      props: {
        todo: mockTodo,
      },
    });
    
    await wrapper.find('.btn-edit').trigger('click');
    await wrapper.find('.btn-delete').trigger('click');
    
    expect(wrapper.emitted('edit')).toBeTruthy();
    expect(wrapper.emitted('delete')).toBeTruthy();
  });
});
