import { addTodo, openRow } from "@/lib";
import { type SubmitEvent } from "react";
import { flushSync } from "react-dom";

const titleField = "title";

export default function AddTodoForm() {
  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const input = form.elements.namedItem(titleField) as HTMLInputElement;
    const id = flushSync(() => addTodo(input.value));
    if (!id) return;

    form.reset();
    const row = document.querySelector<HTMLLIElement>(`[data-todo="${id}"]`);
    if (row) openRow(row);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="v-card v-field-focus flex h-12 items-center gap-3 px-5 sm:h-16 sm:gap-6 sm:px-6"
    >
      <span
        aria-hidden="true"
        className="border-edge size-5 shrink-0 rounded-full border sm:size-6"
      />
      <label htmlFor="new-todo" className="sr-only">
        Create a new todo
      </label>
      <input
        id="new-todo"
        name={titleField}
        type="text"
        maxLength={200}
        autoComplete="off"
        placeholder="Create a new todo…"
        className="text-item sm:text-item-lg text-field-ink caret-accent placeholder:text-muted min-w-0 flex-1 bg-transparent outline-none"
      />
    </form>
  );
}
