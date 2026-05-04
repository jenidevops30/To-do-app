export interface Todo {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTodoDto {
  title: string;
  description: string;
}

export interface UpdateTodoDto {
  title?: string;
  description?: string;
  completed?: boolean;
}

export type FilterType = 'all' | 'active' | 'completed';

export interface ApiError {
  error: string;
  errors?: Record<string, string[]>;
}
