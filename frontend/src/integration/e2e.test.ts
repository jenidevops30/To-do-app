import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import axios from 'axios';
import type { Todo, CreateTodoDto } from '../types/todo';

/**
 * End-to-End Tests
 * **Validates: Requirements 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 10.1**
 * 
 * These tests verify complete user workflows from the frontend perspective,
 * testing full scenarios that users would actually perform.
 */

// Backend API URL - should be running for these tests
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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

// Helper function to create a todo
async function createTodo(todoData: CreateTodoDto): Promise<Todo> {
  const response = await axios.post<Todo>(
    `${API_URL}/todos`,
    todoData,
    { headers: { 'Content-Type': 'application/json' } }
  );
  return response.data;
}

describe('End-to-End Tests', () => {
  let backendAvailable = false;

  beforeAll(async () => {
    // Check if backend is available
    backendAvailable = await isBackendAvailable();
    
    if (!backendAvailable) {
      console.warn('⚠️  Backend is not available. E2E tests will be skipped.');
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

  describe('Complete User Workflow: Create → Edit → Complete → Delete', () => {
    it('should handle complete todo lifecycle workflow', async () => {
      if (!backendAvailable) {
        console.log('⏭️  Skipping test - backend not available');
        return;
      }

      // **Validates: Requirements 1.1, 2.1, 3.1, 4.1, 5.1**
      
      // Step 1: Create a new todo (simulating user filling out form)
      const createData: CreateTodoDto = {
        title: 'Buy groceries',
        description: 'Milk, eggs, bread, and cheese',
      };
      
      const createResponse = await axios.post<Todo>(
        `${API_URL}/todos`,
        createData,
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      expect(createResponse.status).toBe(201);
      const createdTodo = createResponse.data;
      
      // Verify todo was created with correct data
      expect(createdTodo.id).toBeDefined();
      expect(createdTodo.title).toBe(createData.title);
      expect(createdTodo.description).toBe(createData.description);
      expect(createdTodo.completed).toBe(false);

      // Step 2: Retrieve all todos (simulating page load/refresh)
      const listResponse = await axios.get<Todo[]>(`${API_URL}/todos`);
      expect(listResponse.status).toBe(200);
      
      const todos = listResponse.data;
      expect(todos.length).toBe(1);
      expect(todos[0].id).toBe(createdTodo.id);
      expect(todos[0].title).toBe(createData.title);
      
      // Step 3: Edit the todo (simulating user clicking edit and updating)
      const updateData = {
        title: 'Buy groceries and snacks',
        description: 'Milk, eggs, bread, cheese, and cookies',
      };
      
      const updateResponse = await axios.put<Todo>(
        `${API_URL}/todos/${createdTodo.id}`,
        updateData,
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      expect(updateResponse.status).toBe(200);
      const updatedTodo = updateResponse.data;
      
      // Verify todo was updated
      expect(updatedTodo.id).toBe(createdTodo.id);
      expect(updatedTodo.title).toBe(updateData.title);
      expect(updatedTodo.description).toBe(updateData.description);
      expect(updatedTodo.completed).toBe(false);
      
      // Step 4: Mark todo as complete (simulating user clicking checkbox)
      const toggleResponse = await axios.put<Todo>(
        `${API_URL}/todos/${createdTodo.id}`,
        { completed: true },
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      expect(toggleResponse.status).toBe(200);
      const completedTodo = toggleResponse.data;
      
      // Verify todo is marked as completed
      expect(completedTodo.id).toBe(createdTodo.id);
      expect(completedTodo.completed).toBe(true);
      expect(completedTodo.title).toBe(updateData.title);
      
      // Step 5: Verify the completed todo appears in the list
      const listAfterComplete = await axios.get<Todo[]>(`${API_URL}/todos`);
      expect(listAfterComplete.status).toBe(200);
      
      const todosAfterComplete = listAfterComplete.data;
      expect(todosAfterComplete.length).toBe(1);
      expect(todosAfterComplete[0].completed).toBe(true);
      
      // Step 6: Delete the todo (simulating user clicking delete button)
      const deleteResponse = await axios.delete(
        `${API_URL}/todos/${createdTodo.id}`
      );
      
      expect(deleteResponse.status).toBe(204);
      
      // Step 7: Verify todo is deleted from the list
      const listAfterDelete = await axios.get<Todo[]>(`${API_URL}/todos`);
      expect(listAfterDelete.status).toBe(200);
      
      const todosAfterDelete = listAfterDelete.data;
      expect(todosAfterDelete.length).toBe(0);
      
      // Step 8: Verify individual retrieval returns 404
      try {
        await axios.get(`${API_URL}/todos/${createdTodo.id}`);
        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.response.status).toBe(404);
      }
    });

    it('should handle multiple todos in complete workflow', async () => {
      if (!backendAvailable) {
        console.log('⏭️  Skipping test - backend not available');
        return;
      }

      // **Validates: Requirements 1.1, 2.1, 3.1, 4.1, 5.1**
      
      // Create multiple todos
      const todo1 = await createTodo({
        title: 'First Todo',
        description: 'First description',
      });
      
      const todo2 = await createTodo({
        title: 'Second Todo',
        description: 'Second description',
      });
      
      const todo3 = await createTodo({
        title: 'Third Todo',
        description: 'Third description',
      });
      
      // Verify all todos are in the list
      let listResponse = await axios.get<Todo[]>(`${API_URL}/todos`);
      expect(listResponse.data.length).toBe(3);
      
      // Edit the second todo
      await axios.put<Todo>(
        `${API_URL}/todos/${todo2.id}`,
        { title: 'Updated Second Todo' },
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      // Complete the first and third todos
      await axios.put<Todo>(
        `${API_URL}/todos/${todo1.id}`,
        { completed: true },
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      await axios.put<Todo>(
        `${API_URL}/todos/${todo3.id}`,
        { completed: true },
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      // Verify the state of all todos
      listResponse = await axios.get<Todo[]>(`${API_URL}/todos`);
      const todos = listResponse.data;
      
      const foundTodo1 = todos.find(t => t.id === todo1.id);
      const foundTodo2 = todos.find(t => t.id === todo2.id);
      const foundTodo3 = todos.find(t => t.id === todo3.id);
      
      expect(foundTodo1?.completed).toBe(true);
      expect(foundTodo2?.completed).toBe(false);
      expect(foundTodo2?.title).toBe('Updated Second Todo');
      expect(foundTodo3?.completed).toBe(true);
      
      // Delete the second todo
      await axios.delete(`${API_URL}/todos/${todo2.id}`);
      
      // Verify only two todos remain
      listResponse = await axios.get<Todo[]>(`${API_URL}/todos`);
      expect(listResponse.data.length).toBe(2);
      expect(listResponse.data.find(t => t.id === todo2.id)).toBeUndefined();
      
      // Cleanup remaining todos
      await axios.delete(`${API_URL}/todos/${todo1.id}`);
      await axios.delete(`${API_URL}/todos/${todo3.id}`);
    });
  });

  describe('Filter Switching with Mixed Todo States', () => {
    it('should correctly filter todos by completion status', async () => {
      if (!backendAvailable) {
        console.log('⏭️  Skipping test - backend not available');
        return;
      }

      // **Validates: Requirements 6.1, 6.2, 6.3**
      
      // Create todos with mixed completion states
      const activeTodo1 = await createTodo({
        title: 'Active Todo 1',
        description: 'Not completed yet',
      });
      
      const activeTodo2 = await createTodo({
        title: 'Active Todo 2',
        description: 'Also not completed',
      });
      
      const completedTodo1 = await createTodo({
        title: 'Completed Todo 1',
        description: 'This is done',
      });
      
      const completedTodo2 = await createTodo({
        title: 'Completed Todo 2',
        description: 'This is also done',
      });
      
      // Mark some todos as completed
      await axios.put<Todo>(
        `${API_URL}/todos/${completedTodo1.id}`,
        { completed: true },
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      await axios.put<Todo>(
        `${API_URL}/todos/${completedTodo2.id}`,
        { completed: true },
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      // Retrieve all todos (simulating "all" filter)
      const allTodosResponse = await axios.get<Todo[]>(`${API_URL}/todos`);
      const allTodos = allTodosResponse.data;
      
      expect(allTodos.length).toBe(4);
      
      // Simulate "active" filter (client-side filtering)
      const activeTodos = allTodos.filter(todo => !todo.completed);
      expect(activeTodos.length).toBe(2);
      expect(activeTodos.find(t => t.id === activeTodo1.id)).toBeDefined();
      expect(activeTodos.find(t => t.id === activeTodo2.id)).toBeDefined();
      expect(activeTodos.find(t => t.id === completedTodo1.id)).toBeUndefined();
      expect(activeTodos.find(t => t.id === completedTodo2.id)).toBeUndefined();
      
      // Simulate "completed" filter (client-side filtering)
      const completedTodos = allTodos.filter(todo => todo.completed);
      expect(completedTodos.length).toBe(2);
      expect(completedTodos.find(t => t.id === completedTodo1.id)).toBeDefined();
      expect(completedTodos.find(t => t.id === completedTodo2.id)).toBeDefined();
      expect(completedTodos.find(t => t.id === activeTodo1.id)).toBeUndefined();
      expect(completedTodos.find(t => t.id === activeTodo2.id)).toBeUndefined();
      
      // Cleanup
      await axios.delete(`${API_URL}/todos/${activeTodo1.id}`);
      await axios.delete(`${API_URL}/todos/${activeTodo2.id}`);
      await axios.delete(`${API_URL}/todos/${completedTodo1.id}`);
      await axios.delete(`${API_URL}/todos/${completedTodo2.id}`);
    });

    it('should maintain filter state when toggling todo completion', async () => {
      if (!backendAvailable) {
        console.log('⏭️  Skipping test - backend not available');
        return;
      }

      // **Validates: Requirements 6.4, 6.5**
      
      // Create todos
      const todo1 = await createTodo({
        title: 'Todo 1',
        description: 'Description 1',
      });
      
      const todo2 = await createTodo({
        title: 'Todo 2',
        description: 'Description 2',
      });
      
      // Get all todos (simulating "all" filter)
      let allTodos = (await axios.get<Todo[]>(`${API_URL}/todos`)).data;
      expect(allTodos.length).toBe(2);
      
      // Simulate "active" filter
      let activeTodos = allTodos.filter(todo => !todo.completed);
      expect(activeTodos.length).toBe(2);
      
      // Toggle todo1 to completed
      await axios.put<Todo>(
        `${API_URL}/todos/${todo1.id}`,
        { completed: true },
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      // Refresh data (simulating filter persistence)
      allTodos = (await axios.get<Todo[]>(`${API_URL}/todos`)).data;
      
      // With "active" filter, todo1 should disappear
      activeTodos = allTodos.filter(todo => !todo.completed);
      expect(activeTodos.length).toBe(1);
      expect(activeTodos[0].id).toBe(todo2.id);
      
      // With "completed" filter, todo1 should appear
      const completedTodos = allTodos.filter(todo => todo.completed);
      expect(completedTodos.length).toBe(1);
      expect(completedTodos[0].id).toBe(todo1.id);
      
      // Toggle todo1 back to incomplete
      await axios.put<Todo>(
        `${API_URL}/todos/${todo1.id}`,
        { completed: false },
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      // Refresh data
      allTodos = (await axios.get<Todo[]>(`${API_URL}/todos`)).data;
      
      // With "active" filter, todo1 should reappear
      activeTodos = allTodos.filter(todo => !todo.completed);
      expect(activeTodos.length).toBe(2);
      
      // Cleanup
      await axios.delete(`${API_URL}/todos/${todo1.id}`);
      await axios.delete(`${API_URL}/todos/${todo2.id}`);
    });

    it('should handle filter switching with edge cases', async () => {
      if (!backendAvailable) {
        console.log('⏭️  Skipping test - backend not available');
        return;
      }

      // **Validates: Requirements 6.1, 6.2, 6.3**
      
      // Test with no todos
      let allTodos = (await axios.get<Todo[]>(`${API_URL}/todos`)).data;
      expect(allTodos.length).toBe(0);
      expect(allTodos.filter(t => !t.completed).length).toBe(0);
      expect(allTodos.filter(t => t.completed).length).toBe(0);
      
      // Create only active todos
      const activeTodo = await createTodo({
        title: 'Active Only',
        description: 'No completed todos',
      });
      
      allTodos = (await axios.get<Todo[]>(`${API_URL}/todos`)).data;
      expect(allTodos.length).toBe(1);
      expect(allTodos.filter(t => !t.completed).length).toBe(1);
      expect(allTodos.filter(t => t.completed).length).toBe(0);
      
      // Mark as completed (now only completed todos)
      await axios.put<Todo>(
        `${API_URL}/todos/${activeTodo.id}`,
        { completed: true },
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      allTodos = (await axios.get<Todo[]>(`${API_URL}/todos`)).data;
      expect(allTodos.length).toBe(1);
      expect(allTodos.filter(t => !t.completed).length).toBe(0);
      expect(allTodos.filter(t => t.completed).length).toBe(1);
      
      // Cleanup
      await axios.delete(`${API_URL}/todos/${activeTodo.id}`);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle validation errors when creating todo with empty title', async () => {
      if (!backendAvailable) {
        console.log('⏭️  Skipping test - backend not available');
        return;
      }

      // **Validates: Requirements 1.2, 9.1, 9.2**
      
      try {
        await axios.post<Todo>(
          `${API_URL}/todos`,
          { title: '', description: 'Test' },
          { headers: { 'Content-Type': 'application/json' } }
        );
        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBeDefined();
        expect(error.response.data.errors).toBeDefined();
        expect(error.response.data.errors.title).toBeDefined();
      }
    });

    it('should handle validation errors when creating todo with whitespace-only title', async () => {
      if (!backendAvailable) {
        console.log('⏭️  Skipping test - backend not available');
        return;
      }

      // **Validates: Requirements 1.2, 9.1, 9.2**
      
      try {
        await axios.post<Todo>(
          `${API_URL}/todos`,
          { title: '   ', description: 'Test' },
          { headers: { 'Content-Type': 'application/json' } }
        );
        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBeDefined();
      }
    });

    it('should handle validation errors when title exceeds maximum length', async () => {
      if (!backendAvailable) {
        console.log('⏭️  Skipping test - backend not available');
        return;
      }

      // **Validates: Requirements 7.1, 7.2, 9.1, 9.2**
      
      const longTitle = 'a'.repeat(201);
      
      try {
        await axios.post<Todo>(
          `${API_URL}/todos`,
          { title: longTitle, description: 'Test' },
          { headers: { 'Content-Type': 'application/json' } }
        );
        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBeDefined();
        expect(error.response.data.errors.title).toBeDefined();
      }
    });

    it('should handle validation errors when description exceeds maximum length', async () => {
      if (!backendAvailable) {
        console.log('⏭️  Skipping test - backend not available');
        return;
      }

      // **Validates: Requirements 7.1, 7.2, 9.1, 9.2**
      
      const longDescription = 'a'.repeat(1001);
      
      try {
        await axios.post<Todo>(
          `${API_URL}/todos`,
          { title: 'Valid Title', description: longDescription },
          { headers: { 'Content-Type': 'application/json' } }
        );
        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBeDefined();
        expect(error.response.data.errors.description).toBeDefined();
      }
    });

    it('should handle 404 error when retrieving non-existent todo', async () => {
      if (!backendAvailable) {
        console.log('⏭️  Skipping test - backend not available');
        return;
      }

      // **Validates: Requirements 9.1, 9.2**
      
      const nonExistentId = 999999;
      
      try {
        await axios.get(`${API_URL}/todos/${nonExistentId}`);
        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.error).toBeDefined();
      }
    });

    it('should handle 404 error when updating non-existent todo', async () => {
      if (!backendAvailable) {
        console.log('⏭️  Skipping test - backend not available');
        return;
      }

      // **Validates: Requirements 3.5, 9.1, 9.2**
      
      const nonExistentId = 999999;
      
      try {
        await axios.put<Todo>(
          `${API_URL}/todos/${nonExistentId}`,
          { title: 'Updated Title' },
          { headers: { 'Content-Type': 'application/json' } }
        );
        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.error).toBeDefined();
      }
    });

    it('should handle 404 error when deleting non-existent todo', async () => {
      if (!backendAvailable) {
        console.log('⏭️  Skipping test - backend not available');
        return;
      }

      // **Validates: Requirements 5.5, 9.1, 9.2**
      
      const nonExistentId = 999999;
      
      try {
        await axios.delete(`${API_URL}/todos/${nonExistentId}`);
        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.error).toBeDefined();
      }
    });

    it('should handle validation errors when updating todo with empty title', async () => {
      if (!backendAvailable) {
        console.log('⏭️  Skipping test - backend not available');
        return;
      }

      // **Validates: Requirements 4.3, 9.1, 9.2**
      
      // Create a todo first
      const todo = await createTodo({
        title: 'Original Title',
        description: 'Original Description',
      });
      
      try {
        await axios.put<Todo>(
          `${API_URL}/todos/${todo.id}`,
          { title: '' },
          { headers: { 'Content-Type': 'application/json' } }
        );
        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBeDefined();
        expect(error.response.data.errors.title).toBeDefined();
      } finally {
        // Cleanup
        await axios.delete(`${API_URL}/todos/${todo.id}`);
      }
    });

    it('should handle network errors gracefully', async () => {
      // **Validates: Requirements 9.3**
      
      // Test with invalid URL to simulate network error
      const invalidApiUrl = 'http://localhost:9999/api';
      
      try {
        await axios.get(`${invalidApiUrl}/todos`, { timeout: 1000 });
        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        // Should be a network error (ECONNREFUSED or timeout)
        expect(error.code).toBeDefined();
        expect(['ECONNREFUSED', 'ECONNABORTED', 'ERR_NETWORK'].includes(error.code)).toBe(true);
      }
    });
  });

  describe('Responsive Layout and Data Integrity', () => {
    it('should handle todos with various content lengths', async () => {
      if (!backendAvailable) {
        console.log('⏭️  Skipping test - backend not available');
        return;
      }

      // **Validates: Requirements 10.1, 10.2, 10.3, 10.4**
      
      // Create todos with different content lengths
      const shortTodo = await createTodo({
        title: 'Short',
        description: 'Brief',
      });
      
      const mediumTodo = await createTodo({
        title: 'Medium length todo title for testing',
        description: 'This is a medium length description that contains more information about the todo item.',
      });
      
      const longTodo = await createTodo({
        title: 'A'.repeat(200), // Maximum length
        description: 'B'.repeat(1000), // Maximum length
      });
      
      // Retrieve all todos
      const listResponse = await axios.get<Todo[]>(`${API_URL}/todos`);
      expect(listResponse.status).toBe(200);
      
      const todos = listResponse.data;
      expect(todos.length).toBe(3);
      
      // Verify all todos are present with correct data
      const foundShort = todos.find(t => t.id === shortTodo.id);
      const foundMedium = todos.find(t => t.id === mediumTodo.id);
      const foundLong = todos.find(t => t.id === longTodo.id);
      
      expect(foundShort).toBeDefined();
      expect(foundShort?.title).toBe('Short');
      expect(foundShort?.description).toBe('Brief');
      
      expect(foundMedium).toBeDefined();
      expect(foundMedium?.title).toBe('Medium length todo title for testing');
      
      expect(foundLong).toBeDefined();
      expect(foundLong?.title.length).toBe(200);
      expect(foundLong?.description.length).toBe(1000);
      
      // Cleanup
      await axios.delete(`${API_URL}/todos/${shortTodo.id}`);
      await axios.delete(`${API_URL}/todos/${mediumTodo.id}`);
      await axios.delete(`${API_URL}/todos/${longTodo.id}`);
    });

    it('should handle special characters and unicode in todos', async () => {
      if (!backendAvailable) {
        console.log('⏭️  Skipping test - backend not available');
        return;
      }

      // **Validates: Requirements 10.3**
      
      // Create todos with special characters
      const specialTodo = await createTodo({
        title: 'Todo with émojis 🎉 and unicode: 你好',
        description: 'Description with newlines\nand tabs\t and special chars',
      });
      
      // Retrieve and verify
      const getResponse = await axios.get<Todo>(`${API_URL}/todos/${specialTodo.id}`);
      expect(getResponse.status).toBe(200);
      
      const retrievedTodo = getResponse.data;
      expect(retrievedTodo.title).toBeDefined();
      expect(retrievedTodo.description).toBeDefined();
      
      // Cleanup
      await axios.delete(`${API_URL}/todos/${specialTodo.id}`);
    });

    it('should maintain data integrity with concurrent operations', async () => {
      if (!backendAvailable) {
        console.log('⏭️  Skipping test - backend not available');
        return;
      }

      // **Validates: Requirements 8.1, 8.2**
      
      // Create multiple todos concurrently
      const createPromises = [
        createTodo({ title: 'Concurrent 1', description: 'Desc 1' }),
        createTodo({ title: 'Concurrent 2', description: 'Desc 2' }),
        createTodo({ title: 'Concurrent 3', description: 'Desc 3' }),
        createTodo({ title: 'Concurrent 4', description: 'Desc 4' }),
        createTodo({ title: 'Concurrent 5', description: 'Desc 5' }),
      ];
      
      const createdTodos = await Promise.all(createPromises);
      
      // Verify all todos were created
      expect(createdTodos.length).toBe(5);
      createdTodos.forEach(todo => {
        expect(todo.id).toBeDefined();
        expect(todo.completed).toBe(false);
      });
      
      // Update all todos concurrently
      const updatePromises = createdTodos.map(todo =>
        axios.put<Todo>(
          `${API_URL}/todos/${todo.id}`,
          { completed: true },
          { headers: { 'Content-Type': 'application/json' } }
        )
      );
      
      await Promise.all(updatePromises);
      
      // Verify all todos are completed
      const listResponse = await axios.get<Todo[]>(`${API_URL}/todos`);
      const todos = listResponse.data;
      
      createdTodos.forEach(createdTodo => {
        const foundTodo = todos.find(t => t.id === createdTodo.id);
        expect(foundTodo).toBeDefined();
        expect(foundTodo?.completed).toBe(true);
      });
      
      // Delete all todos concurrently
      const deletePromises = createdTodos.map(todo =>
        axios.delete(`${API_URL}/todos/${todo.id}`)
      );
      
      await Promise.all(deletePromises);
      
      // Verify all todos are deleted
      const finalListResponse = await axios.get<Todo[]>(`${API_URL}/todos`);
      expect(finalListResponse.data.length).toBe(0);
    }, 15000); // Increased timeout for concurrent operations
  });

  describe('Complex User Scenarios', () => {
    it('should handle rapid create-edit-delete cycles', async () => {
      if (!backendAvailable) {
        console.log('⏭️  Skipping test - backend not available');
        return;
      }

      // **Validates: Requirements 1.1, 4.1, 5.1**
      
      for (let i = 0; i < 5; i++) {
        // Create
        const todo = await createTodo({
          title: `Rapid Todo ${i}`,
          description: `Description ${i}`,
        });
        
        // Edit
        await axios.put<Todo>(
          `${API_URL}/todos/${todo.id}`,
          { title: `Updated Rapid Todo ${i}` },
          { headers: { 'Content-Type': 'application/json' } }
        );
        
        // Verify edit
        const getResponse = await axios.get<Todo>(`${API_URL}/todos/${todo.id}`);
        expect(getResponse.data.title).toBe(`Updated Rapid Todo ${i}`);
        
        // Delete
        await axios.delete(`${API_URL}/todos/${todo.id}`);
        
        // Verify deletion
        try {
          await axios.get(`${API_URL}/todos/${todo.id}`);
          expect(true).toBe(false);
        } catch (error: any) {
          expect(error.response.status).toBe(404);
        }
      }
      
      // Verify no todos remain
      const listResponse = await axios.get<Todo[]>(`${API_URL}/todos`);
      expect(listResponse.data.length).toBe(0);
    });

    it('should handle mixed operations on multiple todos', async () => {
      if (!backendAvailable) {
        console.log('⏭️  Skipping test - backend not available');
        return;
      }

      // **Validates: Requirements 1.1, 2.1, 3.1, 4.1, 5.1, 6.1**
      
      // Create initial set of todos
      const todos = await Promise.all([
        createTodo({ title: 'Todo A', description: 'Desc A' }),
        createTodo({ title: 'Todo B', description: 'Desc B' }),
        createTodo({ title: 'Todo C', description: 'Desc C' }),
        createTodo({ title: 'Todo D', description: 'Desc D' }),
      ]);
      
      // Perform mixed operations
      // Complete Todo A
      await axios.put<Todo>(
        `${API_URL}/todos/${todos[0].id}`,
        { completed: true },
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      // Edit Todo B
      await axios.put<Todo>(
        `${API_URL}/todos/${todos[1].id}`,
        { title: 'Updated Todo B', description: 'Updated Desc B' },
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      // Complete Todo C
      await axios.put<Todo>(
        `${API_URL}/todos/${todos[2].id}`,
        { completed: true },
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      // Delete Todo D
      await axios.delete(`${API_URL}/todos/${todos[3].id}`);
      
      // Verify final state
      const listResponse = await axios.get<Todo[]>(`${API_URL}/todos`);
      const finalTodos = listResponse.data;
      
      expect(finalTodos.length).toBe(3);
      
      const todoA = finalTodos.find(t => t.id === todos[0].id);
      const todoB = finalTodos.find(t => t.id === todos[1].id);
      const todoC = finalTodos.find(t => t.id === todos[2].id);
      const todoD = finalTodos.find(t => t.id === todos[3].id);
      
      expect(todoA?.completed).toBe(true);
      expect(todoB?.title).toBe('Updated Todo B');
      expect(todoB?.description).toBe('Updated Desc B');
      expect(todoB?.completed).toBe(false);
      expect(todoC?.completed).toBe(true);
      expect(todoD).toBeUndefined();
      
      // Test filtering
      const activeTodos = finalTodos.filter(t => !t.completed);
      const completedTodos = finalTodos.filter(t => t.completed);
      
      expect(activeTodos.length).toBe(1);
      expect(activeTodos[0].id).toBe(todos[1].id);
      
      expect(completedTodos.length).toBe(2);
      expect(completedTodos.find(t => t.id === todos[0].id)).toBeDefined();
      expect(completedTodos.find(t => t.id === todos[2].id)).toBeDefined();
      
      // Cleanup
      await axios.delete(`${API_URL}/todos/${todos[0].id}`);
      await axios.delete(`${API_URL}/todos/${todos[1].id}`);
      await axios.delete(`${API_URL}/todos/${todos[2].id}`);
    });
  });
});
