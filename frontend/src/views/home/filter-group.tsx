import { filterLabels, todoFilters } from "@/lib";
import type { TodoFilter } from "@/types";

type FilterGroupProps = {
  filter: TodoFilter;
  onChange: (filter: TodoFilter) => void;
  className?: string;
};

export default function FilterGroup({
  filter,
  onChange,
  className,
}: FilterGroupProps) {
  return (
    <div role="group" aria-label="Filter tasks" className={className}>
      {todoFilters.map((name) => (
        <button
          key={name}
          type="button"
          aria-pressed={filter === name}
          onClick={() => onChange(name)}
          className={
            filter === name
              ? "text-accent font-bold motion-safe:transition-[color]"
              : "text-muted hover:text-ink-hover font-bold motion-safe:transition-[color]"
          }
        >
          {filterLabels[name]}
        </button>
      ))}
    </div>
  );
}
