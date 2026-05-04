import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fc from 'fast-check';
import axios from 'axios';
import type { Todo, CreateTodoDto } from '../types/todo';

/**
 * Property 19: Status Toggle Round-Trip
 * Feature: todo-list-app, Property 19: Status Toggle Round-Trip
 * **Validates: Requirements 3.1, 3.2, 8.1**
 * 
 * This integration test verifies that for any todo, toggling its completion
 * status through the UI should persist the change such that refreshing the
 * page shows the updated status.
 */

// Backend API URL - should be running for these tests
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Arbitrary for generating valid todo creation data
const createTodoDtoArbitrary = fc.record({
  title: fc.string({ minLength: 1, maxLength: 200 })
    .filter(s => s.trim().length > 0)
    .filter(s => !s.includes('<') && !s.includes('>') && !s.includes('"') && !s.includes("'") && !s.includes('&')),
  description: fc.string({ maxLength: 1000 })
    .filter(s => !s.includes('<') && !s.includes('>') && !s.includes('"') && !s.includes("'") && !s.includes('&')),
});

// Helper function to check if backend is available
async function isBackendAvailable(): Promise<boolean> {
  try {
    await axios.get(`${API_URL.replace('/api', '')}/health`, { timeout: 1000 });
    return true;
  } catch {
    return false;
  }
}

// Helper function to clean up all todos
async function cleanupTodos(): Promise<void> {
  try {
    const response = await axios.get<Todo[]>(`${API_URL}/todos`);
    const todos = response.data;
    
    // Delete all todos
    await Promise.all(
      todos.map(todo => axios.delete(`${API_URL}/todos/${todo.id}`))
    );
  } catch (error) {
    console.error('Failed to cleanup todos:', error);
  }
}

