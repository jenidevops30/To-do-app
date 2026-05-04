# TodoItem Component

## Overview

The `TodoItem` component displays an individual todo item with its title, description, completion status, and action buttons. It provides an accessible and responsive interface for interacting with todo items.

## Features

- **Display**: Shows todo title, description (if present), and completion status
- **Checkbox**: Toggle completion status with an accessible checkbox
- **Edit Button**: Triggers edit mode for the todo
- **Delete Button**: Removes the todo from the list
- **Styling**: Visual distinction for completed todos (strikethrough, reduced opacity)
- **Accessibility**: Full ARIA labels, keyboard navigation, and screen reader support
- **Responsive**: Adapts layout for mobile and desktop devices

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `todo` | `Todo` | Yes | The todo object to display |

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

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `toggle` | `id: number` | Emitted when the checkbox is toggled |
| `edit` | `todo: Todo` | Emitted when the edit button is clicked |
| `delete` | `id: number` | Emitted when the delete button is clicked |

## Usage

### Basic Usage

```vue
<template>
  <TodoItem
    :todo="myTodo"
    @toggle="handleToggle"
    @edit="handleEdit"
    @delete="handleDelete"
  />
</template>

<script setup lang="ts">
import TodoItem from './components/TodoItem.vue';
import type { Todo } from './types/todo';

const myTodo: Todo = {
  id: 1,
  title: 'Buy groceries',
  description: 'Milk, eggs, bread',
  completed: false,
  created_at: '2024-01-15T10:30:00',
  updated_at: '2024-01-15T10:30:00',
};

function handleToggle(id: number): void {
  console.log('Toggle todo:', id);
  // Update todo completion status
}

function handleEdit(todo: Todo): void {
  console.log('Edit todo:', todo);
  // Open edit form with todo data
}

function handleDelete(id: number): void {
  console.log('Delete todo:', id);
  // Delete the todo
}
</script>
```

### With List

```vue
<template>
  <div class="todo-list">
    <TodoItem
      v-for="todo in todos"
      :key="todo.id"
      :todo="todo"
      @toggle="handleToggle"
      @edit="handleEdit"
      @delete="handleDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import TodoItem from './components/TodoItem.vue';
import type { Todo } from './types/todo';

const todos = ref<Todo[]>([
  {
    id: 1,
    title: 'Buy groceries',
    description: 'Milk, eggs, bread',
    completed: false,
    created_at: '2024-01-15T10:30:00',
    updated_at: '2024-01-15T10:30:00',
  },
  {
    id: 2,
    title: 'Complete project',
    description: '',
    completed: true,
    created_at: '2024-01-14T09:00:00',
    updated_at: '2024-01-15T14:20:00',
  },
]);

function handleToggle(id: number): void {
  const todo = todos.value.find(t => t.id === id);
  if (todo) {
    todo.completed = !todo.completed;
  }
}

function handleEdit(todo: Todo): void {
  // Open edit form
}

function handleDelete(id: number): void {
  todos.value = todos.value.filter(t => t.id !== id);
}
</script>
```

## Styling

The component uses scoped CSS with the following key features:

### Visual States

- **Default**: White background with subtle border
- **Hover**: Elevated shadow and darker border
- **Completed**: Gray background, reduced opacity, strikethrough title

### Responsive Breakpoints

- **Desktop (>768px)**: Horizontal layout with actions on the right
- **Mobile (≤768px)**: Vertical layout, button text hidden, icons only
- **Small Mobile (≤480px)**: Reduced padding and spacing

### Accessibility Features

- **Checkbox**: Native HTML checkbox with custom styling
- **ARIA Labels**: Descriptive labels for all interactive elements
- **Focus Indicators**: Clear focus outlines for keyboard navigation
- **Touch Targets**: Minimum 44px touch targets for mobile
- **Screen Reader Support**: Visually hidden text for status information

## Accessibility

The component follows WCAG 2.1 Level AA guidelines:

1. **Semantic HTML**: Uses proper HTML elements (checkbox, buttons)
2. **ARIA Attributes**: Includes `aria-label`, `aria-invalid`, `aria-describedby`
3. **Keyboard Navigation**: All interactive elements are keyboard accessible
4. **Focus Management**: Clear focus indicators with proper contrast
5. **Screen Reader Support**: Descriptive labels and hidden status text
6. **Color Contrast**: Meets WCAG AA contrast requirements
7. **Touch Targets**: Minimum 44x44px for touch devices

## Requirements Validation

This component validates the following requirements:

- **Requirement 2.4**: Display todos in a readable format showing title, description, and completion status
- **Requirement 3.1**: Toggle todo completion status
- **Requirement 4.1**: Edit existing todos (triggers edit event)
- **Requirement 5.1**: Delete todos (triggers delete event)

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Notes

- The component is fully controlled - it does not manage its own state
- All state changes are communicated via events to the parent component
- The description is only displayed if it's not empty
- Completed todos have visual styling (strikethrough, reduced opacity)
- The component is fully responsive and works on all screen sizes
