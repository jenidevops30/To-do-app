import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fc from 'fast-check';
import type { Todo } from '../types/todo';

// Arbitrary for generating Todo objects
const todoArbitrary = fc.record({
  id: fc.integer({ min: 1, max: 10000 }),
  title: fc.string({ minLength: 1, maxLength: 200 }),
  description: fc.string({ maxLength: 1000 }),
  completed: fc.boolean(),
  created_at: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ts => new Date(ts).toISOString()),
  updated_at: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ts => new Date(ts).toISOString()),
});

describe('Property 14: Filter Correctness', () => {
  let useTodos: any;
  let apiClient: any;

  beforeEach(async () => {
    // Reset modules to get fresh state
    vi.resetModules();
    
    // Mock the API client before importing useTodos
    vi.doMock('../services/api', () => ({
      apiClient: {
        getAllTodos: vi.fn(),
        createTodo: vi.fn(),
        updateTodo: vi.fn(),
        deleteTodo: vi.fn(),
      },
    }));
    
    // Import after mocking
    const todosModule = await import('./useTodos');
    useTodos = todosModule.useTodos;
    
    const apiModule = await import('../services/api');
    apiClient = apiModule.apiClient;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should correctly filter todos by status', async () => {
    // Feature: todo-list-app, Property 14: Filter Correctness
    // **Validates: Requirements 6.1, 6.2, 6.3**
    
    await fc.assert(
      fc.asyncProperty(
        fc.array(todoArbitrary, { minLength: 0, maxLength: 50 }),
        async (generatedTodos) => {
          // Reset modules for each property test iteration
          vi.resetModules();
          
          // Re-mock the API
          vi.doMock('../services/api', () => ({
            apiClient: {
              getAllTodos: vi.fn().mockResolvedValue(generatedTodos),
              createTodo: vi.fn(),
              updateTodo: vi.fn(),
              deleteTodo: vi.fn(),
            },
          }));
          
          // Import fresh module
          const { useTodos } = await import('./useTodos');
          const { todos, setFilter, currentFilter, fetchTodos } = useTodos();
          
          // Fetch todos to populate the state
          await fetchTodos();
          
          // Test "all" filter - should display all todos
          setFilter('all');
          expect(currentFilter.value).toBe('all');
          const allTodos = todos.value;
          expect(allTodos.length).toBe(generatedTodos.length);
          
          // Test "active" filter - should display only incomplete todos
          setFilter('active');
          expect(currentFilter.value).toBe('active');
          const activeTodos = todos.value;
          const expectedActive = generatedTodos.filter(todo => !todo.completed);
          expect(activeTodos.length).toBe(expectedActive.length);
          
          // Verify all returned todos are indeed not completed
          activeTodos.forEach(todo => {
            expect(todo.completed).toBe(false);
          });
          
          // Test "completed" filter - should display only completed todos
          setFilter('completed');
          expect(currentFilter.value).toBe('completed');
          const completedTodos = todos.value;
          const expectedCompleted = generatedTodos.filter(todo => todo.completed);
          expect(completedTodos.length).toBe(expectedCompleted.length);
          
          // Verify all returned todos are indeed completed
          completedTodos.forEach(todo => {
            expect(todo.completed).toBe(true);
          });
          
          // Verify that the sum of active and completed equals all
          expect(activeTodos.length + completedTodos.length).toBe(allTodos.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle edge cases correctly', async () => {
    // Feature: todo-list-app, Property 14: Filter Correctness (Edge Cases)
    // **Validates: Requirements 6.1, 6.2, 6.3**
    
    // Test with empty array
    vi.resetModules();
    vi.doMock('../services/api', () => ({
      apiClient: {
        getAllTodos: vi.fn().mockResolvedValue([]),
        createTodo: vi.fn(),
        updateTodo: vi.fn(),
        deleteTodo: vi.fn(),
      },
    }));
    
    let module = await import('./useTodos');
    let { todos, setFilter, fetchTodos } = module.useTodos();
    
    await fetchTodos();
    
    setFilter('all');
    expect(todos.value).toEqual([]);
    
    setFilter('active');
    expect(todos.value).toEqual([]);
    
    setFilter('completed');
    expect(todos.value).toEqual([]);
    
    // Test with all completed todos
    const allCompleted: Todo[] = [
      {
        id: 1,
        title: 'Test 1',
        description: 'Desc 1',
        completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 2,
        title: 'Test 2',
        description: 'Desc 2',
        completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    
    vi.resetModules();
    vi.doMock('../services/api', () => ({
      apiClient: {
        getAllTodos: vi.fn().mockResolvedValue(allCompleted),
        createTodo: vi.fn(),
        updateTodo: vi.fn(),
        deleteTodo: vi.fn(),
      },
    }));
    
    module = await import('./useTodos');
    ({ todos, setFilter, fetchTodos } = module.useTodos());
    
    await fetchTodos();
    
    setFilter('active');
    expect(todos.value).toEqual([]);
    
    setFilter('completed');
    expect(todos.value.length).toBe(2);
    
    // Test with all active todos
    const allActive: Todo[] = [
      {
        id: 3,
        title: 'Test 3',
        description: 'Desc 3',
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 4,
        title: 'Test 4',
        description: 'Desc 4',
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    
    vi.resetModules();
    vi.doMock('../services/api', () => ({
      apiClient: {
        getAllTodos: vi.fn().mockResolvedValue(allActive),
        createTodo: vi.fn(),
        updateTodo: vi.fn(),
        deleteTodo: vi.fn(),
      },
    }));
    
    module = await import('./useTodos');
    ({ todos, setFilter, fetchTodos } = module.useTodos());
    
    await fetchTodos();
    
    setFilter('completed');
    expect(todos.value).toEqual([]);
    
    setFilter('active');
    expect(todos.value.length).toBe(2);
  });
});

describe('Property 16: Filter Persistence Across Updates', () => {
  let useTodos: any;
  let apiClient: any;

  beforeEach(async () => {
    // Reset modules to get fresh state
    vi.resetModules();
    
    // Mock the API client before importing useTodos
    vi.doMock('../services/api', () => ({
      apiClient: {
        getAllTodos: vi.fn(),
        createTodo: vi.fn(),
        updateTodo: vi.fn(),
        deleteTodo: vi.fn(),
      },
    }));
    
    // Import after mocking
    const todosModule = await import('./useTodos');
    useTodos = todosModule.useTodos;
    
    const apiModule = await import('../services/api');
    apiClient = apiModule.apiClient;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should maintain active filter when todos are created', async () => {
    // Feature: todo-list-app, Property 16: Filter Persistence Across Updates
    // **Validates: Requirements 6.5**
    
    await fc.assert(
      fc.asyncProperty(
        fc.array(todoArbitrary, { minLength: 1, maxLength: 20 }),
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 200 }),
          description: fc.string({ maxLength: 1000 }),
        }),
        async (initialTodos, newTodoData) => {
          // Reset modules for each property test iteration
          vi.resetModules();
          
          // Create a new todo that will be returned by createTodo
          const newTodo: Todo = {
            id: Math.max(...initialTodos.map(t => t.id), 0) + 1,
            title: newTodoData.title,
            description: newTodoData.description,
            completed: false, // New todos are always incomplete
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          // Re-mock the API
          vi.doMock('../services/api', () => ({
            apiClient: {
              getAllTodos: vi.fn().mockResolvedValue(initialTodos),
              createTodo: vi.fn().mockResolvedValue(newTodo),
              updateTodo: vi.fn(),
              deleteTodo: vi.fn(),
            },
          }));
          
          // Import fresh module
          const { useTodos } = await import('./useTodos');
          const { todos, setFilter, currentFilter, fetchTodos, createTodo } = useTodos();
          
          // Fetch initial todos
          await fetchTodos();
          
          // Set filter to "active" (incomplete todos only)
          setFilter('active');
          expect(currentFilter.value).toBe('active');
          
          // Count active todos before creation
          const activeBeforeCreate = initialTodos.filter(t => !t.completed).length;
          expect(todos.value.length).toBe(activeBeforeCreate);
          
          // Create a new todo (which is incomplete by default)
          await createTodo(newTodoData);
          
          // Verify filter is still "active"
          expect(currentFilter.value).toBe('active');
          
          // Verify the new todo appears in the filtered list (since it's incomplete)
          expect(todos.value.length).toBe(activeBeforeCreate + 1);
          
          // Verify all displayed todos are incomplete
          todos.value.forEach((todo: Todo) => {
            expect(todo.completed).toBe(false);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain completed filter when todos are created', async () => {
    // Feature: todo-list-app, Property 16: Filter Persistence Across Updates
    // **Validates: Requirements 6.5**
    
    await fc.assert(
      fc.asyncProperty(
        fc.array(todoArbitrary, { minLength: 1, maxLength: 20 }),
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 200 }),
          description: fc.string({ maxLength: 1000 }),
        }),
        async (initialTodos, newTodoData) => {
          // Reset modules for each property test iteration
          vi.resetModules();
          
          // Create a new todo that will be returned by createTodo
          const newTodo: Todo = {
            id: Math.max(...initialTodos.map(t => t.id), 0) + 1,
            title: newTodoData.title,
            description: newTodoData.description,
            completed: false, // New todos are always incomplete
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          // Re-mock the API
          vi.doMock('../services/api', () => ({
            apiClient: {
              getAllTodos: vi.fn().mockResolvedValue(initialTodos),
              createTodo: vi.fn().mockResolvedValue(newTodo),
              updateTodo: vi.fn(),
              deleteTodo: vi.fn(),
            },
          }));
          
          // Import fresh module
          const { useTodos } = await import('./useTodos');
          const { todos, setFilter, currentFilter, fetchTodos, createTodo } = useTodos();
          
          // Fetch initial todos
          await fetchTodos();
          
          // Set filter to "completed"
          setFilter('completed');
          expect(currentFilter.value).toBe('completed');
          
          // Count completed todos before creation
          const completedBeforeCreate = initialTodos.filter(t => t.completed).length;
          expect(todos.value.length).toBe(completedBeforeCreate);
          
          // Create a new todo (which is incomplete by default)
          await createTodo(newTodoData);
          
          // Verify filter is still "completed"
          expect(currentFilter.value).toBe('completed');
          
          // Verify the new todo does NOT appear in the filtered list (since it's incomplete)
          expect(todos.value.length).toBe(completedBeforeCreate);
          
          // Verify all displayed todos are completed
          todos.value.forEach((todo: Todo) => {
            expect(todo.completed).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain active filter when todo is marked complete', async () => {
    // Feature: todo-list-app, Property 16: Filter Persistence Across Updates
    // **Validates: Requirements 6.5**
    
    await fc.assert(
      fc.asyncProperty(
        fc.array(todoArbitrary, { minLength: 2, maxLength: 20 }),
        async (initialTodos) => {
          // Ensure we have at least one incomplete todo to update
          const incompleteTodos = initialTodos.filter(t => !t.completed);
          if (incompleteTodos.length === 0) {
            return; // Skip this iteration if no incomplete todos
          }
          
          // Reset modules for each property test iteration
          vi.resetModules();
          
          // Pick a random incomplete todo to mark as complete
          const todoToUpdate = incompleteTodos[Math.floor(Math.random() * incompleteTodos.length)];
          const updatedTodo: Todo = {
            ...todoToUpdate,
            completed: true,
            updated_at: new Date().toISOString(),
          };
          
          // Re-mock the API
          vi.doMock('../services/api', () => ({
            apiClient: {
              getAllTodos: vi.fn().mockResolvedValue(initialTodos),
              createTodo: vi.fn(),
              updateTodo: vi.fn().mockResolvedValue(updatedTodo),
              deleteTodo: vi.fn(),
            },
          }));
          
          // Import fresh module
          const { useTodos } = await import('./useTodos');
          const { todos, setFilter, currentFilter, fetchTodos, updateTodo } = useTodos();
          
          // Fetch initial todos
          await fetchTodos();
          
          // Set filter to "active" (incomplete todos only)
          setFilter('active');
          expect(currentFilter.value).toBe('active');
          
          // Count active todos before update
          const activeBeforeUpdate = initialTodos.filter(t => !t.completed).length;
          expect(todos.value.length).toBe(activeBeforeUpdate);
          
          // Mark the todo as complete
          await updateTodo(todoToUpdate.id, { completed: true });
          
          // Verify filter is still "active"
          expect(currentFilter.value).toBe('active');
          
          // Verify the updated todo disappears from the active list
          expect(todos.value.length).toBe(activeBeforeUpdate - 1);
          
          // Verify all displayed todos are incomplete
          todos.value.forEach((todo: Todo) => {
            expect(todo.completed).toBe(false);
          });
          
          // Verify the updated todo is not in the list
          const updatedTodoInList = todos.value.find((t: Todo) => t.id === todoToUpdate.id);
          expect(updatedTodoInList).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain completed filter when todo is marked incomplete', async () => {
    // Feature: todo-list-app, Property 16: Filter Persistence Across Updates
    // **Validates: Requirements 6.5**
    
    await fc.assert(
      fc.asyncProperty(
        fc.array(todoArbitrary, { minLength: 2, maxLength: 20 }),
        async (initialTodos) => {
          // Ensure we have at least one complete todo to update
          const completeTodos = initialTodos.filter(t => t.completed);
          if (completeTodos.length === 0) {
            return; // Skip this iteration if no complete todos
          }
          
          // Reset modules for each property test iteration
          vi.resetModules();
          
          // Pick a random complete todo to mark as incomplete
          const todoToUpdate = completeTodos[Math.floor(Math.random() * completeTodos.length)];
          const updatedTodo: Todo = {
            ...todoToUpdate,
            completed: false,
            updated_at: new Date().toISOString(),
          };
          
          // Re-mock the API
          vi.doMock('../services/api', () => ({
            apiClient: {
              getAllTodos: vi.fn().mockResolvedValue(initialTodos),
              createTodo: vi.fn(),
              updateTodo: vi.fn().mockResolvedValue(updatedTodo),
              deleteTodo: vi.fn(),
            },
          }));
          
          // Import fresh module
          const { useTodos } = await import('./useTodos');
          const { todos, setFilter, currentFilter, fetchTodos, updateTodo } = useTodos();
          
          // Fetch initial todos
          await fetchTodos();
          
          // Set filter to "completed"
          setFilter('completed');
          expect(currentFilter.value).toBe('completed');
          
          // Count completed todos before update
          const completedBeforeUpdate = initialTodos.filter(t => t.completed).length;
          expect(todos.value.length).toBe(completedBeforeUpdate);
          
          // Mark the todo as incomplete
          await updateTodo(todoToUpdate.id, { completed: false });
          
          // Verify filter is still "completed"
          expect(currentFilter.value).toBe('completed');
          
          // Verify the updated todo disappears from the completed list
          expect(todos.value.length).toBe(completedBeforeUpdate - 1);
          
          // Verify all displayed todos are completed
          todos.value.forEach((todo: Todo) => {
            expect(todo.completed).toBe(true);
          });
          
          // Verify the updated todo is not in the list
          const updatedTodoInList = todos.value.find((t: Todo) => t.id === todoToUpdate.id);
          expect(updatedTodoInList).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain active filter when active todo is deleted', async () => {
    // Feature: todo-list-app, Property 16: Filter Persistence Across Updates
    // **Validates: Requirements 6.5**
    
    await fc.assert(
      fc.asyncProperty(
        fc.array(todoArbitrary, { minLength: 2, maxLength: 20 }),
        async (initialTodos) => {
          // Ensure we have at least one incomplete todo to delete
          const incompleteTodos = initialTodos.filter(t => !t.completed);
          if (incompleteTodos.length === 0) {
            return; // Skip this iteration if no incomplete todos
          }
          
          // Reset modules for each property test iteration
          vi.resetModules();
          
          // Pick a random incomplete todo to delete
          const todoToDelete = incompleteTodos[Math.floor(Math.random() * incompleteTodos.length)];
          
          // Re-mock the API
          vi.doMock('../services/api', () => ({
            apiClient: {
              getAllTodos: vi.fn().mockResolvedValue(initialTodos),
              createTodo: vi.fn(),
              updateTodo: vi.fn(),
              deleteTodo: vi.fn().mockResolvedValue(undefined),
            },
          }));
          
          // Import fresh module
          const { useTodos } = await import('./useTodos');
          const { todos, setFilter, currentFilter, fetchTodos, deleteTodo } = useTodos();
          
          // Fetch initial todos
          await fetchTodos();
          
          // Set filter to "active" (incomplete todos only)
          setFilter('active');
          expect(currentFilter.value).toBe('active');
          
          // Count active todos before deletion
          const activeBeforeDelete = initialTodos.filter(t => !t.completed).length;
          expect(todos.value.length).toBe(activeBeforeDelete);
          
          // Delete the todo
          await deleteTodo(todoToDelete.id);
          
          // Verify filter is still "active"
          expect(currentFilter.value).toBe('active');
          
          // Verify the deleted todo is removed from the active list
          expect(todos.value.length).toBe(activeBeforeDelete - 1);
          
          // Verify all displayed todos are incomplete
          todos.value.forEach((todo: Todo) => {
            expect(todo.completed).toBe(false);
          });
          
          // Verify the deleted todo is not in the list
          const deletedTodoInList = todos.value.find((t: Todo) => t.id === todoToDelete.id);
          expect(deletedTodoInList).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain completed filter when completed todo is deleted', async () => {
    // Feature: todo-list-app, Property 16: Filter Persistence Across Updates
    // **Validates: Requirements 6.5**
    
    await fc.assert(
      fc.asyncProperty(
        fc.array(todoArbitrary, { minLength: 2, maxLength: 20 }),
        async (initialTodos) => {
          // Ensure we have at least one complete todo to delete
          const completeTodos = initialTodos.filter(t => t.completed);
          if (completeTodos.length === 0) {
            return; // Skip this iteration if no complete todos
          }
          
          // Reset modules for each property test iteration
          vi.resetModules();
          
          // Pick a random complete todo to delete
          const todoToDelete = completeTodos[Math.floor(Math.random() * completeTodos.length)];
          
          // Re-mock the API
          vi.doMock('../services/api', () => ({
            apiClient: {
              getAllTodos: vi.fn().mockResolvedValue(initialTodos),
              createTodo: vi.fn(),
              updateTodo: vi.fn(),
              deleteTodo: vi.fn().mockResolvedValue(undefined),
            },
          }));
          
          // Import fresh module
          const { useTodos } = await import('./useTodos');
          const { todos, setFilter, currentFilter, fetchTodos, deleteTodo } = useTodos();
          
          // Fetch initial todos
          await fetchTodos();
          
          // Set filter to "completed"
          setFilter('completed');
          expect(currentFilter.value).toBe('completed');
          
          // Count completed todos before deletion
          const completedBeforeDelete = initialTodos.filter(t => t.completed).length;
          expect(todos.value.length).toBe(completedBeforeDelete);
          
          // Delete the todo
          await deleteTodo(todoToDelete.id);
          
          // Verify filter is still "completed"
          expect(currentFilter.value).toBe('completed');
          
          // Verify the deleted todo is removed from the completed list
          expect(todos.value.length).toBe(completedBeforeDelete - 1);
          
          // Verify all displayed todos are completed
          todos.value.forEach((todo: Todo) => {
            expect(todo.completed).toBe(true);
          });
          
          // Verify the deleted todo is not in the list
          const deletedTodoInList = todos.value.find((t: Todo) => t.id === todoToDelete.id);
          expect(deletedTodoInList).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain all filter when todos are updated or deleted', async () => {
    // Feature: todo-list-app, Property 16: Filter Persistence Across Updates
    // **Validates: Requirements 6.5**
    
    await fc.assert(
      fc.asyncProperty(
        fc.array(todoArbitrary, { minLength: 2, maxLength: 20 }),
        async (initialTodos) => {
          // Reset modules for each property test iteration
          vi.resetModules();
          
          // Pick a random todo to update
          const todoToUpdate = initialTodos[Math.floor(Math.random() * initialTodos.length)];
          const updatedTodo: Todo = {
            ...todoToUpdate,
            completed: !todoToUpdate.completed, // Toggle completion
            updated_at: new Date().toISOString(),
          };
          
          // Re-mock the API
          vi.doMock('../services/api', () => ({
            apiClient: {
              getAllTodos: vi.fn().mockResolvedValue(initialTodos),
              createTodo: vi.fn(),
              updateTodo: vi.fn().mockResolvedValue(updatedTodo),
              deleteTodo: vi.fn(),
            },
          }));
          
          // Import fresh module
          const { useTodos } = await import('./useTodos');
          const { todos, setFilter, currentFilter, fetchTodos, updateTodo } = useTodos();
          
          // Fetch initial todos
          await fetchTodos();
          
          // Set filter to "all"
          setFilter('all');
          expect(currentFilter.value).toBe('all');
          
          // Count all todos before update
          const allBeforeUpdate = initialTodos.length;
          expect(todos.value.length).toBe(allBeforeUpdate);
          
          // Update the todo
          await updateTodo(todoToUpdate.id, { completed: !todoToUpdate.completed });
          
          // Verify filter is still "all"
          expect(currentFilter.value).toBe('all');
          
          // Verify all todos are still displayed (count unchanged)
          expect(todos.value.length).toBe(allBeforeUpdate);
          
          // Verify the updated todo is in the list with new completion status
          const updatedTodoInList = todos.value.find((t: Todo) => t.id === todoToUpdate.id);
          expect(updatedTodoInList).toBeDefined();
          expect(updatedTodoInList?.completed).toBe(!todoToUpdate.completed);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 15: Client-Side Filtering', () => {
  let useTodos: any;
  let apiClient: any;

  beforeEach(async () => {
    // Reset modules to get fresh state
    vi.resetModules();
    
    // Mock the API client before importing useTodos
    vi.doMock('../services/api', () => ({
      apiClient: {
        getAllTodos: vi.fn(),
        createTodo: vi.fn(),
        updateTodo: vi.fn(),
        deleteTodo: vi.fn(),
      },
    }));
    
    // Import after mocking
    const todosModule = await import('./useTodos');
    useTodos = todosModule.useTodos;
    
    const apiModule = await import('../services/api');
    apiClient = apiModule.apiClient;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should update displayed todos without making API requests when filter changes', async () => {
    // Feature: todo-list-app, Property 15: Client-Side Filtering
    // **Validates: Requirements 6.4**
    
    await fc.assert(
      fc.asyncProperty(
        fc.array(todoArbitrary, { minLength: 1, maxLength: 50 }),
        fc.array(fc.constantFrom('all', 'active', 'completed'), { minLength: 2, maxLength: 10 }),
        async (generatedTodos, filterSequence) => {
          // Reset modules for each property test iteration
          vi.resetModules();
          
          // Create a spy to track API calls
          const getAllTodosSpy = vi.fn().mockResolvedValue(generatedTodos);
          
          // Re-mock the API with spy
          vi.doMock('../services/api', () => ({
            apiClient: {
              getAllTodos: getAllTodosSpy,
              createTodo: vi.fn(),
              updateTodo: vi.fn(),
              deleteTodo: vi.fn(),
            },
          }));
          
          // Import fresh module
          const { useTodos } = await import('./useTodos');
          const { todos, setFilter, fetchTodos } = useTodos();
          
          // Initial fetch - this SHOULD call the API
          await fetchTodos();
          
          // Verify initial API call was made
          expect(getAllTodosSpy).toHaveBeenCalledTimes(1);
          
          // Reset the spy call count to track subsequent calls
          getAllTodosSpy.mockClear();
          
          // Apply each filter in the sequence
          for (const filter of filterSequence) {
            setFilter(filter as FilterType);
            
            // Verify the filter was applied by checking the filtered results
            const currentTodos = todos.value;
            
            if (filter === 'all') {
              expect(currentTodos.length).toBe(generatedTodos.length);
            } else if (filter === 'active') {
              const expectedActive = generatedTodos.filter(todo => !todo.completed);
              expect(currentTodos.length).toBe(expectedActive.length);
            } else if (filter === 'completed') {
              const expectedCompleted = generatedTodos.filter(todo => todo.completed);
              expect(currentTodos.length).toBe(expectedCompleted.length);
            }
            
            // CRITICAL: Verify NO API calls were made during filter change
            expect(getAllTodosSpy).not.toHaveBeenCalled();
          }
          
          // Final verification: API should still have been called only once (initial fetch)
          expect(getAllTodosSpy).toHaveBeenCalledTimes(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle rapid filter changes without API calls', async () => {
    // Feature: todo-list-app, Property 15: Client-Side Filtering (Rapid Changes)
    // **Validates: Requirements 6.4**
    
    const testTodos: Todo[] = [
      {
        id: 1,
        title: 'Active Todo 1',
        description: 'Description 1',
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 2,
        title: 'Completed Todo 1',
        description: 'Description 2',
        completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 3,
        title: 'Active Todo 2',
        description: 'Description 3',
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    
    vi.resetModules();
    
    const getAllTodosSpy = vi.fn().mockResolvedValue(testTodos);
    
    vi.doMock('../services/api', () => ({
      apiClient: {
        getAllTodos: getAllTodosSpy,
        createTodo: vi.fn(),
        updateTodo: vi.fn(),
        deleteTodo: vi.fn(),
      },
    }));
    
    const module = await import('./useTodos');
    const { todos, setFilter, fetchTodos } = module.useTodos();
    
    // Initial fetch
    await fetchTodos();
    expect(getAllTodosSpy).toHaveBeenCalledTimes(1);
    
    // Clear spy
    getAllTodosSpy.mockClear();
    
    // Rapidly change filters multiple times
    setFilter('active');
    expect(todos.value.length).toBe(2);
    expect(getAllTodosSpy).not.toHaveBeenCalled();
    
    setFilter('completed');
    expect(todos.value.length).toBe(1);
    expect(getAllTodosSpy).not.toHaveBeenCalled();
    
    setFilter('all');
    expect(todos.value.length).toBe(3);
    expect(getAllTodosSpy).not.toHaveBeenCalled();
    
    setFilter('active');
    expect(todos.value.length).toBe(2);
    expect(getAllTodosSpy).not.toHaveBeenCalled();
    
    setFilter('completed');
    expect(todos.value.length).toBe(1);
    expect(getAllTodosSpy).not.toHaveBeenCalled();
    
    // Verify no API calls were made during any filter change
    expect(getAllTodosSpy).toHaveBeenCalledTimes(0);
  });

  it('should maintain client-side filtering even with empty todo list', async () => {
    // Feature: todo-list-app, Property 15: Client-Side Filtering (Empty List)
    // **Validates: Requirements 6.4**
    
    vi.resetModules();
    
    const getAllTodosSpy = vi.fn().mockResolvedValue([]);
    
    vi.doMock('../services/api', () => ({
      apiClient: {
        getAllTodos: getAllTodosSpy,
        createTodo: vi.fn(),
        updateTodo: vi.fn(),
        deleteTodo: vi.fn(),
      },
    }));
    
    const module = await import('./useTodos');
    const { todos, setFilter, fetchTodos } = module.useTodos();
    
    // Initial fetch
    await fetchTodos();
    expect(getAllTodosSpy).toHaveBeenCalledTimes(1);
    
    // Clear spy
    getAllTodosSpy.mockClear();
    
    // Change filters with empty list
    setFilter('active');
    expect(todos.value).toEqual([]);
    expect(getAllTodosSpy).not.toHaveBeenCalled();
    
    setFilter('completed');
    expect(todos.value).toEqual([]);
    expect(getAllTodosSpy).not.toHaveBeenCalled();
    
    setFilter('all');
    expect(todos.value).toEqual([]);
    expect(getAllTodosSpy).not.toHaveBeenCalled();
    
    // Verify no API calls were made
    expect(getAllTodosSpy).toHaveBeenCalledTimes(0);
  });
});

describe('Property 12: UI-Backend Synchronization', () => {
  // Generate unique IDs for todos to avoid conflicts
  const uniqueIdArbitrary = fc.integer({ min: 1, max: 100000 });
  
  // Create a todo arbitrary with unique IDs
  const uniqueTodoArbitrary = fc.record({
    id: uniqueIdArbitrary,
    title: fc.string({ minLength: 1, maxLength: 200 }),
    description: fc.string({ maxLength: 1000 }),
    completed: fc.boolean(),
    created_at: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ts => new Date(ts).toISOString()),
    updated_at: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ts => new Date(ts).toISOString()),
  });
  
  // Generate array of todos with unique IDs
  const uniqueTodosArrayArbitrary = fc.array(uniqueTodoArbitrary, { minLength: 0, maxLength: 20 }).map(todos => {
    // Ensure all IDs are unique by reassigning them
    return todos.map((todo, index) => ({ ...todo, id: index + 1 }));
  });

  it('should immediately reflect new todo in UI state after successful create', async () => {
    // Feature: todo-list-app, Property 12: UI-Backend Synchronization
    // **Validates: Requirements 1.5**
    
    await fc.assert(
      fc.asyncProperty(
        uniqueTodosArrayArbitrary,
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 200 }),
          description: fc.string({ maxLength: 1000 }),
        }),
        async (initialTodos, newTodoData) => {
          // Reset modules for each property test iteration
          vi.resetModules();
          
          // Create the new todo that will be returned by the API
          const newTodo: Todo = {
            id: Math.max(...initialTodos.map(t => t.id), 0) + 1,
            title: newTodoData.title,
            description: newTodoData.description,
            completed: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          // Re-mock the API
          vi.doMock('../services/api', () => ({
            apiClient: {
              getAllTodos: vi.fn().mockResolvedValue(initialTodos),
              createTodo: vi.fn().mockResolvedValue(newTodo),
              updateTodo: vi.fn(),
              deleteTodo: vi.fn(),
            },
          }));
          
          // Import fresh module
          const { useTodos } = await import('./useTodos');
          const { todos, fetchTodos, createTodo } = useTodos();
          
          // Fetch initial todos
          await fetchTodos();
          
          // Verify initial state
          const initialCount = todos.value.length;
          expect(initialCount).toBe(initialTodos.length);
          
          // Create new todo
          const returnedTodo = await createTodo(newTodoData);
          
          // CRITICAL: Verify UI state immediately reflects the new todo WITHOUT calling fetchTodos again
          expect(todos.value.length).toBe(initialCount + 1);
          
          // Verify the new todo is in the list
          const foundTodo = todos.value.find((t: Todo) => t.id === newTodo.id);
          expect(foundTodo).toBeDefined();
          expect(foundTodo?.title).toBe(newTodoData.title);
          expect(foundTodo?.description).toBe(newTodoData.description);
          expect(foundTodo?.completed).toBe(false);
          
          // Verify the returned todo matches what's in the UI
          expect(returnedTodo).toEqual(newTodo);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should immediately reflect updated todo in UI state after successful update', async () => {
    // Feature: todo-list-app, Property 12: UI-Backend Synchronization
    // **Validates: Requirements 3.4, 4.5**
    
    await fc.assert(
      fc.asyncProperty(
        uniqueTodosArrayArbitrary.filter(todos => todos.length > 0),
        fc.record({
          title: fc.option(fc.string({ minLength: 1, maxLength: 200 })),
          description: fc.option(fc.string({ maxLength: 1000 })),
          completed: fc.option(fc.boolean()),
        }),
        async (initialTodos, updateData) => {
          // Skip if no update data provided
          if (!updateData.title && !updateData.description && updateData.completed === null) {
            return;
          }
          
          // Reset modules for each property test iteration
          vi.resetModules();
          
          // Pick a random todo to update
          const todoToUpdate = initialTodos[Math.floor(Math.random() * initialTodos.length)];
          
          // Create the updated todo that will be returned by the API
          const updatedTodo: Todo = {
            ...todoToUpdate,
            title: updateData.title ?? todoToUpdate.title,
            description: updateData.description ?? todoToUpdate.description,
            completed: updateData.completed ?? todoToUpdate.completed,
            updated_at: new Date().toISOString(),
          };
          
          // Re-mock the API
          vi.doMock('../services/api', () => ({
            apiClient: {
              getAllTodos: vi.fn().mockResolvedValue(initialTodos),
              createTodo: vi.fn(),
              updateTodo: vi.fn().mockResolvedValue(updatedTodo),
              deleteTodo: vi.fn(),
            },
          }));
          
          // Import fresh module
          const { useTodos } = await import('./useTodos');
          const { todos, fetchTodos, updateTodo } = useTodos();
          
          // Fetch initial todos
          await fetchTodos();
          
          // Verify initial state
          const initialTodoInList = todos.value.find((t: Todo) => t.id === todoToUpdate.id);
          expect(initialTodoInList).toBeDefined();
          expect(initialTodoInList?.title).toBe(todoToUpdate.title);
          expect(initialTodoInList?.description).toBe(todoToUpdate.description);
          expect(initialTodoInList?.completed).toBe(todoToUpdate.completed);
          
          // Update the todo
          const returnedTodo = await updateTodo(todoToUpdate.id, updateData);
          
          // CRITICAL: Verify UI state immediately reflects the update WITHOUT calling fetchTodos again
          const updatedTodoInList = todos.value.find((t: Todo) => t.id === todoToUpdate.id);
          expect(updatedTodoInList).toBeDefined();
          expect(updatedTodoInList?.title).toBe(updatedTodo.title);
          expect(updatedTodoInList?.description).toBe(updatedTodo.description);
          expect(updatedTodoInList?.completed).toBe(updatedTodo.completed);
          
          // Verify the returned todo matches what's in the UI
          expect(returnedTodo).toEqual(updatedTodo);
          
          // Verify the list length hasn't changed
          expect(todos.value.length).toBe(initialTodos.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should immediately reflect deleted todo in UI state after successful delete', async () => {
    // Feature: todo-list-app, Property 12: UI-Backend Synchronization
    // **Validates: Requirements 5.4**
    
    await fc.assert(
      fc.asyncProperty(
        uniqueTodosArrayArbitrary.filter(todos => todos.length > 0),
        async (initialTodos) => {
          // Reset modules for each property test iteration
          vi.resetModules();
          
          // Pick a random todo to delete
          const todoToDelete = initialTodos[Math.floor(Math.random() * initialTodos.length)];
          
          // Re-mock the API
          vi.doMock('../services/api', () => ({
            apiClient: {
              getAllTodos: vi.fn().mockResolvedValue(initialTodos),
              createTodo: vi.fn(),
              updateTodo: vi.fn(),
              deleteTodo: vi.fn().mockResolvedValue(undefined),
            },
          }));
          
          // Import fresh module
          const { useTodos } = await import('./useTodos');
          const { todos, fetchTodos, deleteTodo } = useTodos();
          
          // Fetch initial todos
          await fetchTodos();
          
          // Verify initial state
          const initialCount = todos.value.length;
          expect(initialCount).toBe(initialTodos.length);
          
          // Verify the todo exists before deletion
          const todoBeforeDelete = todos.value.find((t: Todo) => t.id === todoToDelete.id);
          expect(todoBeforeDelete).toBeDefined();
          
          // Delete the todo
          await deleteTodo(todoToDelete.id);
          
          // CRITICAL: Verify UI state immediately reflects the deletion WITHOUT calling fetchTodos again
          expect(todos.value.length).toBe(initialCount - 1);
          
          // Verify the deleted todo is no longer in the list
          const todoAfterDelete = todos.value.find((t: Todo) => t.id === todoToDelete.id);
          expect(todoAfterDelete).toBeUndefined();
          
          // Verify all remaining todos are from the original list (except the deleted one)
          todos.value.forEach((todo: Todo) => {
            expect(todo.id).not.toBe(todoToDelete.id);
            const originalTodo = initialTodos.find(t => t.id === todo.id);
            expect(originalTodo).toBeDefined();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain UI synchronization across multiple operations', async () => {
    // Feature: todo-list-app, Property 12: UI-Backend Synchronization (Multiple Operations)
    // **Validates: Requirements 1.5, 3.4, 4.5, 5.4**
    
    // This test verifies that multiple operations in sequence maintain UI synchronization
    // Using a simpler approach with specific test data to avoid module caching issues
    
    vi.resetModules();
    vi.unmock('../services/api');
    
    const initialTodos: Todo[] = [
      {
        id: 1,
        title: 'Todo 1',
        description: 'Description 1',
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 2,
        title: 'Todo 2',
        description: 'Description 2',
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    
    const newTodo: Todo = {
      id: 3,
      title: 'New Todo',
      description: 'New Description',
      completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const updatedTodo: Todo = {
      ...initialTodos[0],
      completed: true,
      updated_at: new Date().toISOString(),
    };
    
    vi.doMock('../services/api', () => ({
      apiClient: {
        getAllTodos: vi.fn().mockResolvedValue(initialTodos),
        createTodo: vi.fn().mockResolvedValue(newTodo),
        updateTodo: vi.fn().mockResolvedValue(updatedTodo),
        deleteTodo: vi.fn().mockResolvedValue(undefined),
      },
    }));
    
    const { useTodos } = await import('./useTodos?t=' + Date.now());
    const { todos, fetchTodos, createTodo, updateTodo, deleteTodo } = useTodos();
    
    // Fetch initial todos
    await fetchTodos();
    expect(todos.value.length).toBe(2);
    
    // Operation 1: Create a new todo
    await createTodo({ title: 'New Todo', description: 'New Description' });
    expect(todos.value.length).toBe(3);
    expect(todos.value.find((t: Todo) => t.id === 3)).toBeDefined();
    
    // Operation 2: Update an existing todo
    await updateTodo(1, { completed: true });
    expect(todos.value.length).toBe(3); // Count unchanged
    expect(todos.value.find((t: Todo) => t.id === 1)?.completed).toBe(true);
    
    // Operation 3: Delete a todo
    await deleteTodo(2);
    expect(todos.value.length).toBe(2); // Back to 2 todos
    expect(todos.value.find((t: Todo) => t.id === 2)).toBeUndefined();
    
    // Verify final state
    expect(todos.value.find((t: Todo) => t.id === 1)).toBeDefined(); // Updated todo still there
    expect(todos.value.find((t: Todo) => t.id === 3)).toBeDefined(); // New todo still there
    expect(todos.value.find((t: Todo) => t.id === 2)).toBeUndefined(); // Deleted todo gone
    
    vi.unmock('../services/api');
  });

  it('should handle edge case of creating todo when list is empty', async () => {
    // Feature: todo-list-app, Property 12: UI-Backend Synchronization (Edge Case)
    // **Validates: Requirements 1.5**
    
    vi.resetModules();
    vi.unmock('../services/api');
    
    const newTodo: Todo = {
      id: 1,
      title: 'First Todo',
      description: 'First Description',
      completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    vi.doMock('../services/api', () => ({
      apiClient: {
        getAllTodos: vi.fn().mockResolvedValue([]),
        createTodo: vi.fn().mockResolvedValue(newTodo),
        updateTodo: vi.fn(),
        deleteTodo: vi.fn(),
      },
    }));
    
    const module = await import('./useTodos?t=' + Date.now());
    const { useTodos } = module;
    const { todos, fetchTodos, createTodo } = useTodos();
    
    // Fetch initial empty list
    await fetchTodos();
    expect(todos.value.length).toBe(0);
    
    // Create first todo
    await createTodo({ title: 'First Todo', description: 'First Description' });
    
    // Verify UI immediately shows the new todo
    expect(todos.value.length).toBe(1);
    expect(todos.value[0]).toEqual(newTodo);
    
    vi.unmock('../services/api');
  });

  it('should handle edge case of deleting the last todo', async () => {
    // Feature: todo-list-app, Property 12: UI-Backend Synchronization (Edge Case)
    // **Validates: Requirements 5.4**
    
    vi.resetModules();
    vi.unmock('../services/api');
    
    const singleTodo: Todo = {
      id: 1,
      title: 'Only Todo',
      description: 'Only Description',
      completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    vi.doMock('../services/api', () => ({
      apiClient: {
        getAllTodos: vi.fn().mockResolvedValue([singleTodo]),
        createTodo: vi.fn(),
        updateTodo: vi.fn(),
        deleteTodo: vi.fn().mockResolvedValue(undefined),
      },
    }));
    
    const module = await import('./useTodos?t=' + Date.now());
    const { useTodos } = module;
    const { todos, fetchTodos, deleteTodo } = useTodos();
    
    // Fetch initial single todo
    await fetchTodos();
    expect(todos.value.length).toBe(1);
    
    // Delete the only todo
    await deleteTodo(singleTodo.id);
    
    // Verify UI immediately shows empty list
    expect(todos.value.length).toBe(0);
    expect(todos.value).toEqual([]);
    
    vi.unmock('../services/api');
  });

  it('should handle edge case of updating todo with all fields', async () => {
    // Feature: todo-list-app, Property 12: UI-Backend Synchronization (Edge Case)
    // **Validates: Requirements 3.4, 4.5**
    
    vi.resetModules();
    vi.unmock('../services/api');
    
    const originalTodo: Todo = {
      id: 1,
      title: 'Original Title',
      description: 'Original Description',
      completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const updatedTodo: Todo = {
      ...originalTodo,
      title: 'Updated Title',
      description: 'Updated Description',
      completed: true,
      updated_at: new Date().toISOString(),
    };
    
    vi.doMock('../services/api', () => ({
      apiClient: {
        getAllTodos: vi.fn().mockResolvedValue([originalTodo]),
        createTodo: vi.fn(),
        updateTodo: vi.fn().mockResolvedValue(updatedTodo),
        deleteTodo: vi.fn(),
      },
    }));
    
    const module = await import('./useTodos?t=' + Date.now());
    const { useTodos } = module;
    const { todos, fetchTodos, updateTodo } = useTodos();
    
    // Fetch initial todo
    await fetchTodos();
    expect(todos.value[0]).toEqual(originalTodo);
    
    // Update all fields
    await updateTodo(originalTodo.id, {
      title: 'Updated Title',
      description: 'Updated Description',
      completed: true,
    });
    
    // Verify UI immediately shows all updates
    expect(todos.value.length).toBe(1);
    expect(todos.value[0].title).toBe('Updated Title');
    expect(todos.value[0].description).toBe('Updated Description');
    expect(todos.value[0].completed).toBe(true);
    
    vi.unmock('../services/api');
  });
});
