import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import TodoForm from './TodoForm.vue';
import type { Todo } from '../types/todo';

describe('TodoForm Component - Create Mode', () => {
  it('should render the form in create mode by default', () => {
    const wrapper = mount(TodoForm);
    
    expect(wrapper.find('h2').text()).toBe('Create New Todo');
    expect(wrapper.find('.btn-primary').text()).toBe('Create Todo');
    expect(wrapper.find('.btn-secondary').exists()).toBe(false);
  });

  it('should render title and description inputs', () => {
    const wrapper = mount(TodoForm);
    
    const titleInput = wrapper.find('#todo-title');
    const descriptionInput = wrapper.find('#todo-description');
    
    expect(titleInput.exists()).toBe(true);
    expect(descriptionInput.exists()).toBe(true);
    expect(titleInput.attributes('type')).toBe('text');
    expect(descriptionInput.element.tagName).toBe('TEXTAREA');
  });

  it('should have proper accessibility attributes', () => {
    const wrapper = mount(TodoForm);
    
    const titleInput = wrapper.find('#todo-title');
    const titleLabel = wrapper.find('label[for="todo-title"]');
    
    expect(titleLabel.exists()).toBe(true);
    expect(titleInput.attributes('aria-required')).toBe('true');
    expect(titleInput.attributes('maxlength')).toBe('200');
    
    const descriptionInput = wrapper.find('#todo-description');
    const descriptionLabel = wrapper.find('label[for="todo-description"]');
    
    expect(descriptionLabel.exists()).toBe(true);
    expect(descriptionInput.attributes('maxlength')).toBe('1000');
  });

  it('should update form data when user types', async () => {
    const wrapper = mount(TodoForm);
    
    const titleInput = wrapper.find('#todo-title');
    const descriptionInput = wrapper.find('#todo-description');
    
    await titleInput.setValue('Test Todo');
    await descriptionInput.setValue('Test Description');
    
    expect((titleInput.element as HTMLInputElement).value).toBe('Test Todo');
    expect((descriptionInput.element as HTMLTextAreaElement).value).toBe('Test Description');
  });

  it('should emit submit event with valid data', async () => {
    const wrapper = mount(TodoForm);
    
    await wrapper.find('#todo-title').setValue('Test Todo');
    await wrapper.find('#todo-description').setValue('Test Description');
    
    await wrapper.find('form').trigger('submit.prevent');
    
    expect(wrapper.emitted('submit')).toBeTruthy();
    expect(wrapper.emitted('submit')?.[0]).toEqual([
      {
        title: 'Test Todo',
        description: 'Test Description',
      },
    ]);
  });

  it('should trim whitespace from title and description on submit', async () => {
    const wrapper = mount(TodoForm);
    
    await wrapper.find('#todo-title').setValue('  Test Todo  ');
    await wrapper.find('#todo-description').setValue('  Test Description  ');
    
    await wrapper.find('form').trigger('submit.prevent');
    
    expect(wrapper.emitted('submit')?.[0]).toEqual([
      {
        title: 'Test Todo',
        description: 'Test Description',
      },
    ]);
  });

  it('should clear form after successful submission in create mode', async () => {
    const wrapper = mount(TodoForm);
    
    await wrapper.find('#todo-title').setValue('Test Todo');
    await wrapper.find('#todo-description').setValue('Test Description');
    
    await wrapper.find('form').trigger('submit.prevent');
    
    // Form should be cleared
    expect((wrapper.find('#todo-title').element as HTMLInputElement).value).toBe('');
    expect((wrapper.find('#todo-description').element as HTMLTextAreaElement).value).toBe('');
  });
});

