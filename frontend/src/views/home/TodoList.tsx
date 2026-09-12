import type { Todo, TodoFilter } from "@/types";
import type { DOMAttributes } from "react";
import TodoRow from "./TodoRow";

const emptyMessages: Record<TodoFilter, string> = {
  all: "Nothing here yet — add your first task above.",
  active: "Nothing left to do.",
  completed: "Nothing completed yet.",
};

type TodoListProps = {
  todos: Todo[];
  filter: TodoFilter;
  draggingId: string | null;
  describedBy?: string;
  rowHandlers: DOMAttributes<HTMLLIElement>;
};

export default function TodoList({
  todos,
  filter,
  draggingId,
  describedBy,
  rowHandlers,
}: TodoListProps) {
  if (todos.length === 0) {
    return (
      <p className="text-muted text-item sm:text-item-lg border-divider border-b px-5 py-4 text-center sm:px-6 sm:py-5">
        {emptyMessages[filter]}
      </p>
    );
  }

  return (
    <ul role="list">
      {todos.map((todo) => (
        <TodoRow
          key={todo.id}
          todo={todo}
          dragging={todo.id === draggingId}
          describedBy={describedBy}
          handlers={rowHandlers}
        />
      ))}
    </ul>
  );
}
