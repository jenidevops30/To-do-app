<template>
  <div class="todo-list-container">
    <header class="todo-list-header">
      <h1>My Todo List</h1>
      <p class="subtitle">Organize your tasks efficiently</p>
    </header>

    <!-- Error Display -->
    <div
      v-if="error"
      class="error-banner"
      role="alert"
      aria-live="assertive"
    >
      <span class="error-icon" aria-hidden="true">⚠️</span>
      <span class="error-text">{{ error }}</span>
      <button
        type="button"
        class="error-dismiss"
        @click="dismissError"
        aria-label="Dismiss error"
      >
        ✕
      </button>
    </div>

    <!-- Todo Form -->
    <TodoForm
      :todo="editingTodo"
      :is-submitting="loading"
      @submit="handleSubmit"
      @cancel="handleCancelEdit"
    />

    <!-- Todo Filter -->
    <TodoFilter
      :current-filter="currentFilter"
      :active-count="activeCount"
      :completed-count="completedCount"
      @filter-change="handleFilterChange"
    />

    <!-- Loading State -->
    <div
      v-if="loading && todos.length === 0"
      class="loading-state"
      role="status"
      aria-live="polite"
    >
      <div class="loading-spinner" aria-hidden="true"></div>
      <p>Loading todos...</p>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!loading && todos.length === 0"
      class="empty-state"
      role="status"
    >
      <div class="empty-icon" aria-hidden="true">📝</div>
      <h2>No todos yet</h2>
      <p v-if="currentFilter === 'all'">
        Create your first todo to get started!
      </p>
      <p v-else-if="currentFilter === 'active'">
        No active todos. Great job staying on top of things!
      </p>
      <p v-else>
        No completed todos yet. Keep working on your tasks!
      </p>
    </div>

    <!-- Todo List -->
    <div
      v-else
      class="todo-list"
      role="list"
      aria-label="Todo items"
    >
      <TodoItem
        v-for="todo in todos"
        :key="todo.id"
        :todo="todo"
        role="listitem"
        @toggle="handleToggle"
        @edit="handleEdit"
        @delete="handleDelete"
      />
    </div>

    <!-- Loading Overlay for Actions -->
    <div
      v-if="loading && todos.length > 0"
      class="loading-overlay"
      aria-hidden="true"
    >
      <div class="loading-spinner"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useTodos } from '../composables/useTodos';
import TodoForm from './TodoForm.vue';
import TodoFilter from './TodoFilter.vue';
import TodoItem from './TodoItem.vue';
import type { Todo, CreateTodoDto } from '../types/todo';

const {
  todos,
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
} = useTodos();

const editingTodo = ref<Todo | undefined>(undefined);

// Load todos on component mount
onMounted(async () => {
  await fetchTodos();
});

async function handleSubmit(todoData: CreateTodoDto): Promise<void> {
  try {
    if (editingTodo.value) {
      // Update existing todo
      await updateTodo(editingTodo.value.id, todoData);
      editingTodo.value = undefined;
    } else {
      // Create new todo
      await createTodo(todoData);
    }
  } catch (err) {
    console.error('Failed to submit todo:', err);
    // Error is already set by the composable
  }
}

async function handleToggle(id: number): Promise<void> {
  try {
    const todo = todos.value.find(t => t.id === id);
    if (todo) {
      await updateTodo(id, { completed: !todo.completed });
    }
  } catch (err) {
    console.error('Failed to toggle todo:', err);
    // Error is already set by the composable
  }
}

function handleEdit(todo: Todo): void {
  editingTodo.value = todo;
  // Scroll to form
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleCancelEdit(): void {
  editingTodo.value = undefined;
}

async function handleDelete(id: number): Promise<void> {
  // Confirm deletion
  const todo = todos.value.find(t => t.id === id);
  if (todo && confirm(`Are you sure you want to delete "${todo.title}"?`)) {
    try {
      await deleteTodo(id);
    } catch (err) {
      console.error('Failed to delete todo:', err);
      // Error is already set by the composable
    }
  }
}

function handleFilterChange(filter: string): void {
  setFilter(filter as 'all' | 'active' | 'completed');
}

function dismissError(): void {
  error.value = null;
}
</script>

<style scoped>
.todo-list-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1rem;
  position: relative;
}

/* Header */
.todo-list-header {
  text-align: center;
  margin-bottom: 2rem;
}

.todo-list-header h1 {
  margin: 0 0 0.5rem 0;
  font-size: 2.5rem;
  color: var(--color-text-primary);
  font-weight: 700;
}

.subtitle {
  margin: 0;
  font-size: 1.125rem;
  color: var(--color-text-secondary);
  font-weight: 400;
}

/* Error Banner */
.error-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  margin-bottom: 1.5rem;
  background-color: var(--color-error-light);
  border: 1px solid var(--color-error-border);
  border-radius: 8px;
  color: var(--color-error);
  box-shadow: 0 2px 4px var(--color-shadow);
}

.error-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.error-text {
  flex: 1;
  font-weight: 500;
}

.error-dismiss {
  flex-shrink: 0;
  background: none;
  border: none;
  font-size: 1.25rem;
  color: var(--color-error);
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
  transition: opacity 0.2s;
  min-width: 32px;
  min-height: 32px;
}

.error-dismiss:hover {
  opacity: 0.7;
}

.error-dismiss:focus {
  outline: 2px solid var(--color-error);
  outline-offset: 2px;
  border-radius: 4px;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-state p {
  margin: 0;
  font-size: 1.125rem;
  color: var(--color-text-secondary);
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
  background-color: var(--color-surface);
  border: 2px dashed var(--color-border);
  border-radius: 8px;
  margin-top: 2rem;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  color: var(--color-text-primary);
  font-weight: 600;
}

.empty-state p {
  margin: 0;
  font-size: 1rem;
  color: var(--color-text-secondary);
  max-width: 400px;
}

/* Todo List */
.todo-list {
  margin-top: 2rem;
}

/* Loading Overlay */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--color-shadow);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-overlay .loading-spinner {
  width: 64px;
  height: 64px;
  border-width: 6px;
}

/* Responsive design for tablets */
@media (max-width: 768px) {
  .todo-list-container {
    padding: 1.5rem 1rem;
  }

  .todo-list-header h1 {
    font-size: 2rem;
  }

  .subtitle {
    font-size: 1rem;
  }

  .error-banner {
    padding: 0.875rem;
    gap: 0.625rem;
  }

  .error-icon {
    font-size: 1.25rem;
  }

  .error-text {
    font-size: 0.95rem;
  }

  .empty-icon {
    font-size: 3rem;
  }

  .empty-state h2 {
    font-size: 1.25rem;
  }

  .empty-state p {
    font-size: 0.95rem;
  }
}

/* Responsive design for mobile devices */
@media (max-width: 480px) {
  .todo-list-container {
    padding: 1rem 0.75rem;
  }

  .todo-list-header {
    margin-bottom: 1.5rem;
  }

  .todo-list-header h1 {
    font-size: 1.75rem;
  }

  .subtitle {
    font-size: 0.95rem;
  }

  .error-banner {
    padding: 0.75rem;
    gap: 0.5rem;
    font-size: 0.875rem;
  }

  .error-icon {
    font-size: 1.125rem;
  }

  .loading-state,
  .empty-state {
    padding: 2rem 1rem;
  }

  .empty-icon {
    font-size: 2.5rem;
  }

  .empty-state h2 {
    font-size: 1.125rem;
  }

  .empty-state p {
    font-size: 0.875rem;
  }
}
</style>
