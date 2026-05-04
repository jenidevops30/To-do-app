import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref, computed } from 'vue';
import fc from 'fast-check';
import TodoList from './TodoList.vue';
import TodoForm from './TodoForm.vue';
import TodoFilter from './TodoFilter.vue';
import TodoItem from './TodoItem.vue';
import type { Todo } from '../types/todo';

// Mock the useTodos composable
vi.mock('../composables/useTodos', () => ({
  useTodos: vi.fn(),
}));

describe('TodoList Component', () => {
  let mockUseTodos: any;
  let todosRef: any;
  let loadingRef: any;
  let errorRef: any;
  let currentFilterRef: any;
  let activeCountRef: any;
  let completedCountRef: any;

  beforeEach(async () => {
    // Reset the mock before each test
    const { useTodos } = await import('../composables/useTodos');
    
    // Create reactive refs for the mock
    todosRef = ref<Todo[]>([]);
    loadingRef = ref(false);
    errorRef = ref<string | null>(null);
    currentFilterRef = ref('all');
    activeCountRef = ref(0);
    completedCountRef = ref(0);
    
    mockUseTodos = {
      todos: computed(() => todosRef.value),
      loading: loadingRef,
      error: errorRef,
      currentFilter: currentFilterRef,
      activeCount: activeCountRef,
      completedCount: completedCountRef,
      fetchTodos: vi.fn(),
      createTodo: vi.fn(),
      updateTodo: vi.fn(),
      deleteTodo: vi.fn(),
      setFilter: vi.fn(),
    };
    vi.mocked(useTodos).mockReturnValue(mockUseTodos);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render the component with header', () => {
    const wrapper = mount(TodoList);
    
    expect(wrapper.find('.todo-list-header h1').text()).toBe('My Todo List');
    expect(wrapper.find('.subtitle').text()).toBe('Organize your tasks efficiently');
  });

  it('should render TodoForm component', () => {
    const wrapper = mount(TodoList);
    
    expect(wrapper.findComponent(TodoForm).exists()).toBe(true);
  });

  it('should render TodoFilter component with correct props', () => {
    currentFilterRef.value = 'active';
    activeCountRef.value = 5;
    completedCountRef.value = 3;
    
    const wrapper = mount(TodoList);
    const filterComponent = wrapper.findComponent(TodoFilter);
    
    expect(filterComponent.exists()).toBe(true);
    expect(filterComponent.props('currentFilter')).toBe('active');
    expect(filterComponent.props('activeCount')).toBe(5);
    expect(filterComponent.props('completedCount')).toBe(3);
  });

  it('should display loading state when loading and no todos', () => {
    loadingRef.value = true;
    todosRef.value = [];
    
    const wrapper = mount(TodoList);
    
    expect(wrapper.find('.loading-state').exists()).toBe(true);
    expect(wrapper.find('.loading-state p').text()).toBe('Loading todos...');
  });

  it('should display empty state when no todos and not loading', () => {
    loadingRef.value = false;
    todosRef.value = [];
    currentFilterRef.value = 'all';
    
    const wrapper = mount(TodoList);
    
    expect(wrapper.find('.empty-state').exists()).toBe(true);
    expect(wrapper.find('.empty-state h2').text()).toBe('No todos yet');
    expect(wrapper.find('.empty-state p').text()).toContain('Create your first todo');
  });

  it('should display different empty state message for active filter', () => {
    loadingRef.value = false;
    todosRef.value = [];
    currentFilterRef.value = 'active';
    
    const wrapper = mount(TodoList);
    
    expect(wrapper.find('.empty-state').exists()).toBe(true);
    expect(wrapper.find('.empty-state p').text()).toContain('No active todos');
  });

  it('should display different empty state message for completed filter', () => {
    loadingRef.value = false;
    todosRef.value = [];
    currentFilterRef.value = 'completed';
    
    const wrapper = mount(TodoList);
    
    expect(wrapper.find('.empty-state').exists()).toBe(true);
    expect(wrapper.find('.empty-state p').text()).toContain('No completed todos');
  });

  it('should render TodoItem components for each todo', () => {
    const testTodos: Todo[] = [
      {
        id: 1,
        title: 'Test Todo 1',
        description: 'Description 1',
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 2,
        title: 'Test Todo 2',
        description: 'Description 2',
        completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    
    todosRef.value = testTodos;
    loadingRef.value = false;
    
    const wrapper = mount(TodoList);
    const todoItems = wrapper.findAllComponents(TodoItem);
    
    expect(todoItems).toHaveLength(2);
    expect(todoItems[0].props('todo')).toEqual(testTodos[0]);
    expect(todoItems[1].props('todo')).toEqual(testTodos[1]);
  });

  it('should display error banner when error exists', () => {
    errorRef.value = 'Failed to load todos';
    
    const wrapper = mount(TodoList);
    
    expect(wrapper.find('.error-banner').exists()).toBe(true);
    expect(wrapper.find('.error-text').text()).toBe('Failed to load todos');
  });

  it('should dismiss error when dismiss button is clicked', async () => {
    errorRef.value = 'Failed to load todos';
    
    const wrapper = mount(TodoList);
    
    expect(wrapper.find('.error-banner').exists()).toBe(true);
    
    await wrapper.find('.error-dismiss').trigger('click');
    
    expect(errorRef.value).toBeNull();
  });

  it('should call fetchTodos on mount', () => {
    mount(TodoList);
    
    expect(mockUseTodos.fetchTodos).toHaveBeenCalledTimes(1);
  });

  it('should call createTodo when form is submitted with new todo', async () => {
    mockUseTodos.createTodo.mockResolvedValue({
      id: 1,
      title: 'New Todo',
      description: 'New Description',
      completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    
    const wrapper = mount(TodoList);
    const form = wrapper.findComponent(TodoForm);
    
    await form.vm.$emit('submit', {
      title: 'New Todo',
      description: 'New Description',
    });
    
    expect(mockUseTodos.createTodo).toHaveBeenCalledWith({
      title: 'New Todo',
      description: 'New Description',
    });
  });

  it('should call updateTodo when TodoItem toggle is triggered', async () => {
    const testTodo: Todo = {
      id: 1,
      title: 'Test Todo',
      description: 'Description',
      completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    todosRef.value = [testTodo];
    mockUseTodos.updateTodo.mockResolvedValue({ ...testTodo, completed: true });
    
    const wrapper = mount(TodoList);
    const todoItem = wrapper.findComponent(TodoItem);
    
    await todoItem.vm.$emit('toggle', 1);
    
    expect(mockUseTodos.updateTodo).toHaveBeenCalledWith(1, { completed: true });
  });

  it('should set editingTodo when TodoItem edit is triggered', async () => {
    const testTodo: Todo = {
      id: 1,
      title: 'Test Todo',
      description: 'Description',
      completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    todosRef.value = [testTodo];
    
    const wrapper = mount(TodoList);
    const todoItem = wrapper.findComponent(TodoItem);
    
    // Mock window.scrollTo
    window.scrollTo = vi.fn();
    
    await todoItem.vm.$emit('edit', testTodo);
    
    // Verify the form receives the todo for editing
    const form = wrapper.findComponent(TodoForm);
    expect(form.props('todo')).toEqual(testTodo);
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('should call deleteTodo when TodoItem delete is confirmed', async () => {
    const testTodo: Todo = {
      id: 1,
      title: 'Test Todo',
      description: 'Description',
      completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    todosRef.value = [testTodo];
    mockUseTodos.deleteTodo.mockResolvedValue(undefined);
    
    // Mock window.confirm to return true
    window.confirm = vi.fn(() => true);
    
    const wrapper = mount(TodoList);
    const todoItem = wrapper.findComponent(TodoItem);
    
    await todoItem.vm.$emit('delete', 1);
    
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete "Test Todo"?');
    expect(mockUseTodos.deleteTodo).toHaveBeenCalledWith(1);
  });

  it('should not call deleteTodo when delete is cancelled', async () => {
    const testTodo: Todo = {
      id: 1,
      title: 'Test Todo',
      description: 'Description',
      completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    todosRef.value = [testTodo];
    
    // Mock window.confirm to return false
    window.confirm = vi.fn(() => false);
    
    const wrapper = mount(TodoList);
    const todoItem = wrapper.findComponent(TodoItem);
    
    await todoItem.vm.$emit('delete', 1);
    
    expect(window.confirm).toHaveBeenCalled();
    expect(mockUseTodos.deleteTodo).not.toHaveBeenCalled();
  });

  it('should call setFilter when TodoFilter emits filter-change', async () => {
    const wrapper = mount(TodoList);
    const filter = wrapper.findComponent(TodoFilter);
    
    await filter.vm.$emit('filter-change', 'active');
    
    expect(mockUseTodos.setFilter).toHaveBeenCalledWith('active');
  });

  it('should clear editingTodo when form cancel is triggered', async () => {
    const testTodo: Todo = {
      id: 1,
      title: 'Test Todo',
      description: 'Description',
      completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    todosRef.value = [testTodo];
    
    const wrapper = mount(TodoList);
    const todoItem = wrapper.findComponent(TodoItem);
    
    // Set editing mode
    await todoItem.vm.$emit('edit', testTodo);
    
    // Verify form has the todo
    let form = wrapper.findComponent(TodoForm);
    expect(form.props('todo')).toEqual(testTodo);
    
    // Cancel editing
    await form.vm.$emit('cancel');
    
    // Verify form no longer has the todo
    form = wrapper.findComponent(TodoForm);
    expect(form.props('todo')).toBeUndefined();
  });

  it('should display loading overlay when loading with existing todos', () => {
    const testTodo: Todo = {
      id: 1,
      title: 'Test Todo',
      description: 'Description',
      completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    todosRef.value = [testTodo];
    loadingRef.value = true;
    
    const wrapper = mount(TodoList);
    
    expect(wrapper.find('.loading-overlay').exists()).toBe(true);
    expect(wrapper.find('.todo-list').exists()).toBe(true);
  });

  it('should handle errors during todo operations gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    mockUseTodos.createTodo.mockRejectedValue(new Error('Network error'));
    
    const wrapper = mount(TodoList);
    const form = wrapper.findComponent(TodoForm);
    
    await form.vm.$emit('submit', {
      title: 'New Todo',
      description: 'Description',
    });
    
    // Wait for promise to resolve
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(consoleErrorSpy).toHaveBeenCalled();
    
    consoleErrorSpy.mockRestore();
  });
});

describe('Property 13: Todo Display Completeness', () => {
  let mockUseTodos: any;
  let todosRef: any;
  let loadingRef: any;
  let errorRef: any;
  let currentFilterRef: any;
  let activeCountRef: any;
  let completedCountRef: any;

  beforeEach(async () => {
    // Reset the mock before each test
    const { useTodos } = await import('../composables/useTodos');
    
    // Create reactive refs for the mock
    todosRef = ref<Todo[]>([]);
    loadingRef = ref(false);
    errorRef = ref<string | null>(null);
    currentFilterRef = ref('all');
    activeCountRef = ref(0);
    completedCountRef = ref(0);
    
    mockUseTodos = {
      todos: computed(() => todosRef.value),
      loading: loadingRef,
      error: errorRef,
      currentFilter: currentFilterRef,
      activeCount: activeCountRef,
      completedCount: completedCountRef,
      fetchTodos: vi.fn(),
      createTodo: vi.fn(),
      updateTodo: vi.fn(),
      deleteTodo: vi.fn(),
      setFilter: vi.fn(),
    };
    vi.mocked(useTodos).mockReturnValue(mockUseTodos);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should display title, description, and completion status for any todo', () => {
    // Feature: todo-list-app, Property 13: Todo Display Completeness
    // **Validates: Requirements 2.4**
    
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            description: fc.string({ maxLength: 1000 }),
            completed: fc.boolean(),
            created_at: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ts => new Date(ts).toISOString()),
            updated_at: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ts => new Date(ts).toISOString()),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (generatedTodos) => {
          // Set the todos in the mock
          todosRef.value = generatedTodos;
          loadingRef.value = false;
          
          // Mount the component
          const wrapper = mount(TodoList);
          
          // Get all TodoItem components
          const todoItems = wrapper.findAllComponents(TodoItem);
          
          // Verify we have the correct number of todo items
          expect(todoItems.length).toBe(generatedTodos.length);
          
          // For each todo, verify all required properties are displayed
          generatedTodos.forEach((todo, index) => {
            const todoItem = todoItems[index];
            const html = todoItem.html();
            
            // Verify title is displayed (HTML/Vue trims whitespace in text content)
            const titleElement = todoItem.find('.todo-title');
            expect(titleElement.exists()).toBe(true);
            expect(titleElement.text().trim()).toBe(todo.title.trim());
            
            // Verify description is displayed (if present)
            if (todo.description && todo.description.trim().length > 0) {
              const descriptionElement = todoItem.find('.todo-description');
              expect(descriptionElement.exists()).toBe(true);
              expect(descriptionElement.text().trim()).toBe(todo.description.trim());
            }
            
            // Verify completion status is displayed
            const statusElement = todoItem.find('.todo-status');
            expect(statusElement.exists()).toBe(true);
            const expectedStatus = todo.completed ? 'Completed' : 'Active';
            expect(statusElement.text()).toBe(expectedStatus);
            
            // Verify checkbox reflects completion status
            const checkbox = todoItem.find('input[type="checkbox"]');
            expect(checkbox.exists()).toBe(true);
            expect((checkbox.element as HTMLInputElement).checked).toBe(todo.completed);
            
            // Verify visual styling for completed todos
            if (todo.completed) {
              expect(todoItem.find('.todo-completed').exists()).toBe(true);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display todos with empty descriptions correctly', () => {
    // Feature: todo-list-app, Property 13: Todo Display Completeness (Edge Case)
    // **Validates: Requirements 2.4**
    
    const todosWithEmptyDescriptions: Todo[] = [
      {
        id: 1,
        title: 'Todo with empty description',
        description: '',
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 2,
        title: 'Todo with no description',
        description: '',
        completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    
    todosRef.value = todosWithEmptyDescriptions;
    loadingRef.value = false;
    
    const wrapper = mount(TodoList);
    const todoItems = wrapper.findAllComponents(TodoItem);
    
    expect(todoItems.length).toBe(2);
    
    todosWithEmptyDescriptions.forEach((todo, index) => {
      const todoItem = todoItems[index];
      
      // Title should be displayed
      const titleElement = todoItem.find('.todo-title');
      expect(titleElement.exists()).toBe(true);
      expect(titleElement.text()).toBe(todo.title);
      
      // Description should not be displayed when empty
      const descriptionElement = todoItem.find('.todo-description');
      expect(descriptionElement.exists()).toBe(false);
      
      // Status should still be displayed
      const statusElement = todoItem.find('.todo-status');
      expect(statusElement.exists()).toBe(true);
      expect(statusElement.text()).toBe(todo.completed ? 'Completed' : 'Active');
    });
  });

  it('should display todos with special characters correctly', () => {
    // Feature: todo-list-app, Property 13: Todo Display Completeness (Special Characters)
    // **Validates: Requirements 2.4**
    
    fc.assert(
      fc.property(
        fc.record({
          id: fc.integer({ min: 1, max: 10000 }),
          title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
          description: fc.string({ maxLength: 1000 }),
          completed: fc.boolean(),
          created_at: fc.constant(new Date().toISOString()),
          updated_at: fc.constant(new Date().toISOString()),
        }),
        (todo) => {
          todosRef.value = [todo];
          loadingRef.value = false;
          
          const wrapper = mount(TodoList);
          const todoItem = wrapper.findComponent(TodoItem);
          
          // Verify title is displayed (HTML/Vue trims whitespace in text content)
          const titleElement = todoItem.find('.todo-title');
          expect(titleElement.exists()).toBe(true);
          expect(titleElement.text().trim()).toBe(todo.title.trim());
          
          // Verify description is displayed (if present)
          if (todo.description && todo.description.trim().length > 0) {
            const descriptionElement = todoItem.find('.todo-description');
            expect(descriptionElement.exists()).toBe(true);
            expect(descriptionElement.text().trim()).toBe(todo.description.trim());
          }
          
          // Verify status is displayed
          const statusElement = todoItem.find('.todo-status');
          expect(statusElement.exists()).toBe(true);
          expect(statusElement.text()).toBe(todo.completed ? 'Completed' : 'Active');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display all required properties in a visible format', () => {
    // Feature: todo-list-app, Property 13: Todo Display Completeness (Visibility)
    // **Validates: Requirements 2.4**
    
    const testTodo: Todo = {
      id: 1,
      title: 'Test Todo',
      description: 'Test Description',
      completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    todosRef.value = [testTodo];
    loadingRef.value = false;
    
    const wrapper = mount(TodoList);
    const todoItem = wrapper.findComponent(TodoItem);
    
    // Verify all elements are present in the DOM
    expect(todoItem.find('.todo-title').exists()).toBe(true);
    expect(todoItem.find('.todo-description').exists()).toBe(true);
    expect(todoItem.find('.todo-status').exists()).toBe(true);
    expect(todoItem.find('input[type="checkbox"]').exists()).toBe(true);
    
    // Verify elements are not hidden (basic visibility check)
    const titleElement = todoItem.find('.todo-title').element as HTMLElement;
    const descriptionElement = todoItem.find('.todo-description').element as HTMLElement;
    const statusElement = todoItem.find('.todo-status').element as HTMLElement;
    
    // Elements should not have display: none or visibility: hidden
    expect(titleElement.style.display).not.toBe('none');
    expect(titleElement.style.visibility).not.toBe('hidden');
    expect(descriptionElement.style.display).not.toBe('none');
    expect(descriptionElement.style.visibility).not.toBe('hidden');
    expect(statusElement.style.display).not.toBe('none');
    expect(statusElement.style.visibility).not.toBe('hidden');
  });
});

describe('Property 17: Error Display', () => {
  let mockUseTodos: any;
  let todosRef: any;
  let loadingRef: any;
  let errorRef: any;
  let currentFilterRef: any;
  let activeCountRef: any;
  let completedCountRef: any;

  beforeEach(async () => {
    // Reset the mock before each test
    const { useTodos } = await import('../composables/useTodos');
    
    // Create reactive refs for the mock
    todosRef = ref<Todo[]>([]);
    loadingRef = ref(false);
    errorRef = ref<string | null>(null);
    currentFilterRef = ref('all');
    activeCountRef = ref(0);
    completedCountRef = ref(0);
    
    mockUseTodos = {
      todos: computed(() => todosRef.value),
      loading: loadingRef,
      error: errorRef,
      currentFilter: currentFilterRef,
      activeCount: activeCountRef,
      completedCount: completedCountRef,
      fetchTodos: vi.fn(),
      createTodo: vi.fn(),
      updateTodo: vi.fn(),
      deleteTodo: vi.fn(),
      setFilter: vi.fn(),
    };
    vi.mocked(useTodos).mockReturnValue(mockUseTodos);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should display user-friendly error message for any API error response', () => {
    // Feature: todo-list-app, Property 17: Error Display
    // **Validates: Requirements 9.2**
    
    // Arbitrary for generating error messages
    const errorMessageArbitrary = fc.oneof(
      // Common API error messages
      fc.constantFrom(
        'Failed to load todos',
        'Failed to create todo',
        'Failed to update todo',
        'Failed to delete todo',
        'Network error',
        'Server error',
        'Validation failed',
        'Todo not found',
        'Unable to connect to server',
        'Request timeout',
        'Internal server error'
      ),
      // HTTP status code based errors
      fc.integer({ min: 400, max: 599 }).map(code => `Error ${code}: ${getErrorMessageForCode(code)}`),
      // Generic error messages with details
      fc.record({
        operation: fc.constantFrom('create', 'update', 'delete', 'fetch'),
        reason: fc.constantFrom('network', 'validation', 'server', 'timeout', 'not found')
      }).map(({ operation, reason }) => `Failed to ${operation} todo: ${reason}`)
    );

    fc.assert(
      fc.property(
        errorMessageArbitrary,
        (errorMessage) => {
          // Set the error in the composable
          errorRef.value = errorMessage;
          
          // Mount the component
          const wrapper = mount(TodoList);
          
          // Verify error banner is displayed
          const errorBanner = wrapper.find('.error-banner');
          expect(errorBanner.exists()).toBe(true);
          
          // Verify error banner has proper ARIA attributes
          expect(errorBanner.attributes('role')).toBe('alert');
          expect(errorBanner.attributes('aria-live')).toBe('assertive');
          
          // Verify error message is displayed
          const errorText = wrapper.find('.error-text');
          expect(errorText.exists()).toBe(true);
          expect(errorText.text()).toBe(errorMessage);
          
          // Verify error icon is present
          const errorIcon = wrapper.find('.error-icon');
          expect(errorIcon.exists()).toBe(true);
          expect(errorIcon.attributes('aria-hidden')).toBe('true');
          
          // Verify dismiss button is present and accessible
          const dismissButton = wrapper.find('.error-dismiss');
          expect(dismissButton.exists()).toBe(true);
          expect(dismissButton.attributes('type')).toBe('button');
          expect(dismissButton.attributes('aria-label')).toBe('Dismiss error');
          
          // Verify error banner is visible (not hidden)
          const bannerElement = errorBanner.element as HTMLElement;
          expect(bannerElement.style.display).not.toBe('none');
          expect(bannerElement.style.visibility).not.toBe('hidden');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle different HTTP status code errors correctly', () => {
    // Feature: todo-list-app, Property 17: Error Display (HTTP Status Codes)
    // **Validates: Requirements 9.2**
    
    fc.assert(
      fc.property(
        fc.integer({ min: 400, max: 599 }),
        (statusCode) => {
          const errorMessage = `HTTP ${statusCode}: ${getErrorMessageForCode(statusCode)}`;
          errorRef.value = errorMessage;
          
          const wrapper = mount(TodoList);
          
          // Error should be displayed regardless of status code
          expect(wrapper.find('.error-banner').exists()).toBe(true);
          expect(wrapper.find('.error-text').text()).toBe(errorMessage);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle error messages with special characters', () => {
    // Feature: todo-list-app, Property 17: Error Display (Special Characters)
    // **Validates: Requirements 9.2**
    
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
        (errorMessage) => {
          errorRef.value = errorMessage;
          
          const wrapper = mount(TodoList);
          
          // Error should be displayed with special characters properly escaped
          expect(wrapper.find('.error-banner').exists()).toBe(true);
          // Vue trims whitespace in text content, so we compare trimmed values
          expect(wrapper.find('.error-text').text()).toBe(errorMessage.trim());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow dismissing error for any error message', async () => {
    // Feature: todo-list-app, Property 17: Error Display (Dismissal)
    // **Validates: Requirements 9.2**
    
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
        async (errorMessage) => {
          errorRef.value = errorMessage;
          
          const wrapper = mount(TodoList);
          
          // Verify error is displayed
          expect(wrapper.find('.error-banner').exists()).toBe(true);
          
          // Click dismiss button
          await wrapper.find('.error-dismiss').trigger('click');
          
          // Verify error is cleared
          expect(errorRef.value).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not display error banner when error is null or empty', () => {
    // Feature: todo-list-app, Property 17: Error Display (No Error State)
    // **Validates: Requirements 9.2**
    
    fc.assert(
      fc.property(
        fc.constantFrom(null, '', undefined),
        (noError) => {
          errorRef.value = noError as any;
          
          const wrapper = mount(TodoList);
          
          // Error banner should not be displayed
          expect(wrapper.find('.error-banner').exists()).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should display error alongside todos when both exist', () => {
    // Feature: todo-list-app, Property 17: Error Display (With Todos)
    // **Validates: Requirements 9.2**
    
    const todoArbitrary = fc.record({
      id: fc.integer({ min: 1, max: 10000 }),
      title: fc.string({ minLength: 1, maxLength: 200 }),
      description: fc.string({ maxLength: 1000 }),
      completed: fc.boolean(),
      created_at: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ts => new Date(ts).toISOString()),
      updated_at: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ts => new Date(ts).toISOString()),
    });

    fc.assert(
      fc.property(
        fc.array(todoArbitrary, { minLength: 1, maxLength: 10 }),
        fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
        (todos, errorMessage) => {
          todosRef.value = todos;
          errorRef.value = errorMessage;
          loadingRef.value = false;
          
          const wrapper = mount(TodoList);
          
          // Both error banner and todos should be displayed
          expect(wrapper.find('.error-banner').exists()).toBe(true);
          // Vue trims whitespace in text content
          expect(wrapper.find('.error-text').text()).toBe(errorMessage.trim());
          expect(wrapper.find('.todo-list').exists()).toBe(true);
          expect(wrapper.findAllComponents(TodoItem).length).toBe(todos.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain error display during loading state', () => {
    // Feature: todo-list-app, Property 17: Error Display (During Loading)
    // **Validates: Requirements 9.2**
    
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
        fc.boolean(),
        (errorMessage, isLoading) => {
          errorRef.value = errorMessage;
          loadingRef.value = isLoading;
          
          const wrapper = mount(TodoList);
          
          // Error should be displayed regardless of loading state
          expect(wrapper.find('.error-banner').exists()).toBe(true);
          // Vue trims whitespace in text content
          expect(wrapper.find('.error-text').text()).toBe(errorMessage.trim());
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Helper function to generate error messages for HTTP status codes
function getErrorMessageForCode(code: number): string {
  if (code >= 400 && code < 500) {
    const clientErrors: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      422: 'Validation Failed',
      429: 'Too Many Requests',
    };
    return clientErrors[code] || 'Client Error';
  } else if (code >= 500 && code < 600) {
    const serverErrors: Record<number, string> = {
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout',
    };
    return serverErrors[code] || 'Server Error';
  }
  return 'Unknown Error';
}

describe('Network Error Handling', () => {
  let mockUseTodos: any;
  let todosRef: any;
  let loadingRef: any;
  let errorRef: any;
  let currentFilterRef: any;
  let activeCountRef: any;
  let completedCountRef: any;

  beforeEach(async () => {
    // Reset the mock before each test
    const { useTodos } = await import('../composables/useTodos');
    
    // Create reactive refs for the mock
    todosRef = ref<Todo[]>([]);
    loadingRef = ref(false);
    errorRef = ref<string | null>(null);
    currentFilterRef = ref('all');
    activeCountRef = ref(0);
    completedCountRef = ref(0);
    
    mockUseTodos = {
      todos: computed(() => todosRef.value),
      loading: loadingRef,
      error: errorRef,
      currentFilter: currentFilterRef,
      activeCount: activeCountRef,
      completedCount: completedCountRef,
      fetchTodos: vi.fn(),
      createTodo: vi.fn(),
      updateTodo: vi.fn(),
      deleteTodo: vi.fn(),
      setFilter: vi.fn(),
    };
    vi.mocked(useTodos).mockReturnValue(mockUseTodos);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should display error message when fetchTodos fails with network error', async () => {
    // **Validates: Requirements 9.3**
    // Simulate network failure
    mockUseTodos.fetchTodos.mockImplementation(() => {
      errorRef.value = 'Failed to load todos';
      return Promise.reject(new Error('Network error'));
    });
    
    const wrapper = mount(TodoList);
    
    // Wait for fetchTodos to be called and fail
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Verify error banner is displayed
    expect(wrapper.find('.error-banner').exists()).toBe(true);
    expect(wrapper.find('.error-text').text()).toBe('Failed to load todos');
  });

  it('should display error message when createTodo fails with network error', async () => {
    // **Validates: Requirements 9.3**
    // Simulate network failure
    mockUseTodos.createTodo.mockImplementation(() => {
      errorRef.value = 'Failed to create todo';
      return Promise.reject(new Error('Network error'));
    });
    
    const wrapper = mount(TodoList);
    const form = wrapper.findComponent(TodoForm);
    
    // Attempt to create a todo
    await form.vm.$emit('submit', {
      title: 'New Todo',
      description: 'Description',
    });
    
    // Wait for promise to resolve
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Verify error banner is displayed
    expect(wrapper.find('.error-banner').exists()).toBe(true);
    expect(wrapper.find('.error-text').text()).toBe('Failed to create todo');
  });

  it('should display error message when updateTodo fails with network error', async () => {
    // **Validates: Requirements 9.3**
    const testTodo: Todo = {
      id: 1,
      title: 'Test Todo',
      description: 'Description',
      completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    todosRef.value = [testTodo];
    
    // Simulate network failure
    mockUseTodos.updateTodo.mockImplementation(() => {
      errorRef.value = 'Failed to update todo';
      return Promise.reject(new Error('Network error'));
    });
    
    const wrapper = mount(TodoList);
    const todoItem = wrapper.findComponent(TodoItem);
    
    // Attempt to toggle todo
    await todoItem.vm.$emit('toggle', 1);
    
    // Wait for promise to resolve
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Verify error banner is displayed
    expect(wrapper.find('.error-banner').exists()).toBe(true);
    expect(wrapper.find('.error-text').text()).toBe('Failed to update todo');
  });

  it('should display error message when deleteTodo fails with network error', async () => {
    // **Validates: Requirements 9.3**
    const testTodo: Todo = {
      id: 1,
      title: 'Test Todo',
      description: 'Description',
      completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    todosRef.value = [testTodo];
    
    // Simulate network failure
    mockUseTodos.deleteTodo.mockImplementation(() => {
      errorRef.value = 'Failed to delete todo';
      return Promise.reject(new Error('Network error'));
    });
    
    // Mock window.confirm to return true
    window.confirm = vi.fn(() => true);
    
    const wrapper = mount(TodoList);
    const todoItem = wrapper.findComponent(TodoItem);
    
    // Attempt to delete todo
    await todoItem.vm.$emit('delete', 1);
    
    // Wait for promise to resolve
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Verify error banner is displayed
    expect(wrapper.find('.error-banner').exists()).toBe(true);
    expect(wrapper.find('.error-text').text()).toBe('Failed to delete todo');
  });

  it('should display user-friendly error message for connection timeout', async () => {
    // **Validates: Requirements 9.3**
    mockUseTodos.fetchTodos.mockImplementation(() => {
      errorRef.value = 'Failed to load todos';
      return Promise.reject(new Error('timeout of 5000ms exceeded'));
    });
    
    const wrapper = mount(TodoList);
    
    // Wait for fetchTodos to be called and fail
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Verify error banner is displayed with user-friendly message
    expect(wrapper.find('.error-banner').exists()).toBe(true);
    expect(wrapper.find('.error-text').text()).toBe('Failed to load todos');
  });

  it('should display user-friendly error message for connection refused', async () => {
    // **Validates: Requirements 9.3**
    mockUseTodos.createTodo.mockImplementation(() => {
      errorRef.value = 'Failed to create todo';
      return Promise.reject(new Error('connect ECONNREFUSED'));
    });
    
    const wrapper = mount(TodoList);
    const form = wrapper.findComponent(TodoForm);
    
    await form.vm.$emit('submit', {
      title: 'New Todo',
      description: 'Description',
    });
    
    // Wait for promise to resolve
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Verify error banner is displayed
    expect(wrapper.find('.error-banner').exists()).toBe(true);
    expect(wrapper.find('.error-text').text()).toBe('Failed to create todo');
  });

  it('should display user-friendly error message for DNS resolution failure', async () => {
    // **Validates: Requirements 9.3**
    mockUseTodos.fetchTodos.mockImplementation(() => {
      errorRef.value = 'Failed to load todos';
      return Promise.reject(new Error('getaddrinfo ENOTFOUND'));
    });
    
    const wrapper = mount(TodoList);
    
    // Wait for fetchTodos to be called and fail
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Verify error banner is displayed
    expect(wrapper.find('.error-banner').exists()).toBe(true);
    expect(wrapper.find('.error-text').text()).toBe('Failed to load todos');
  });

  it('should allow user to dismiss network error message', async () => {
    // **Validates: Requirements 9.3**
    mockUseTodos.fetchTodos.mockImplementation(() => {
      errorRef.value = 'Failed to load todos';
      return Promise.reject(new Error('Network error'));
    });
    
    const wrapper = mount(TodoList);
    
    // Wait for fetchTodos to be called and fail
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Verify error is displayed
    expect(wrapper.find('.error-banner').exists()).toBe(true);
    
    // Dismiss the error
    await wrapper.find('.error-dismiss').trigger('click');
    
    // Verify error is cleared
    expect(errorRef.value).toBeNull();
  });

  it('should display error message when network fails during edit operation', async () => {
    // **Validates: Requirements 9.3**
    const testTodo: Todo = {
      id: 1,
      title: 'Test Todo',
      description: 'Description',
      completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    todosRef.value = [testTodo];
    
    // Simulate network failure
    mockUseTodos.updateTodo.mockImplementation(() => {
      errorRef.value = 'Failed to update todo';
      return Promise.reject(new Error('Network error'));
    });
    
    const wrapper = mount(TodoList);
    const todoItem = wrapper.findComponent(TodoItem);
    
    // Start editing
    await todoItem.vm.$emit('edit', testTodo);
    
    // Submit the edit
    const form = wrapper.findComponent(TodoForm);
    await form.vm.$emit('submit', {
      title: 'Updated Title',
      description: 'Updated Description',
    });
    
    // Wait for promise to resolve
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Verify error banner is displayed
    expect(wrapper.find('.error-banner').exists()).toBe(true);
    expect(wrapper.find('.error-text').text()).toBe('Failed to update todo');
  });

  it('should maintain todo list state when network error occurs', async () => {
    // **Validates: Requirements 9.3**
    const existingTodos: Todo[] = [
      {
        id: 1,
        title: 'Existing Todo 1',
        description: 'Description 1',
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 2,
        title: 'Existing Todo 2',
        description: 'Description 2',
        completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    
    todosRef.value = existingTodos;
    
    // Simulate network failure on create
    mockUseTodos.createTodo.mockImplementation(() => {
      errorRef.value = 'Failed to create todo';
      return Promise.reject(new Error('Network error'));
    });
    
    const wrapper = mount(TodoList);
    const form = wrapper.findComponent(TodoForm);
    
    // Attempt to create a new todo
    await form.vm.$emit('submit', {
      title: 'New Todo',
      description: 'Description',
    });
    
    // Wait for promise to resolve
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Verify existing todos are still displayed
    const todoItems = wrapper.findAllComponents(TodoItem);
    expect(todoItems.length).toBe(2);
    
    // Verify error is displayed
    expect(wrapper.find('.error-banner').exists()).toBe(true);
  });

  it('should display error with proper accessibility attributes', async () => {
    // **Validates: Requirements 9.3**
    mockUseTodos.fetchTodos.mockImplementation(() => {
      errorRef.value = 'Failed to load todos';
      return Promise.reject(new Error('Network error'));
    });
    
    const wrapper = mount(TodoList);
    
    // Wait for fetchTodos to be called and fail
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Verify error banner has proper ARIA attributes
    const errorBanner = wrapper.find('.error-banner');
    expect(errorBanner.exists()).toBe(true);
    expect(errorBanner.attributes('role')).toBe('alert');
    expect(errorBanner.attributes('aria-live')).toBe('assertive');
    
    // Verify error text is present
    expect(wrapper.find('.error-text').text()).toBe('Failed to load todos');
  });

  it('should handle multiple consecutive network errors', async () => {
    // **Validates: Requirements 9.3**
    const testTodo: Todo = {
      id: 1,
      title: 'Test Todo',
      description: 'Description',
      completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    todosRef.value = [testTodo];
    
    // First error: create fails
    mockUseTodos.createTodo.mockImplementation(() => {
      errorRef.value = 'Failed to create todo';
      return Promise.reject(new Error('Network error'));
    });
    
    const wrapper = mount(TodoList);
    const form = wrapper.findComponent(TodoForm);
    
    // Attempt to create
    await form.vm.$emit('submit', {
      title: 'New Todo',
      description: 'Description',
    });
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(wrapper.find('.error-text').text()).toBe('Failed to create todo');
    
    // Clear error
    await wrapper.find('.error-dismiss').trigger('click');
    expect(errorRef.value).toBeNull();
    
    // Second error: update fails
    mockUseTodos.updateTodo.mockImplementation(() => {
      errorRef.value = 'Failed to update todo';
      return Promise.reject(new Error('Network error'));
    });
    
    const todoItem = wrapper.findComponent(TodoItem);
    await todoItem.vm.$emit('toggle', 1);
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(wrapper.find('.error-text').text()).toBe('Failed to update todo');
  });

  it('should clear previous error when new operation succeeds', async () => {
    // **Validates: Requirements 9.3**
    // Start with an error
    errorRef.value = 'Failed to load todos';
    
    const wrapper = mount(TodoList);
    
    // Verify error is displayed
    expect(wrapper.find('.error-banner').exists()).toBe(true);
    
    // Simulate successful create operation
    mockUseTodos.createTodo.mockImplementation(() => {
      errorRef.value = null;
      const newTodo: Todo = {
        id: 1,
        title: 'New Todo',
        description: 'Description',
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      todosRef.value.push(newTodo);
      return Promise.resolve(newTodo);
    });
    
    const form = wrapper.findComponent(TodoForm);
    await form.vm.$emit('submit', {
      title: 'New Todo',
      description: 'Description',
    });
    
    // Wait for promise to resolve
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Verify error is cleared
    expect(wrapper.find('.error-banner').exists()).toBe(false);
  });
});
