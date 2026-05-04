# TodoFilter Component

## Overview

The `TodoFilter` component provides a user interface for filtering todos by their completion status. It displays three filter buttons (All, Active, Completed) with visual highlighting for the active filter, and shows count badges for active and completed todos.

## Features

- **Three Filter Options**: All, Active, and Completed
- **Active Filter Highlighting**: The currently selected filter is visually highlighted with a green background
- **Count Badges**: Displays the number of active and completed todos
- **Accessible**: Includes proper ARIA labels and keyboard navigation support
- **Responsive**: Adapts layout for mobile devices
- **Touch-Friendly**: Minimum 44px touch targets for mobile usability

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `currentFilter` | `FilterType` | Yes | The currently active filter ('all', 'active', or 'completed') |
| `activeCount` | `number` | Yes | The number of active (incomplete) todos |
| `completedCount` | `number` | Yes | The number of completed todos |

### FilterType

```typescript
type FilterType = 'all' | 'active' | 'completed';
```

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `filter-change` | `FilterType` | Emitted when a filter button is clicked |

## Usage

### Basic Usage

```vue
<template>
  <TodoFilter
    :current-filter="currentFilter"
    :active-count="activeCount"
    :completed-count="completedCount"
    @filter-change="handleFilterChange"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import TodoFilter from './components/TodoFilter.vue';
import type { FilterType } from './types/todo';

const currentFilter = ref<FilterType>('all');
const activeCount = ref(5);
const completedCount = ref(3);

function handleFilterChange(filter: FilterType): void {
  currentFilter.value = filter;
  // Apply filter logic here
}
</script>
```

### With useTodos Composable

```vue
<template>
  <TodoFilter
    :current-filter="currentFilter"
    :active-count="activeCount"
    :completed-count="completedCount"
    @filter-change="setFilter"
  />
</template>

<script setup lang="ts">
import { useTodos } from '../composables/useTodos';
import TodoFilter from './TodoFilter.vue';

const { currentFilter, activeCount, completedCount, setFilter } = useTodos();
</script>
```

## Accessibility Features

### ARIA Labels

- Each filter button has an `aria-label` describing its purpose
- Count badges have `aria-label` attributes for screen readers
- The filter button group has a descriptive `aria-label`

### Keyboard Navigation

- All buttons are keyboard accessible via Tab key
- Buttons can be activated with Enter or Space keys
- Focus indicators are clearly visible

### Screen Reader Support

- `aria-pressed` attribute indicates the active filter state
- Count badges announce the number of todos in each category
- Button labels clearly describe the action

## Styling

The component uses a consistent design system matching other components:

- **Colors**: Green (#4CAF50) for active state, blue for active count, green for completed count
- **Spacing**: Consistent padding and margins
- **Typography**: Clear hierarchy with proper font sizes and weights
- **Shadows**: Subtle box shadows for depth
- **Transitions**: Smooth hover and active state transitions

### Responsive Breakpoints

- **Desktop (>768px)**: Horizontal layout with flexible button widths
- **Tablet (≤768px)**: Adjusted padding and font sizes
- **Mobile (≤480px)**: Vertical button layout for better touch interaction

## Requirements Validation

This component validates the following requirements:

- **Requirement 6.1**: Displays "all" filter option
- **Requirement 6.2**: Displays "active" filter option
- **Requirement 6.3**: Displays "completed" filter option

The component emits filter changes that are handled by the parent component (typically TodoList) which applies the filtering logic as specified in Requirements 6.4 and 6.5.

## Design Patterns

### Controlled Component

The TodoFilter is a controlled component - it receives the current filter state as a prop and emits events when the user wants to change it. The parent component maintains the actual state.

### Event-Driven Architecture

The component uses Vue's event system to communicate filter changes to parent components, maintaining loose coupling and reusability.

### Accessibility-First Design

Following WCAG 2.1 guidelines, the component ensures:
- Sufficient color contrast (4.5:1 for text)
- Touch targets of at least 44x44 pixels
- Keyboard navigation support
- Screen reader compatibility

## Testing

### Unit Tests

Test the component with various prop combinations:

```typescript
import { mount } from '@vue/test-utils';
import TodoFilter from './TodoFilter.vue';

describe('TodoFilter', () => {
  it('highlights the active filter', () => {
    const wrapper = mount(TodoFilter, {
      props: {
        currentFilter: 'active',
        activeCount: 5,
        completedCount: 3,
      },
    });
    
    const activeButton = wrapper.find('[aria-label="Show active todos only"]');
    expect(activeButton.classes()).toContain('filter-btn-active');
  });

  it('emits filter-change event when button is clicked', async () => {
    const wrapper = mount(TodoFilter, {
      props: {
        currentFilter: 'all',
        activeCount: 5,
        completedCount: 3,
      },
    });
    
    await wrapper.find('[aria-label="Show completed todos only"]').trigger('click');
    expect(wrapper.emitted('filter-change')).toBeTruthy();
    expect(wrapper.emitted('filter-change')?.[0]).toEqual(['completed']);
  });

  it('displays correct counts', () => {
    const wrapper = mount(TodoFilter, {
      props: {
        currentFilter: 'all',
        activeCount: 7,
        completedCount: 4,
      },
    });
    
    expect(wrapper.text()).toContain('Active: 7');
    expect(wrapper.text()).toContain('Completed: 4');
  });
});
```

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Requires ES6+ support

## Related Components

- **TodoList**: Parent component that uses TodoFilter
- **TodoItem**: Displays individual todos (filtered by TodoFilter)
- **useTodos**: Composable that provides filter state and logic
