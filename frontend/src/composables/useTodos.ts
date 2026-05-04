import { ref, computed } from 'vue';
import { apiClient } from '../services/api';
import type { Todo, CreateTodoDto, UpdateTodoDto, FilterType } from '../types/todo';

const todos = ref<Todo[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const currentFilter = ref<FilterType>('all');

export function useTodos() {
  const filteredTodos = computed(() => {
    switch (currentFilter.value) {
      case 'active':
        return todos.value.filter(todo => !todo.completed);
      case 'completed':
        return todos.value.filter(todo => todo.completed);
      default:
        return todos.value;
    }
  });

  const activeCount = computed(() => 
    todos.value.filter(todo => !todo.completed).length
  );

  const completedCount = computed(() => 
    todos.value.filter(todo => todo.completed).length
  );

  async function fetchTodos(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      todos.value = await apiClient.getAllTodos();
    } catch (e) {
      error.value = 'Failed to load todos';
      console.error(e);
    } finally {
      loading.value = false;
    }
  }

  async function createTodo(todoData: CreateTodoDto): Promise<Todo> {
    loading.value = true;
    error.value = null;
    try {
      const newTodo = await apiClient.createTodo(todoData);
      todos.value.push(newTodo);
      return newTodo;
    } catch (e) {
      error.value = 'Failed to create todo';
      console.error(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function updateTodo(id: number, todoData: UpdateTodoDto): Promise<Todo> {
    loading.value = true;
    error.value = null;
    try {
      const updatedTodo = await apiClient.updateTodo(id, todoData);
      const index = todos.value.findIndex(t => t.id === id);
      if (index !== -1) {
        todos.value[index] = updatedTodo;
      }
      return updatedTodo;
    } catch (e) {
      error.value = 'Failed to update todo';
      console.error(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function deleteTodo(id: number): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await apiClient.deleteTodo(id);
      todos.value = todos.value.filter(t => t.id !== id);
    } catch (e) {
      error.value = 'Failed to delete todo';
      console.error(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  function setFilter(filter: FilterType): void {
    currentFilter.value = filter;
  }

  return {
    todos: filteredTodos,
    loading,
    error,
    currentFilter,
    activeCount,
    completedCount,
    fetchTodos,
    createTodo,
    updateTodo,
    deleteTodo,
    setFilter,
  };
}
