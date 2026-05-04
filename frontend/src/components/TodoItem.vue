<template>
  <div class="todo-item" :class="{ 'todo-completed': todo.completed }">
    <div class="todo-checkbox">
      <input
        :id="`todo-checkbox-${todo.id}`"
        type="checkbox"
        :checked="todo.completed"
        @change="handleToggle"
        class="checkbox-input"
        :aria-label="`Mark '${todo.title}' as ${todo.completed ? 'incomplete' : 'complete'}`"
      />
      <label :for="`todo-checkbox-${todo.id}`" class="checkbox-label">
        <span class="visually-hidden">
          {{ todo.completed ? 'Completed' : 'Not completed' }}
        </span>
      </label>
    </div>

    <div class="todo-content">
      <h3 class="todo-title">{{ todo.title }}</h3>
      <p v-if="todo.description" class="todo-description">
        {{ todo.description }}
      </p>
      <div class="todo-meta">
        <span class="todo-status" :aria-label="`Status: ${todo.completed ? 'Completed' : 'Active'}`">
          {{ todo.completed ? 'Completed' : 'Active' }}
        </span>
      </div>
    </div>

    <div class="todo-actions">
      <button
        type="button"
        class="btn btn-edit"
        @click="handleEdit"
        :aria-label="`Edit '${todo.title}'`"
        title="Edit todo"
      >
        <span aria-hidden="true">✏️</span>
        <span class="btn-text">Edit</span>
      </button>
      <button
        type="button"
        class="btn btn-delete"
        @click="handleDelete"
        :aria-label="`Delete '${todo.title}'`"
        title="Delete todo"
      >
        <span aria-hidden="true">🗑️</span>
        <span class="btn-text">Delete</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Todo } from '../types/todo';

interface Props {
  todo: Todo;
}

interface Emits {
  (e: 'toggle', id: number): void;
  (e: 'edit', todo: Todo): void;
  (e: 'delete', id: number): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

function handleToggle(): void {
  emit('toggle', props.todo.id);
}

function handleEdit(): void {
  emit('edit', props.todo);
}

function handleDelete(): void {
  emit('delete', props.todo.id);
}
</script>

<style scoped>
.todo-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  margin-bottom: 0.75rem;
  transition: box-shadow 0.2s, border-color 0.2s;
}

.todo-item:hover {
  box-shadow: 0 2px 8px var(--color-shadow);
  border-color: var(--color-border-hover);
}

.todo-completed {
  background-color: var(--color-surface);
  opacity: 0.85;
}

.todo-completed .todo-title {
  text-decoration: line-through;
  color: var(--color-text-disabled);
}

.todo-completed .todo-description {
  color: var(--color-text-disabled);
}

/* Checkbox styling */
.todo-checkbox {
  flex-shrink: 0;
  margin-top: 0.25rem;
}

.checkbox-input {
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
  accent-color: var(--color-primary);
}

.checkbox-label {
  cursor: pointer;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Content area */
.todo-content {
  flex: 1;
  min-width: 0; /* Allow text truncation */
}

.todo-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.todo-description {
  margin: 0 0 0.5rem 0;
  font-size: 0.95rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.todo-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.todo-status {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  border-radius: 12px;
  background-color: var(--color-info-light);
  color: var(--color-info);
}

.todo-completed .todo-status {
  background-color: var(--color-success-light);
  color: var(--color-success);
}

/* Actions */
.todo-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-surface);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, transform 0.1s;
  font-family: inherit;
  min-height: 44px; /* Touch-friendly size */
  min-width: 44px; /* Touch-friendly size */
}

.btn:hover {
  transform: translateY(-1px);
}

.btn:active {
  transform: translateY(0);
}

.btn:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.btn-edit {
  border-color: var(--color-info);
  color: var(--color-info);
}

.btn-edit:hover {
  background-color: var(--color-info-light);
  border-color: var(--color-info);
}

.btn-delete {
  border-color: var(--color-error);
  color: var(--color-error);
}

.btn-delete:hover {
  background-color: var(--color-error-light);
  border-color: var(--color-error);
}

.btn-text {
  display: inline;
}

/* Responsive design for mobile devices */
@media (max-width: 768px) {
  .todo-item {
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.875rem;
  }

  .todo-checkbox {
    margin-top: 0;
  }

  .todo-title {
    font-size: 1rem;
  }

  .todo-description {
    font-size: 0.875rem;
  }

  .todo-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .btn {
    padding: 0.5rem 1rem;
  }

  .btn-text {
    display: none;
  }
}

/* Responsive design for very small screens */
@media (max-width: 480px) {
  .todo-item {
    padding: 0.75rem;
  }

  .todo-actions {
    gap: 0.375rem;
  }

  .btn {
    padding: 0.5rem;
    min-width: 40px;
    min-height: 40px;
  }
}
</style>
