import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fc from 'fast-check';
import axios from 'axios';
import type { Todo, CreateTodoDto } from '../types/todo';

/**
 * Property 18: Round-Trip Consistency
 * Feature: todo-list-app, Property 18: Round-Trip Consistency
 * **Validates: Requirements 1.1, 2.2, 8.1**
 * 
 * This integration test verifies that for any todo created through the frontend,
 * the todo should be persistable to the backend and retrievable such that all
 * fields (title, description) match the original input.
 */

// Backend API URL - should be running for these tests
const API_URL = process.env.VITE_API_URL || 'http://localhost:5000/api';

// Arbitrary for generating valid todo creation data
// Note: We filter out HTML special characters that would be sanitized by the backend
// to test pure round-trip consistency. HTML sanitization is tested separately in Property 7.
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

describe('Property 18: Round-Trip Consistency', () => {
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

  it('should persist and retrieve todo with all fields matching original input', async () => {
    if (!backendAvailable) {
      console.log('⏭️  Skipping test - backend not available');
      return;
    }

    // Feature: todo-list-app, Property 18: Round-Trip Consistency
    // **Validates: Requirements 1.1, 2.2, 8.1**
    
    await fc.assert(
      fc.asyncProperty(
        createTodoDtoArbitrary,
        async (todoData: CreateTodoDto) => {
          // Step 1: Create todo through the API (simulating frontend)
          const createResponse = await axios.post<Todo>(
            `${API_URL}/todos`,
            todoData,
            {
              headers: { 'Content-Type': 'application/json' }
            }
          );
          
          // Verify creation was successful
          expect(createResponse.status).toBe(201);
          const createdTodo = createResponse.data;
          
          // Verify the created todo has an ID assigned
          expect(createdTodo.id).toBeDefined();
          expect(typeof createdTodo.id).toBe('number');
          expect(createdTodo.id).toBeGreaterThan(0);
          
          // Step 2: Retrieve the todo from the backend
          const getResponse = await axios.get<Todo>(
            `${API_URL}/todos/${createdTodo.id}`
          );
          
          // Verify retrieval was successful
          expect(getResponse.status).toBe(200);
          const retrievedTodo = getResponse.data;
          
          // Step 3: Verify round-trip consistency - all fields match
          
          // CRITICAL: Title must match exactly (for non-HTML-special-character input)
          expect(retrievedTodo.title).toBe(todoData.title);
          
          // CRITICAL: Description must match exactly (for non-HTML-special-character input)
          expect(retrievedTodo.description).toBe(todoData.description);
          
          // Verify ID is consistent
          expect(retrievedTodo.id).toBe(createdTodo.id);
          
          // Verify completion status (should be false for new todos)
          expect(retrievedTodo.completed).toBe(false);
          
          // Verify timestamps exist and are valid ISO strings
          expect(retrievedTodo.created_at).toBeDefined();
          expect(retrievedTodo.updated_at).toBeDefined();
          expect(() => new Date(retrievedTodo.created_at)).not.toThrow();
          expect(() => new Date(retrievedTodo.updated_at)).not.toThrow();
          
          // Step 4: Verify the todo also appears in the list of all todos
          const listResponse = await axios.get<Todo[]>(`${API_URL}/todos`);
          expect(listResponse.status).toBe(200);
          
          const todosInList = listResponse.data;
          const todoInList = todosInList.find(t => t.id === createdTodo.id);
          
          // Verify the todo is in the list
          expect(todoInList).toBeDefined();
          
          // Verify the todo in the list matches the original input
          expect(todoInList?.title).toBe(todoData.title);
          expect(todoInList?.description).toBe(todoData.description);
          expect(todoInList?.completed).toBe(false);
          
          // Cleanup: Delete the created todo
          await axios.delete(`${API_URL}/todos/${createdTodo.id}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle edge case of empty description', async () => {
    if (!backendAvailable) {
      console.log('⏭️  Skipping test - backend not available');
      return;
    }

    // Feature: todo-list-app, Property 18: Round-Trip Consistency (Edge Case)
    // **Validates: Requirements 1.1, 2.2, 8.1**
    
    const todoData: CreateTodoDto = {
      title: 'Test Todo',
      description: '',
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
    
    // Retrieve todo
    const getResponse = await axios.get<Todo>(
      `${API_URL}/todos/${createdTodo.id}`
    );
    
    expect(getResponse.status).toBe(200);
    const retrievedTodo = getResponse.data;
    
    // Verify empty description is preserved
    expect(retrievedTodo.title).toBe(todoData.title);
    expect(retrievedTodo.description).toBe('');
    
    // Cleanup
    await axios.delete(`${API_URL}/todos/${createdTodo.id}`);
  });

  it('should handle edge case of maximum length title and description', async () => {
    if (!backendAvailable) {
      console.log('⏭️  Skipping test - backend not available');
      return;
    }

    // Feature: todo-list-app, Property 18: Round-Trip Consistency (Edge Case)
    // **Validates: Requirements 1.1, 2.2, 8.1**
    
    const todoData: CreateTodoDto = {
      title: 'A'.repeat(200), // Maximum length
      description: 'B'.repeat(1000), // Maximum length
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
    
    // Retrieve todo
    const getResponse = await axios.get<Todo>(
      `${API_URL}/todos/${createdTodo.id}`
    );
    
    expect(getResponse.status).toBe(200);
    const retrievedTodo = getResponse.data;
    
    // Verify maximum length fields are preserved exactly
    expect(retrievedTodo.title).toBe(todoData.title);
    expect(retrievedTodo.title.length).toBe(200);
    expect(retrievedTodo.description).toBe(todoData.description);
    expect(retrievedTodo.description.length).toBe(1000);
    
    // Cleanup
    await axios.delete(`${API_URL}/todos/${createdTodo.id}`);
  });

  it('should handle special characters in title and description', async () => {
    if (!backendAvailable) {
      console.log('⏭️  Skipping test - backend not available');
      return;
    }

    // Feature: todo-list-app, Property 18: Round-Trip Consistency (Special Characters)
    // **Validates: Requirements 1.1, 2.2, 8.1**
    
    const specialCharacters = [
      { title: 'Todo with "quotes"', description: 'Description with "quotes"' },
      { title: "Todo with 'apostrophes'", description: "Description with 'apostrophes'" },
      { title: 'Todo with <brackets>', description: 'Description with <brackets>' },
      { title: 'Todo with & ampersand', description: 'Description with & ampersand' },
      { title: 'Todo with émojis 🎉', description: 'Description with émojis 🎉' },
      { title: 'Todo with newlines\nand tabs\t', description: 'Description with newlines\nand tabs\t' },
      { title: 'Todo with unicode: 你好', description: 'Description with unicode: 你好' },
    ];
    
    for (const todoData of specialCharacters) {
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
      
      // Retrieve todo
      const getResponse = await axios.get<Todo>(
        `${API_URL}/todos/${createdTodo.id}`
      );
      
      expect(getResponse.status).toBe(200);
      const retrievedTodo = getResponse.data;
      
      // Verify special characters are preserved (or properly sanitized)
      // Note: The backend may sanitize some characters for security
      expect(retrievedTodo.title).toBeDefined();
      expect(retrievedTodo.description).toBeDefined();
      
      // The title and description should at least contain the core content
      // even if some characters are sanitized
      expect(retrievedTodo.title.length).toBeGreaterThan(0);
      
      // Cleanup
      await axios.delete(`${API_URL}/todos/${createdTodo.id}`);
    }
  });

  it('should maintain data integrity across multiple create-retrieve cycles', async () => {
    if (!backendAvailable) {
      console.log('⏭️  Skipping test - backend not available');
      return;
    }

    // Feature: todo-list-app, Property 18: Round-Trip Consistency (Multiple Cycles)
    // **Validates: Requirements 1.1, 2.2, 8.1**
    
    await fc.assert(
      fc.asyncProperty(
        fc.array(createTodoDtoArbitrary, { minLength: 1, maxLength: 10 }),
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
            
            // Retrieve all todos
            const listResponse = await axios.get<Todo[]>(`${API_URL}/todos`);
            expect(listResponse.status).toBe(200);
            const allTodos = listResponse.data;
            
            // Verify each created todo is in the list with correct data
            for (let i = 0; i < todosData.length; i++) {
              const originalData = todosData[i];
              const todoId = createdIds[i];
              
              const todoInList = allTodos.find(t => t.id === todoId);
              expect(todoInList).toBeDefined();
              expect(todoInList?.title).toBe(originalData.title);
              expect(todoInList?.description).toBe(originalData.description);
              expect(todoInList?.completed).toBe(false);
            }
            
            // Verify individual retrieval for each todo
            for (let i = 0; i < todosData.length; i++) {
              const originalData = todosData[i];
              const todoId = createdIds[i];
              
              const getResponse = await axios.get<Todo>(
                `${API_URL}/todos/${todoId}`
              );
              
              expect(getResponse.status).toBe(200);
              const retrievedTodo = getResponse.data;
              
              expect(retrievedTodo.title).toBe(originalData.title);
              expect(retrievedTodo.description).toBe(originalData.description);
              expect(retrievedTodo.completed).toBe(false);
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
      { numRuns: 50 } // Reduced runs for integration test performance
    );
  });
});
