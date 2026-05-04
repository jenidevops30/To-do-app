<template>
  <form @submit.prevent="handleSubmit" class="todo-form" novalidate>
    <h2>{{ isEditMode ? 'Edit Todo' : 'Create New Todo' }}</h2>
    
    <div class="form-group">
      <label for="todo-title">
        Title <span class="required" aria-label="required">*</span>
      </label>
      <input
        id="todo-title"
        v-model="formData.title"
        type="text"
        class="form-input"
        :class="{ 'input-error': validationErrors.title }"
        placeholder="Enter todo title"
        maxlength="200"
        aria-required="true"
        :aria-invalid="validationErrors.title ? 'true' : 'false'"
        :aria-describedby="validationErrors.title ? 'title-error' : undefined"
      />
      <span
        v-if="validationErrors.title"
        id="title-error"
        class="error-message"
        role="alert"
      >
        {{ validationErrors.title }}
      </span>
    </div>

    <div class="form-group">
      <label for="todo-description">Description</label>
      <textarea
        id="todo-description"
        v-model="formData.description"
        class="form-input form-textarea"
        :class="{ 'input-error': validationErrors.description }"
        placeholder="Enter todo description (optional)"
        maxlength="1000"
        rows="4"
        :aria-invalid="validationErrors.description ? 'true' : 'false'"
        :aria-describedby="validationErrors.description ? 'description-error' : undefined"
      ></textarea>
      <span
        v-if="validationErrors.description"
        id="description-error"
        class="error-message"
        role="alert"
      >
        {{ validationErrors.description }}
      </span>
    </div>

    <div class="form-actions">
      <button
        type="submit"
        class="btn btn-primary"
        :disabled="isSubmitting"
        :aria-busy="isSubmitting"
      >
        {{ isSubmitting ? 'Saving...' : (isEditMode ? 'Update Todo' : 'Create Todo') }}
      </button>
      <button
        v-if="isEditMode"
        type="button"
        class="btn btn-secondary"
        @click="handleCancel"
        :disabled="isSubmitting"
      >
        Cancel
      </button>
    </div>

    <div
      v-if="submitError"
      class="error-message error-banner"
      role="alert"
    >
      {{ submitError }}
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import type { Todo, CreateTodoDto } from '../types/todo';

interface Props {
  todo?: Todo;
  isSubmitting?: boolean;
}

interface Emits {
  (e: 'submit', data: CreateTodoDto): void;
  (e: 'cancel'): void;
}

const props = withDefaults(defineProps<Props>(), {
  todo: undefined,
  isSubmitting: false,
});

const emit = defineEmits<Emits>();

const isEditMode = ref(!!props.todo);

const formData = reactive({
  title: props.todo?.title || '',
  description: props.todo?.description || '',
});

const validationErrors = reactive<{
  title?: string;
  description?: string;
}>({});

const submitError = ref<string | null>(null);

// Watch for changes to the todo prop (for edit mode)
watch(
  () => props.todo,
  (newTodo) => {
    if (newTodo) {
      isEditMode.value = true;
      formData.title = newTodo.title;
      formData.description = newTodo.description;
    } else {
      isEditMode.value = false;
    }
  }
);

function validateForm(): boolean {
  // Clear previous errors
  validationErrors.title = undefined;
  validationErrors.description = undefined;
  submitError.value = null;

  let isValid = true;

  // Title validation - required and non-empty
  if (!formData.title) {
    validationErrors.title = 'Title is required';
    isValid = false;
  } else if (formData.title.trim().length === 0) {
    validationErrors.title = 'Title cannot be empty or whitespace only';
    isValid = false;
  } else if (formData.title.length > 200) {
    validationErrors.title = 'Title must be 200 characters or less';
    isValid = false;
  }

  // Description validation - optional but has max length
  if (formData.description && formData.description.length > 1000) {
    validationErrors.description = 'Description must be 1000 characters or less';
    isValid = false;
  }

  return isValid;
}

function handleSubmit(): void {
  if (!validateForm()) {
    return;
  }

  try {
    const todoData: CreateTodoDto = {
      title: formData.title.trim(),
      description: formData.description.trim(),
    };

    emit('submit', todoData);
    
    // Clear form after successful submission (only in create mode)
    if (!isEditMode.value) {
      clearForm();
    }
  } catch (error) {
    submitError.value = 'Failed to submit todo. Please try again.';
    console.error('Form submission error:', error);
  }
}

function handleCancel(): void {
  clearForm();
  emit('cancel');
}

function clearForm(): void {
  formData.title = '';
  formData.description = '';
  validationErrors.title = undefined;
  validationErrors.description = undefined;
  submitError.value = null;
}

// Expose clearForm for parent components
defineExpose({
  clearForm,
});
</script>

<style scoped>
.todo-form {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 4px var(--color-shadow);
}

.todo-form h2 {
  margin: 0 0 1.5rem 0;
  font-size: 1.5rem;
  color: var(--color-text-primary);
  font-weight: 600;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  font-size: 0.95rem;
}

.required {
  color: var(--color-error);
  font-weight: bold;
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 1rem;
  font-family: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
  background-color: var(--color-surface);
  color: var(--color-text-primary);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-shadow-md);
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.input-error {
  border-color: var(--color-error);
}

.input-error:focus {
  border-color: var(--color-error);
  box-shadow: 0 0 0 3px rgba(211, 47, 47, 0.1);
}

.error-message {
  display: block;
  margin-top: 0.5rem;
  color: var(--color-error);
  font-size: 0.875rem;
  font-weight: 500;
}

.error-banner {
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: var(--color-error-light);
  border: 1px solid var(--color-error-border);
  border-radius: 4px;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
  font-family: inherit;
  min-height: 44px; /* Touch-friendly size */
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.btn:active:not(:disabled) {
  transform: translateY(0);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: var(--color-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--color-primary-dark);
}

.btn-secondary {
  background-color: var(--color-secondary);
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background-color: var(--color-secondary-dark);
}

/* Responsive design for mobile devices */
@media (max-width: 768px) {
  .todo-form {
    padding: 1rem;
    margin-bottom: 1.5rem;
  }

  .todo-form h2 {
    font-size: 1.25rem;
    margin-bottom: 1rem;
  }

  .form-input {
    padding: 0.625rem;
    font-size: 0.95rem;
  }

  .form-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
