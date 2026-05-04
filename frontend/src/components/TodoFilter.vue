<template>
  <div class="todo-filter">
    <div class="filter-header">
      <h3>Filter Todos</h3>
      <div class="filter-counts">
        <span class="count-badge count-active" :aria-label="`${activeCount} active todos`">
          Active: {{ activeCount }}
        </span>
        <span class="count-badge count-completed" :aria-label="`${completedCount} completed todos`">
          Completed: {{ completedCount }}
        </span>
      </div>
    </div>

    <div class="filter-buttons" role="group" aria-label="Filter todos by status">
      <button
        type="button"
        class="filter-btn"
        :class="{ 'filter-btn-active': currentFilter === 'all' }"
        @click="handleFilterChange('all')"
        :aria-pressed="currentFilter === 'all'"
        aria-label="Show all todos"
      >
        All
      </button>
      <button
        type="button"
        class="filter-btn"
        :class="{ 'filter-btn-active': currentFilter === 'active' }"
        @click="handleFilterChange('active')"
        :aria-pressed="currentFilter === 'active'"
        aria-label="Show active todos only"
      >
        Active
      </button>
      <button
        type="button"
        class="filter-btn"
        :class="{ 'filter-btn-active': currentFilter === 'completed' }"
        @click="handleFilterChange('completed')"
        :aria-pressed="currentFilter === 'completed'"
        aria-label="Show completed todos only"
      >
        Completed
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FilterType } from '../types/todo';

interface Props {
  currentFilter: FilterType;
  activeCount: number;
  completedCount: number;
}

interface Emits {
  (e: 'filter-change', filter: FilterType): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();

function handleFilterChange(filter: FilterType): void {
  emit('filter-change', filter);
}
</script>

<style scoped>
.todo-filter {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 4px var(--color-shadow);
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.filter-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--color-text-primary);
  font-weight: 600;
}

.filter-counts {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.count-badge {
  display: inline-block;
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: 16px;
  white-space: nowrap;
}

.count-active {
  background-color: var(--color-info-light);
  color: var(--color-info);
}

.count-completed {
  background-color: var(--color-success-light);
  color: var(--color-success);
}

.filter-buttons {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.filter-btn {
  flex: 1;
  min-width: 100px;
  padding: 0.75rem 1.5rem;
  border: 2px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-surface);
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  min-height: 44px; /* Touch-friendly size */
}

.filter-btn:hover:not(.filter-btn-active) {
  background-color: var(--color-background);
  border-color: var(--color-border-hover);
  transform: translateY(-1px);
}

.filter-btn:active {
  transform: translateY(0);
}

.filter-btn:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.filter-btn-active {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: #ffffff;
  font-weight: 600;
}

.filter-btn-active:hover {
  background-color: var(--color-primary-dark);
  border-color: var(--color-primary-dark);
  transform: none;
}

/* Responsive design for mobile devices */
@media (max-width: 768px) {
  .todo-filter {
    padding: 1rem;
    margin-bottom: 1.5rem;
  }

  .filter-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .filter-header h3 {
    font-size: 1.125rem;
  }

  .filter-counts {
    width: 100%;
  }

  .count-badge {
    font-size: 0.8125rem;
    padding: 0.3125rem 0.625rem;
  }

  .filter-buttons {
    width: 100%;
  }

  .filter-btn {
    padding: 0.625rem 1rem;
    font-size: 0.95rem;
  }
}

/* Responsive design for very small screens */
@media (max-width: 480px) {
  .todo-filter {
    padding: 0.875rem;
  }

  .filter-buttons {
    flex-direction: column;
    gap: 0.5rem;
  }

  .filter-btn {
    width: 100%;
    min-width: auto;
  }
}
</style>