describe('Property 19: Status Toggle Round-Trip', () => {
  let backendAvailable = false;

  beforeAll(async () => {
    // Check if backend is available
    backendAvailable = await isBackendAvailable();
    
    if (!backendAvailable) {
      console.warn('⚠️  Backend is not available. Integration tests will be skipped.');
      console.warn('   To run these tests, start the backend server:');
      console.warn('   cd backend && python app.py');
    }
  });

  beforeEach(async () => {
    if (backendAvailable) {
      // Clean up before each test
      await cleanupTodos();
    }
  });

  afterAll(async () => {
    if (backendAvailable) {
      // Final cleanup
      await cleanupTodos();
    }
  });

  it('should persist completion status toggle and reflect it on retrieval', async () => {
    if (!backendAvailable) {
      console.log('⏭️  Skipping test - backend not available');
      return;
    }

    // Feature: todo-list-app, Property 19: Status Toggle Round-Trip
    // **Validates: Requirements 3.1, 3.2, 8.1**
    
    await fc.assert(
      fc.asyncProperty(
        createTodoDtoArbitrary,
        async (todoData: CreateTodoDto) => {
          // Step 1: Create a new todo (starts as incomplete)
          const createResponse = await axios.post<Todo>(
            `${API_URL}/todos`,
            todoData,
            {
              headers: { 'Content-Type': 'application/json' }
            }
          );
          
          expect(createResponse.status).toBe(201);
          const createdTodo = createResponse.data;
          
          // Verify initial state is incomplete
          expect(createdTodo.completed).toBe(false);
          
          // Step 2: Toggle status to completed (simulating UI toggle)
          const toggleToCompleteResponse = await axios.put<Todo>(
            `${API_URL}/todos/${createdTodo.id}`,
            { completed: true },
            {
              headers: { 'Content-Type': 'application/json' }
            }
          );
          
          expect(toggleToCompleteResponse.status).toBe(200);
          const completedTodo = toggleToCompleteResponse.data;
          
          // Verify the update response shows completed status
          expect(completedTodo.completed).toBe(true);
          expect(completedTodo.id).toBe(createdTodo.id);
          
          // Step 3: Retrieve the todo (simulating page refresh)
          const getAfterCompleteResponse = await axios.get<Todo>(
            `${API_URL}/todos/${createdTodo.id}`
          );
          
          expect(getAfterCompleteResponse.status).toBe(200);
          const retrievedCompletedTodo = getAfterCompleteResponse.data;
          
          // CRITICAL: Status must persist as completed
          expect(retrievedCompletedTodo.completed).toBe(true);
          expect(retrievedCompletedTodo.id).toBe(createdTodo.id);
          
          // Verify other fields remain unchanged
          expect(retrievedCompletedTodo.title).toBe(todoData.title);
          expect(retrievedCompletedTodo.description).toBe(todoData.description);
          
          // Step 4: Toggle status back to incomplete
          const toggleToIncompleteResponse = await axios.put<Todo>(
            `${API_URL}/todos/${createdTodo.id}`,
            { completed: false },
            {
              headers: { 'Content-Type': 'application/json' }
            }
          );
          
          expect(toggleToIncompleteResponse.status).toBe(200);
          const incompleteTodo = toggleToIncompleteResponse.data;
          
          // Verify the update response shows incomplete status
          expect(incompleteTodo.completed).toBe(false);
          expect(incompleteTodo.id).toBe(createdTodo.id);
          
          // Step 5: Retrieve the todo again (simulating another page refresh)
          const getAfterIncompleteResponse = await axios.get<Todo>(
            `${API_URL}/todos/${createdTodo.id}`
          );
          
          expect(getAfterIncompleteResponse.status).toBe(200);
          const retrievedIncompleteTodo = getAfterIncompleteResponse.data;
          
          // CRITICAL: Status must persist as incomplete
          expect(retrievedIncompleteTodo.completed).toBe(false);
          expect(retrievedIncompleteTodo.id).toBe(createdTodo.id);
          
          // Verify other fields remain unchanged
          expect(retrievedIncompleteTodo.title).toBe(todoData.title);
          expect(retrievedIncompleteTodo.description).toBe(todoData.description);
          
          // Step 6: Verify the todo appears in the list with correct status
          const listResponse = await axios.get<Todo[]>(`${API_URL}/todos`);
          expect(listResponse.status).toBe(200);
          
          const todosInList = listResponse.data;
          const todoInList = todosInList.find(t => t.id === createdTodo.id);
          
          // Verify the todo is in the list with the final status
          expect(todoInList).toBeDefined();
          expect(todoInList?.completed).toBe(false);
          expect(todoInList?.title).toBe(todoData.title);
          expect(todoInList?.description).toBe(todoData.description);
          
          // Cleanup: Delete the created todo
          await axios.delete(`${API_URL}/todos/${createdTodo.id}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle multiple status toggles in sequence', async () => {
    if (!backendAvailable) {
      console.log('⏭️  Skipping test - backend not available');
      return;
    }

    // Feature: todo-list-app, Property 19: Status Toggle Round-Trip (Multiple Toggles)
    // **Validates: Requirements 3.1, 3.2, 8.1**
    
    const todoData: CreateTodoDto = {
      title: 'Test Multiple Toggles',
      description: 'Testing multiple status toggles',
    };
    
    // Create todo
    const createResponse = await axios.post<Todo>(
      `${API_URL}/todos`,
      todoData,
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    expect(createResponse.status).toBe(201);
    const createdTodo = createResponse.data;
    const todoId = createdTodo.id;
    
    // Perform multiple toggles
    const toggleSequence = [true, false, true, false, true];
    
    for (const targetStatus of toggleSequence) {
      // Toggle to target status
      const toggleResponse = await axios.put<Todo>(
        `${API_URL}/todos/${todoId}`,
        { completed: targetStatus },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      expect(toggleResponse.status).toBe(200);
      expect(toggleResponse.data.completed).toBe(targetStatus);
      
      // Retrieve and verify persistence
      const getResponse = await axios.get<Todo>(
        `${API_URL}/todos/${todoId}`
      );
      
      expect(getResponse.status).toBe(200);
      expect(getResponse.data.completed).toBe(targetStatus);
      
      // Verify in list
      const listResponse = await axios.get<Todo[]>(`${API_URL}/todos`);
      const todoInList = listResponse.data.find(t => t.id === todoId);
      expect(todoInList?.completed).toBe(targetStatus);
    }
    
    // Cleanup
    await axios.delete(`${API_URL}/todos/${todoId}`);
  });

  it('should preserve status when updating other fields', async () => {
    if (!backendAvailable) {
      console.log('⏭️  Skipping test - backend not available');
      return;
    }

    // Feature: todo-list-app, Property 19: Status Toggle Round-Trip (Field Preservation)
    // **Validates: Requirements 3.1, 3.2, 8.1**
    
    const todoData: CreateTodoDto = {
      title: 'Original Title',
      description: 'Original Description',
    };
    
    // Create todo
    const createResponse = await axios.post<Todo>(
      `${API_URL}/todos`,
      todoData,
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    expect(createResponse.status).toBe(201);
    const createdTodo = createResponse.data;
    const todoId = createdTodo.id;
    
    // Toggle to completed
    await axios.put<Todo>(
      `${API_URL}/todos/${todoId}`,
      { completed: true },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    // Update title while keeping status
    const updateTitleResponse = await axios.put<Todo>(
      `${API_URL}/todos/${todoId}`,
      { title: 'Updated Title' },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    expect(updateTitleResponse.status).toBe(200);
    
    // Retrieve and verify status is still completed
    const getResponse = await axios.get<Todo>(
      `${API_URL}/todos/${todoId}`
    );
    
    expect(getResponse.status).toBe(200);
    expect(getResponse.data.completed).toBe(true);
    expect(getResponse.data.title).toBe('Updated Title');
    expect(getResponse.data.description).toBe('Original Description');
    
    // Cleanup
    await axios.delete(`${API_URL}/todos/${todoId}`);
  });

  it('should handle concurrent status toggles correctly', async () => {
    if (!backendAvailable) {
      console.log('⏭️  Skipping test - backend not available');
      return;
    }

    // Feature: todo-list-app, Property 19: Status Toggle Round-Trip (Concurrent Updates)
    // **Validates: Requirements 3.1, 3.2, 8.1**
    
    await fc.assert(
      fc.asyncProperty(
        fc.array(createTodoDtoArbitrary, { minLength: 2, maxLength: 5 }),
        async (todosData: CreateTodoDto[]) => {
          const createdIds: number[] = [];
          
          try {
            // Create multiple todos
            for (const todoData of todosData) {
              const createResponse = await axios.post<Todo>(
                `${API_URL}/todos`,
                todoData,
                {
                  headers: { 'Content-Type': 'application/json' }
                }
              );
              
              expect(createResponse.status).toBe(201);
              createdIds.push(createResponse.data.id);
            }
            
            // Toggle all todos to completed concurrently
            await Promise.all(
              createdIds.map(id =>
                axios.put<Todo>(
                  `${API_URL}/todos/${id}`,
                  { completed: true },
                  {
                    headers: { 'Content-Type': 'application/json' }
                  }
                )
              )
            );
            
            // Retrieve all todos and verify they are all completed
            const listResponse = await axios.get<Todo[]>(`${API_URL}/todos`);
            expect(listResponse.status).toBe(200);
            
            for (const id of createdIds) {
              const todoInList = listResponse.data.find(t => t.id === id);
              expect(todoInList).toBeDefined();
              expect(todoInList?.completed).toBe(true);
            }
            
            // Toggle all todos back to incomplete concurrently
            await Promise.all(
              createdIds.map(id =>
                axios.put<Todo>(
                  `${API_URL}/todos/${id}`,
                  { completed: false },
                  {
                    headers: { 'Content-Type': 'application/json' }
                  }
                )
              )
            );
            
            // Retrieve all todos and verify they are all incomplete
            const listResponse2 = await axios.get<Todo[]>(`${API_URL}/todos`);
            expect(listResponse2.status).toBe(200);
            
            for (const id of createdIds) {
              const todoInList = listResponse2.data.find(t => t.id === id);
              expect(todoInList).toBeDefined();
              expect(todoInList?.completed).toBe(false);
            }
          } finally {
            // Cleanup: Delete all created todos
            for (const id of createdIds) {
              try {
                await axios.delete(`${API_URL}/todos/${id}`);
              } catch {
                // Ignore cleanup errors
              }
            }
          }
        }
      ),
      { numRuns: 20 } // Reduced runs for integration test performance
    );
  }, 15000); // Increased timeout for concurrent operations

  it('should maintain status across application restart simulation', async () => {
    if (!backendAvailable) {
      console.log('⏭️  Skipping test - backend not available');
      return;
    }

    // Feature: todo-list-app, Property 19: Status Toggle Round-Trip (Persistence)
    // **Validates: Requirements 3.1, 3.2, 8.1**
    
    const todoData: CreateTodoDto = {
      title: 'Persistence Test',
      description: 'Testing status persistence across restarts',
    };
    
    // Create todo
    const createResponse = await axios.post<Todo>(
      `${API_URL}/todos`,
      todoData,
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    expect(createResponse.status).toBe(201);
    const createdTodo = createResponse.data;
    const todoId = createdTodo.id;
    
    // Toggle to completed
    await axios.put<Todo>(
      `${API_URL}/todos/${todoId}`,
      { completed: true },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    // Simulate multiple "page refreshes" by retrieving the todo multiple times
    for (let i = 0; i < 5; i++) {
      const getResponse = await axios.get<Todo>(
        `${API_URL}/todos/${todoId}`
      );
      
      expect(getResponse.status).toBe(200);
      expect(getResponse.data.completed).toBe(true);
      expect(getResponse.data.id).toBe(todoId);
      
      // Also verify in list
      const listResponse = await axios.get<Todo[]>(`${API_URL}/todos`);
      const todoInList = listResponse.data.find(t => t.id === todoId);
      expect(todoInList?.completed).toBe(true);
    }
    
    // Toggle back to incomplete
    await axios.put<Todo>(
      `${API_URL}/todos/${todoId}`,
      { completed: false },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    // Simulate multiple "page refreshes" again
    for (let i = 0; i < 5; i++) {
      const getResponse = await axios.get<Todo>(
        `${API_URL}/todos/${todoId}`
      );
      
      expect(getResponse.status).toBe(200);
      expect(getResponse.data.completed).toBe(false);
      expect(getResponse.data.id).toBe(todoId);
      
      // Also verify in list
      const listResponse = await axios.get<Todo[]>(`${API_URL}/todos`);
      const todoInList = listResponse.data.find(t => t.id === todoId);
      expect(todoInList?.completed).toBe(false);
    }
    
    // Cleanup
    await axios.delete(`${API_URL}/todos/${todoId}`);
  });
});