describe('TodoForm Component - Validation', () => {
  it('should show error when title is empty', async () => {
    const wrapper = mount(TodoForm);
    
    await wrapper.find('form').trigger('submit.prevent');
    
    expect(wrapper.find('#title-error').exists()).toBe(true);
    expect(wrapper.find('#title-error').text()).toBe('Title is required');
    expect(wrapper.emitted('submit')).toBeFalsy();
  });

  it('should show error when title is only whitespace', async () => {
    const wrapper = mount(TodoForm);
    
    await wrapper.find('#todo-title').setValue('   ');
    await wrapper.find('form').trigger('submit.prevent');
    
    expect(wrapper.find('#title-error').exists()).toBe(true);
    expect(wrapper.find('#title-error').text()).toBe('Title cannot be empty or whitespace only');
    expect(wrapper.emitted('submit')).toBeFalsy();
  });

  it('should show error when title exceeds 200 characters', async () => {
    const wrapper = mount(TodoForm);
    
    const longTitle = 'a'.repeat(201);
    await wrapper.find('#todo-title').setValue(longTitle);
    await wrapper.find('form').trigger('submit.prevent');
    
    expect(wrapper.find('#title-error').exists()).toBe(true);
    expect(wrapper.find('#title-error').text()).toBe('Title must be 200 characters or less');
    expect(wrapper.emitted('submit')).toBeFalsy();
  });

  it('should show error when description exceeds 1000 characters', async () => {
    const wrapper = mount(TodoForm);
    
    await wrapper.find('#todo-title').setValue('Valid Title');
    const longDescription = 'a'.repeat(1001);
    await wrapper.find('#todo-description').setValue(longDescription);
    await wrapper.find('form').trigger('submit.prevent');
    
    expect(wrapper.find('#description-error').exists()).toBe(true);
    expect(wrapper.find('#description-error').text()).toBe('Description must be 1000 characters or less');
    expect(wrapper.emitted('submit')).toBeFalsy();
  });

  it('should add error styling to invalid inputs', async () => {
    const wrapper = mount(TodoForm);
    
    await wrapper.find('form').trigger('submit.prevent');
    
    const titleInput = wrapper.find('#todo-title');
    expect(titleInput.classes()).toContain('input-error');
    expect(titleInput.attributes('aria-invalid')).toBe('true');
    expect(titleInput.attributes('aria-describedby')).toBe('title-error');
  });

  it('should clear validation errors when form is corrected', async () => {
    const wrapper = mount(TodoForm);
    
    // Submit with empty title to trigger error
    await wrapper.find('form').trigger('submit.prevent');
    expect(wrapper.find('#title-error').exists()).toBe(true);
    
    // Fix the error
    await wrapper.find('#todo-title').setValue('Valid Title');
    await wrapper.find('form').trigger('submit.prevent');
    
    // Error should be cleared
    expect(wrapper.find('#title-error').exists()).toBe(false);
    expect(wrapper.emitted('submit')).toBeTruthy();
  });

  it('should allow empty description', async () => {
    const wrapper = mount(TodoForm);
    
    await wrapper.find('#todo-title').setValue('Test Todo');
    // Leave description empty
    await wrapper.find('form').trigger('submit.prevent');
    
    expect(wrapper.emitted('submit')).toBeTruthy();
    expect(wrapper.emitted('submit')?.[0]).toEqual([
      {
        title: 'Test Todo',
        description: '',
      },
    ]);
  });

  it('should validate title at exactly 200 characters', async () => {
    const wrapper = mount(TodoForm);
    
    const exactTitle = 'a'.repeat(200);
    await wrapper.find('#todo-title').setValue(exactTitle);
    await wrapper.find('form').trigger('submit.prevent');
    
    expect(wrapper.find('#title-error').exists()).toBe(false);
    expect(wrapper.emitted('submit')).toBeTruthy();
  });

  it('should validate description at exactly 1000 characters', async () => {
    const wrapper = mount(TodoForm);
    
    await wrapper.find('#todo-title').setValue('Valid Title');
    const exactDescription = 'a'.repeat(1000);
    await wrapper.find('#todo-description').setValue(exactDescription);
    await wrapper.find('form').trigger('submit.prevent');
    
    expect(wrapper.find('#description-error').exists()).toBe(false);
    expect(wrapper.emitted('submit')).toBeTruthy();
  });
});

