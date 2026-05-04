# TodoForm Component

## Overview

The `TodoForm` component is a reusable Vue 3 form component for creating and editing todo items. It provides comprehensive form validation, accessibility features, and responsive design.

## Features

- ✅ **Form Validation**: Client-side validation for title (required) and description (optional)
- ✅ **Accessibility**: ARIA labels, roles, and keyboard navigation support
- ✅ **Responsive Design**: Mobile-first design with touch-friendly controls
- ✅ **Error Display**: Clear validation error messages
- ✅ **Edit Mode**: Supports both create and edit workflows
- ✅ **Auto-clear**: Clears form after successful submission (create mode only)

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `todo` | `Todo \| undefined` | No | `undefined` | Todo object for editing. If provided, form enters edit mode |
| `isSubmitting` | `boolean` | No | `false` | Controls the submitting state (disables form during submission) |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `submit` | `CreateTodoDto` | Emitted when form is submitted with valid data |
| `cancel` | - | Emitted when cancel button is clicked (edit mode only) |

## Usage

### Basic Usage (Create Mode)

```vue
<template>
  <TodoForm @submit="handleCreate" />
</template>

<script setup lang="ts">
import TodoForm from './TodoForm.vue';
import type { CreateTodoDto } from '../types/todo';

function handleCreate(todoData: CreateTodoDto) {
  console.log('Creating todo:', todoData);
  // Call API to create todo
}
</script>
```

### Edit Mode

```vue
<template>
  <TodoForm
    :todo="editingTodo"
    :is-submitting="isSubmitting"
    @submit="handleUpdate"
    @cancel="handleCancel"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import TodoForm from './TodoForm.vue';
import type { Todo, CreateTodoDto } from '../types/todo';

const editingTodo = ref<Todo>({
  id: 1,
  title: 'Buy groceries',
  description: 'Milk, eggs, bread',
  completed: false,
  created_at: '2024-01-15T10:30:00',
  updated_at: '2024-01-15T10:30:00'
});

const isSubmitting = ref(false);

async function handleUpdate(todoData: CreateTodoDto) {
  isSubmitting.value = true;
  try {
    // Call API to update todo
    console.log('Updating todo:', todoData);
  } finally {
    isSubmitting.value = false;
  }
}

function handleCancel() {
  editingTodo.value = undefined;
}
</script>
```

### With State Management

```vue
<template>
  <TodoForm
    :is-submitting="loading"
    @submit="handleSubmit"
  />
</template>

<script setup lang="ts">
import TodoForm from './TodoForm.vue';
import { useTodos } from '../composables/useTodos';
import type { CreateTodoDto } from '../types/todo';

const { createTodo, loading } = useTodos();

async function handleSubmit(todoData: CreateTodoDto) {
  try {
    await createTodo(todoData);
    // Form will auto-clear on success
  } catch (error) {
    console.error('Failed to create todo:', error);
  }
}
</script>
```

## Validation Rules

### Title Field
- **Required**: Must not be empty
- **No whitespace-only**: Must contain at least one non-whitespace character
- **Max length**: 200 characters

### Description Field
- **Optional**: Can be left empty
- **Max length**: 1000 characters

## Accessibility Features

The TodoForm component follows WCAG 2.1 Level AA guidelines:

- **Semantic HTML**: Uses proper form elements (`<form>`, `<label>`, `<input>`, `<textarea>`)
- **ARIA Labels**: All form fields have associated labels
- **ARIA Attributes**:
  - `aria-required="true"` on required fields
  - `aria-invalid` to indicate validation errors
  - `aria-describedby` to link error messages
  - `role="alert"` on error messages
  - `aria-busy` on submit button during submission
- **Keyboard Navigation**: Full keyboard support (Tab, Enter, Escape)
- **Focus Management**: Clear focus indicators
- **Error Announcements**: Screen readers announce validation errors

## Responsive Design

The component is mobile-first and responsive:

- **Desktop (>768px)**: Side-by-side action buttons
- **Mobile (≤768px)**: Stacked action buttons, full-width layout
- **Touch-friendly**: Minimum 44px touch targets
- **Flexible**: Adapts to container width

## Exposed Methods

The component exposes the following methods via `defineExpose`:

### `clearForm()`

Clears all form fields and validation errors.

```vue
<template>
  <TodoForm ref="formRef" @submit="handleSubmit" />
  <button @click="resetForm">Reset</button>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import TodoForm from './TodoForm.vue';

const formRef = ref<InstanceType<typeof TodoForm>>();

function resetForm() {
  formRef.value?.clearForm();
}
</script>
```

## Styling

The component uses scoped CSS with the following design tokens:

- **Primary Color**: #4CAF50 (green)
- **Error Color**: #d32f2f (red)
- **Border Radius**: 4px (inputs), 8px (form container)
- **Spacing**: 0.5rem - 1.5rem
- **Font Sizes**: 0.875rem - 1.5rem

### Customization

To customize the styling, you can override the CSS variables or use deep selectors:

```vue
<style>
.todo-form {
  --primary-color: #2196F3; /* Custom blue */
  --error-color: #f44336;
}

/* Or use deep selectors */
:deep(.btn-primary) {
  background-color: #2196F3;
}
</style>
```

## Requirements Validation

This component validates the following requirements:

- **Requirement 1.1**: Create new todos with title and description
- **Requirement 1.2**: Reject todos with empty titles
- **Requirement 4.1**: Edit existing todos
- **Requirement 4.3**: Validate edited todos (non-empty title)

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: iOS Safari 14+, Chrome Android 90+

## Testing

See `TodoForm.test.ts` for comprehensive unit tests covering:
- Form validation
- Submit event emission
- Edit mode behavior
- Error display
- Accessibility features

## Related Components

- `TodoItem.vue`: Displays individual todo items
- `TodoList.vue`: Container for todo items and form
- `TodoFilter.vue`: Filter controls for todos

## API Reference

### CreateTodoDto Interface

```typescript
interface CreateTodoDto {
  title: string;      // Required, 1-200 characters
  description: string; // Optional, 0-1000 characters
}
```

### Todo Interface

```typescript
interface Todo {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}
```
