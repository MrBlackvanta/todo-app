import { CheckIcon, CrossIcon } from "@/components/icons";
import { closeRow, removeTodo, toggleTodo } from "@/lib";
import type { Todo } from "@/types";
import { useRef } from "react";
import type { DOMAttributes } from "react";

type TodoRowProps = {
  todo: Todo;
  dragging: boolean;
  describedBy?: string;
  handlers: DOMAttributes<HTMLLIElement>;
};

export default function TodoRow({
  todo,
  dragging,
  describedBy,
  handlers,
}: TodoRowProps) {
  const row = useRef<HTMLLIElement>(null);

  async function remove() {
    const element = row.current;

    if (element) {
      element.style.overflow = "clip";
      await closeRow(element);
    }

    removeTodo(todo.id);
  }

  return (
    <li
      {...handlers}
      ref={row}
      data-todo={todo.id}
      data-dragging={dragging || undefined}
      className="group/row bg-surface data-[dragging]:relative data-[dragging]:z-10"
    >
      <div className="border-divider flex items-center gap-3 border-b px-5 py-4 sm:gap-6 sm:px-6 sm:py-5">
        <label className="relative flex min-w-0 flex-1 items-center gap-3 sm:gap-6">
          <input
            type="checkbox"
            checked={todo.completed}
            aria-describedby={describedBy}
            onChange={() => toggleTodo(todo.id)}
            className="peer sr-only"
          />
          <span
            data-done={todo.completed || undefined}
            className="v-check peer-focus-visible:outline-accent grid size-5 shrink-0 place-items-center rounded-full peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 sm:size-6"
          >
            <CheckIcon className="v-tick w-2.25 text-white sm:w-2.75" />
          </span>
          <span
            className={
              todo.completed
                ? "text-dim text-item sm:text-item-lg line-through motion-safe:transition-[color]"
                : "text-ink text-item sm:text-item-lg motion-safe:transition-[color]"
            }
          >
            {todo.title}
          </span>
        </label>
        <button
          type="button"
          onClick={remove}
          className="v-row-action text-ink dark:text-muted shrink-0 group-focus-within/row:opacity-100 group-hover/row:opacity-100 motion-safe:transition-[opacity]"
        >
          <span className="sr-only">Delete {todo.title}</span>
          <CrossIcon className="size-3 sm:size-4.5" />
        </button>
      </div>
    </li>
  );
}
