import { addTodo, openRow, titleMaxLength } from "@/lib";
import { useState, type ChangeEvent, type SubmitEvent } from "react";
import { flushSync } from "react-dom";

const titleField = "title";

export default function AddTodoForm() {
  const [length, setLength] = useState(0);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setLength(event.currentTarget.value.length);
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const input = form.elements.namedItem(titleField) as HTMLInputElement;
    const id = flushSync(() => addTodo(input.value));
    if (!id) return;

    form.reset();
    setLength(0);
    const row = document.querySelector<HTMLLIElement>(`[data-todo="${id}"]`);
    if (row) openRow(row);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="v-card v-field-focus group/field flex h-12 items-center gap-3 px-5 sm:h-16 sm:gap-6 sm:px-6"
    >
      <span
        aria-hidden="true"
        className="border-edge group-has-focus-visible/field:border-accent size-5 shrink-0 rounded-full border group-has-focus-visible/field:border-2 motion-safe:transition-[border-color,border-width] sm:size-6"
      />
      <label htmlFor="new-todo" className="sr-only">
        Create a new todo
      </label>
      <input
        id="new-todo"
        name={titleField}
        type="text"
        dir="auto"
        maxLength={titleMaxLength}
        autoComplete="off"
        placeholder="Create a new todo…"
        onChange={handleChange}
        className="text-item sm:text-item-lg text-field-ink caret-accent placeholder:text-muted min-w-0 flex-1 bg-transparent focus-visible:outline-transparent"
      />
      {length === titleMaxLength && (
        <p
          role="status"
          className="text-meta sm:text-meta-lg text-muted shrink-0 tabular-nums"
        >
          {length}/{titleMaxLength}
        </p>
      )}
    </form>
  );
}
