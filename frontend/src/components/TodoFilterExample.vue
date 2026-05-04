<template>
  <div class="example-container">
    <h1>TodoFilter Component Example</h1>
    
    <TodoFilter
      :current-filter="currentFilter"
      :active-count="activeCount"
      :completed-count="completedCount"
      @filter-change="handleFilterChange"
    />

    <div class="example-info">
      <h2>Current Filter: {{ currentFilter }}</h2>
      <p>This example demonstrates the TodoFilter component with:</p>
      <ul>
        <li>Three filter buttons (All, Active, Completed)</li>
        <li>Active filter highlighting</li>
        <li>Count badges showing active and completed todos</li>
        <li>Responsive design for mobile devices</li>
        <li>Accessible ARIA labels and keyboard navigation</li>
      </ul>
      
      <div class="example-actions">
        <p><strong>Try clicking the filter buttons above!</strong></p>
        <p>Current selection: <code>{{ currentFilter }}</code></p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import TodoFilter from './TodoFilter.vue';
import type { FilterType } from '../types/todo';

const currentFilter = ref<FilterType>('all');
const activeCount = ref(5);
const completedCount = ref(3);

function handleFilterChange(filter: FilterType): void {
  currentFilter.value = filter;
  console.log('Filter changed to:', filter);
}
</script>

<style scoped>
.example-container {
  max-width: 800px;
  margin: 2rem auto;
  padding: 1rem;
}

.example-container h1 {
  color: #333;
  margin-bottom: 2rem;
  text-align: center;
}

.example-info {
  background-color: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
  margin-top: 2rem;
}

.example-info h2 {
  color: #4CAF50;
  margin-top: 0;
  margin-bottom: 1rem;
}

.example-info ul {
  margin: 1rem 0;
  padding-left: 1.5rem;
}

.example-info li {
  margin-bottom: 0.5rem;
  color: #666;
}

.example-actions {
  margin-top: 1.5rem;
  padding: 1rem;
  background-color: #fff;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.example-actions p {
  margin: 0.5rem 0;
}

.example-actions code {
  background-color: #f5f5f5;
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  color: #d32f2f;
  font-weight: 600;
}

@media (max-width: 768px) {
  .example-container {
    padding: 0.5rem;
  }

  .example-info {
    padding: 1rem;
  }
}
</style>
