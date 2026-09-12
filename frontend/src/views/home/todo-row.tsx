import { CheckIcon, CrossIcon, EditIcon } from "@/components/icons";
import {
  closeRow,
  removeTodo,
  renameTodo,
  titleMaxLength,
  toggleTodo,
} from "@/lib";
import type { Todo } from "@/types";
import { useRef, useState } from "react";
import type { DOMAttributes, FocusEvent, KeyboardEvent } from "react";
import { flushSync } from "react-dom";

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
  const editButton = useRef<HTMLButtonElement>(null);
  const [editing, setEditing] = useState(false);

  async function remove() {
    if (row.current) await closeRow(row.current);

    removeTodo(todo.id);
  }

  function stopEditing() {
    flushSync(() => setEditing(false));
    editButton.current?.focus();
  }

  function saveDraft(event: FocusEvent<HTMLInputElement>) {
    renameTodo(todo.id, event.currentTarget.value);
    setEditing(false);
  }

  function handleDraftKeys(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      renameTodo(todo.id, event.currentTarget.value);
      stopEditing();
    }

    if (event.key === "Escape") stopEditing();
  }

  return (
    <li
      {...(editing ? {} : handlers)}
      ref={row}
      data-todo={todo.id}
      data-dragging={dragging || undefined}
      className="group/row bg-surface data-[dragging]:relative data-[dragging]:z-10"
    >
      <div
        className={`border-divider flex items-center gap-3 border-b px-5 py-4 sm:gap-6 sm:px-6 sm:py-5 ${editing ? "v-field-focus" : ""}`}
      >
        {editing ? (
          <>
            <span
              aria-hidden="true"
              className="border-edge size-5 shrink-0 rounded-full border sm:size-6"
            />
            <input
              type="text"
              autoFocus
              dir="auto"
              defaultValue={todo.title}
              maxLength={titleMaxLength}
              autoComplete="off"
              aria-label={`Edit ${todo.title}`}
              onBlur={saveDraft}
              onKeyDown={handleDraftKeys}
              className="text-item sm:text-item-lg text-field-ink caret-accent min-w-0 flex-1 bg-transparent focus-visible:outline-transparent"
            />
          </>
        ) : (
          <>
            <label className="relative flex min-w-0 flex-1 cursor-pointer items-center gap-3 sm:gap-6">
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
                dir="auto"
                data-done={todo.completed || undefined}
                className="text-item sm:text-item-lg text-ink data-[done]:text-dim min-w-0 flex-1 wrap-anywhere data-[done]:line-through motion-safe:transition-[color]"
              >
                {todo.title}
              </span>
            </label>
            <div className="v-row-action text-ink dark:text-muted flex shrink-0 items-center gap-3 group-focus-within/row:opacity-100 group-hover/row:opacity-100 motion-safe:transition-[opacity] sm:gap-4.5">
              <button
                ref={editButton}
                type="button"
                onClick={() => setEditing(true)}
                className="-m-1.5 p-1.5"
              >
                <span className="sr-only">Edit {todo.title}</span>
                <EditIcon className="size-3 sm:size-4.5" />
              </button>
              <button type="button" onClick={remove} className="-m-1.5 p-1.5">
                <span className="sr-only">Delete {todo.title}</span>
                <CrossIcon className="size-3 sm:size-4.5" />
              </button>
            </div>
          </>
        )}
      </div>
    </li>
  );
}
