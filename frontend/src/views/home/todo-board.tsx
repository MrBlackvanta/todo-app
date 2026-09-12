"use client";

import { useReorder } from "@/hooks";
import { countActive, filterTodos, useTodos } from "@/lib";
import type { TodoFilter } from "@/types";
import { useState } from "react";
import AddTodoForm from "./add-todo-form";
import FilterGroup from "./filter-group";
import TodoFooter from "./todo-footer";
import TodoList from "./todo-list";

const reorderHelpId = "reorder-help";

export default function TodoBoard() {
  const [filter, setFilter] = useState<TodoFilter>("all");
  const todos = useTodos();
  const activeCount = countActive(todos);
  const reorderable = filter === "all" && todos.length > 1;
  const { draggingId, notice, rowHandlers } = useReorder(todos, reorderable);

  return (
    <>
      <AddTodoForm />
      <section
        aria-label="Your tasks"
        className="v-card mt-4 overflow-hidden sm:mt-6"
      >
        <div className="v-reserve">
          <TodoList
            todos={filterTodos(todos, filter)}
            filter={filter}
            draggingId={draggingId}
            describedBy={reorderable ? reorderHelpId : undefined}
            rowHandlers={rowHandlers}
          />
        </div>
        <TodoFooter
          activeCount={activeCount}
          completedCount={todos.length - activeCount}
          filter={filter}
          onFilterChange={setFilter}
        />
      </section>
      <FilterGroup
        filter={filter}
        onChange={setFilter}
        className="v-card text-meta-lg mt-4 flex h-12 items-center justify-center gap-4.5 sm:hidden"
      />
      <p id={reorderHelpId} className="sr-only">
        Press Alt with the up or down arrow key to move this task.
      </p>
      <p key={notice.id} role="status" className="sr-only">
        {notice.text}
      </p>
    </>
  );
}
