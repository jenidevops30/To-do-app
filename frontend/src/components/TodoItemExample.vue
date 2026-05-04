<template>
  <div class="example-container">
    <h1>TodoItem Component Example</h1>
    
    <div class="examples">
      <h2>Active Todo</h2>
      <TodoItem
        :todo="activeTodo"
        @toggle="handleToggle"
        @edit="handleEdit"
        @delete="handleDelete"
      />

      <h2>Completed Todo</h2>
      <TodoItem
        :todo="completedTodo"
        @toggle="handleToggle"
        @edit="handleEdit"
        @delete="handleDelete"
      />

      <h2>Todo without Description</h2>
      <TodoItem
        :todo="noDescriptionTodo"
        @toggle="handleToggle"
        @edit="handleEdit"
        @delete="handleDelete"
      />
    </div>

    <div class="event-log">
      <h2>Event Log</h2>
      <ul>
        <li v-for="(event, index) in eventLog" :key="index">
          {{ event }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import TodoItem from './TodoItem.vue';
import type { Todo } from '../types/todo';

const activeTodo: Todo = {
  id: 1,
  title: 'Buy groceries',
  description: 'Milk, eggs, bread, and vegetables',
  completed: false,
  created_at: '2024-01-15T10:30:00',
  updated_at: '2024-01-15T10:30:00',
};

const completedTodo: Todo = {
  id: 2,
  title: 'Complete project documentation',
  description: 'Write comprehensive documentation for the todo list application including setup instructions and API documentation',
  completed: true,
  created_at: '2024-01-14T09:00:00',
  updated_at: '2024-01-15T14:20:00',
};

const noDescriptionTodo: Todo = {
  id: 3,
  title: 'Call dentist',
  description: '',
  completed: false,
  created_at: '2024-01-15T11:00:00',
  updated_at: '2024-01-15T11:00:00',
};

const eventLog = ref<string[]>([]);

function handleToggle(id: number): void {
  const timestamp = new Date().toLocaleTimeString();
  eventLog.value.unshift(`[${timestamp}] Toggle todo #${id}`);
}

function handleEdit(todo: Todo): void {
  const timestamp = new Date().toLocaleTimeString();
  eventLog.value.unshift(`[${timestamp}] Edit todo #${todo.id}: "${todo.title}"`);
}

function handleDelete(id: number): void {
  const timestamp = new Date().toLocaleTimeString();
  eventLog.value.unshift(`[${timestamp}] Delete todo #${id}`);
}
</script>

<style scoped>
.example-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

h1 {
  color: #333;
  margin-bottom: 2rem;
}

h2 {
  color: #555;
  margin: 1.5rem 0 1rem 0;
  font-size: 1.25rem;
}

.examples {
  margin-bottom: 2rem;
}

.event-log {
  background-color: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
  margin-top: 2rem;
}

.event-log ul {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 300px;
  overflow-y: auto;
}

.event-log li {
  padding: 0.5rem;
  border-bottom: 1px solid #e0e0e0;
  font-family: monospace;
  font-size: 0.875rem;
}

.event-log li:last-child {
  border-bottom: none;
}
</style>
