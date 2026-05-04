<template>
  <div class="todo-form-example">
    <TodoForm
      :todo="editingTodo"
      :is-submitting="isSubmitting"
      @submit="handleSubmit"
      @cancel="handleCancel"
    />
    
    <div v-if="successMessage" class="success-message" role="status">
      {{ successMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import TodoForm from './TodoForm.vue';
import { useTodos } from '../composables/useTodos';
import type { Todo, CreateTodoDto } from '../types/todo';

const { createTodo, updateTodo } = useTodos();

const editingTodo = ref<Todo | undefined>(undefined);
const isSubmitting = ref(false);
const successMessage = ref<string | null>(null);

async function handleSubmit(todoData: CreateTodoDto): Promise<void> {
  isSubmitting.value = true;
  successMessage.value = null;

  try {
    if (editingTodo.value) {
      // Update existing todo
      await updateTodo(editingTodo.value.id, todoData);
      successMessage.value = 'Todo updated successfully!';
      editingTodo.value = undefined;
    } else {
      // Create new todo
      await createTodo(todoData);
      successMessage.value = 'Todo created successfully!';
    }

    // Clear success message after 3 seconds
    setTimeout(() => {
      successMessage.value = null;
    }, 3000);
  } catch (error) {
    console.error('Failed to submit todo:', error);
  } finally {
    isSubmitting.value = false;
  }
}

function handleCancel(): void {
  editingTodo.value = undefined;
  successMessage.value = null;
}
</script>

<style scoped>
.todo-form-example {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
}

.success-message {
  margin-top: 1rem;
  padding: 1rem;
  background-color: #e8f5e9;
  border: 1px solid #4CAF50;
  border-radius: 4px;
  color: #2e7d32;
  font-weight: 500;
}
</style>