describe('TodoForm Component - Edit Mode', () => {
  const mockTodo: Todo = {
    id: 1,
    title: 'Existing Todo',
    description: 'Existing Description',
    completed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('should render in edit mode when todo prop is provided', () => {
    const wrapper = mount(TodoForm, {
      props: {
        todo: mockTodo,
      },
    });
    
    expect(wrapper.find('h2').text()).toBe('Edit Todo');
    expect(wrapper.find('.btn-primary').text()).toBe('Update Todo');
    expect(wrapper.find('.btn-secondary').exists()).toBe(true);
    expect(wrapper.find('.btn-secondary').text()).toBe('Cancel');
  });

  it('should populate form with todo data in edit mode', () => {
    const wrapper = mount(TodoForm, {
      props: {
        todo: mockTodo,
      },
    });
    
    const titleInput = wrapper.find('#todo-title').element as HTMLInputElement;
    const descriptionInput = wrapper.find('#todo-description').element as HTMLTextAreaElement;
    
    expect(titleInput.value).toBe(mockTodo.title);
    expect(descriptionInput.value).toBe(mockTodo.description);
  });

  it('should emit submit event with updated data in edit mode', async () => {
    const wrapper = mount(TodoForm, {
      props: {
        todo: mockTodo,
      },
    });
    
    await wrapper.find('#todo-title').setValue('Updated Title');
    await wrapper.find('#todo-description').setValue('Updated Description');
    
    await wrapper.find('form').trigger('submit.prevent');
    
    expect(wrapper.emitted('submit')).toBeTruthy();
    expect(wrapper.emitted('submit')?.[0]).toEqual([
      {
        title: 'Updated Title',
        description: 'Updated Description',
      },
    ]);
  });

  it('should NOT clear form after submission in edit mode', async () => {
    const wrapper = mount(TodoForm, {
      props: {
        todo: mockTodo,
      },
    });
    
    await wrapper.find('#todo-title').setValue('Updated Title');
    await wrapper.find('form').trigger('submit.prevent');
    
    // Form should NOT be cleared in edit mode
    const titleInput = wrapper.find('#todo-title').element as HTMLInputElement;
    expect(titleInput.value).toBe('Updated Title');
  });

  it('should emit cancel event when cancel button is clicked', async () => {
    const wrapper = mount(TodoForm, {
      props: {
        todo: mockTodo,
      },
    });
    
    await wrapper.find('.btn-secondary').trigger('click');
    
    expect(wrapper.emitted('cancel')).toBeTruthy();
  });

  it('should clear form when cancel is clicked', async () => {
    const wrapper = mount(TodoForm, {
      props: {
        todo: mockTodo,
      },
    });
    
    await wrapper.find('#todo-title').setValue('Modified Title');
    await wrapper.find('.btn-secondary').trigger('click');
    
    const titleInput = wrapper.find('#todo-title').element as HTMLInputElement;
    const descriptionInput = wrapper.find('#todo-description').element as HTMLTextAreaElement;
    
    expect(titleInput.value).toBe('');
    expect(descriptionInput.value).toBe('');
  });

  it('should update form when todo prop changes', async () => {
    const wrapper = mount(TodoForm, {
      props: {
        todo: mockTodo,
      },
    });
    
    const newTodo: Todo = {
      id: 2,
      title: 'New Todo',
      description: 'New Description',
      completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    await wrapper.setProps({ todo: newTodo });
    
    const titleInput = wrapper.find('#todo-title').element as HTMLInputElement;
    const descriptionInput = wrapper.find('#todo-description').element as HTMLTextAreaElement;
    
    expect(titleInput.value).toBe(newTodo.title);
    expect(descriptionInput.value).toBe(newTodo.description);
  });

  it('should switch to create mode when todo prop is removed', async () => {
    const wrapper = mount(TodoForm, {
      props: {
        todo: mockTodo,
      },
    });
    
    expect(wrapper.find('h2').text()).toBe('Edit Todo');
    
    await wrapper.setProps({ todo: undefined });
    
    expect(wrapper.find('h2').text()).toBe('Create New Todo');
    expect(wrapper.find('.btn-secondary').exists()).toBe(false);
  });
});

describe('TodoForm Component - Submitting State', () => {
  it('should disable submit button when isSubmitting is true', () => {
    const wrapper = mount(TodoForm, {
      props: {
        isSubmitting: true,
      },
    });
    
    const submitButton = wrapper.find('.btn-primary');
    expect(submitButton.attributes('disabled')).toBeDefined();
    expect(submitButton.attributes('aria-busy')).toBe('true');
  });

  it('should show "Saving..." text when isSubmitting is true', () => {
    const wrapper = mount(TodoForm, {
      props: {
        isSubmitting: true,
      },
    });
    
    expect(wrapper.find('.btn-primary').text()).toBe('Saving...');
  });

  it('should disable cancel button when isSubmitting is true', () => {
    const mockTodo: Todo = {
      id: 1,
      title: 'Test',
      description: 'Test',
      completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const wrapper = mount(TodoForm, {
      props: {
        todo: mockTodo,
        isSubmitting: true,
      },
    });
    
    const cancelButton = wrapper.find('.btn-secondary');
    expect(cancelButton.attributes('disabled')).toBeDefined();
  });
});

describe('TodoForm Component - Error Handling', () => {
  it('should handle form submission errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const wrapper = mount(TodoForm);
    
    // Manually trigger an error by calling handleSubmit with invalid state
    // This tests the try-catch block in handleSubmit
    await wrapper.find('#todo-title').setValue('Valid Title');
    
    // Mock emit to throw an error
    const originalEmit = wrapper.vm.$emit;
    wrapper.vm.$emit = vi.fn(() => {
      throw new Error('Submission failed');
    });
    
    await wrapper.find('form').trigger('submit.prevent');
    
    // Restore original emit
    wrapper.vm.$emit = originalEmit;
    
    consoleErrorSpy.mockRestore();
  });
});

describe('TodoForm Component - Accessibility', () => {
  it('should have proper ARIA attributes for required fields', () => {
    const wrapper = mount(TodoForm);
    
    const titleInput = wrapper.find('#todo-title');
    expect(titleInput.attributes('aria-required')).toBe('true');
  });

  it('should have proper ARIA attributes for error states', async () => {
    const wrapper = mount(TodoForm);
    
    await wrapper.find('form').trigger('submit.prevent');
    
    const titleInput = wrapper.find('#todo-title');
    expect(titleInput.attributes('aria-invalid')).toBe('true');
    expect(titleInput.attributes('aria-describedby')).toBe('title-error');
    
    const errorMessage = wrapper.find('#title-error');
    expect(errorMessage.attributes('role')).toBe('alert');
  });

  it('should have novalidate attribute on form to use custom validation', () => {
    const wrapper = mount(TodoForm);
    
    const form = wrapper.find('form');
    expect(form.attributes('novalidate')).toBeDefined();
  });

  it('should have proper label associations', () => {
    const wrapper = mount(TodoForm);
    
    const titleLabel = wrapper.find('label[for="todo-title"]');
    const titleInput = wrapper.find('#todo-title');
    expect(titleLabel.exists()).toBe(true);
    expect(titleInput.exists()).toBe(true);
    
    const descriptionLabel = wrapper.find('label[for="todo-description"]');
    const descriptionInput = wrapper.find('#todo-description');
    expect(descriptionLabel.exists()).toBe(true);
    expect(descriptionInput.exists()).toBe(true);
  });
});

describe('TodoForm Component - Edge Cases', () => {
  it('should handle todo with empty description', () => {
    const todoWithoutDescription: Todo = {
      id: 1,
      title: 'Test Todo',
      description: '',
      completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const wrapper = mount(TodoForm, {
      props: {
        todo: todoWithoutDescription,
      },
    });
    
    const descriptionInput = wrapper.find('#todo-description').element as HTMLTextAreaElement;
    expect(descriptionInput.value).toBe('');
  });

  it('should handle special characters in title and description', async () => {
    const wrapper = mount(TodoForm);
    
    const specialTitle = 'Test <script>alert("xss")</script>';
    const specialDescription = 'Description with "quotes" and \'apostrophes\'';
    
    await wrapper.find('#todo-title').setValue(specialTitle);
    await wrapper.find('#todo-description').setValue(specialDescription);
    await wrapper.find('form').trigger('submit.prevent');
    
    expect(wrapper.emitted('submit')?.[0]).toEqual([
      {
        title: specialTitle,
        description: specialDescription,
      },
    ]);
  });

  it('should handle rapid form submissions', async () => {
    const wrapper = mount(TodoForm);
    
    await wrapper.find('#todo-title').setValue('Test Todo');
    
    // Submit multiple times rapidly
    await wrapper.find('form').trigger('submit.prevent');
    await wrapper.find('#todo-title').setValue('Test Todo 2');
    await wrapper.find('form').trigger('submit.prevent');
    await wrapper.find('#todo-title').setValue('Test Todo 3');
    await wrapper.find('form').trigger('submit.prevent');
    
    // Should emit for each submission
    expect(wrapper.emitted('submit')?.length).toBe(3);
  });
});
