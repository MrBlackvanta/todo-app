import type { Todo, TodoFilter } from "@/types";

export const todoFilters: TodoFilter[] = ["all", "active", "completed"];

export const filterLabels: Record<TodoFilter, string> = {
  all: "All",
  active: "Active",
  completed: "Completed",
};

export function filterTodos(todos: Todo[], filter: TodoFilter) {
  if (filter === "active") return todos.filter((todo) => !todo.completed);
  if (filter === "completed") return todos.filter((todo) => todo.completed);

  return todos;
}

export function countActive(todos: Todo[]) {
  return todos.reduce((total, todo) => total + (todo.completed ? 0 : 1), 0);
}
