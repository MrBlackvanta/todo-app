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
          className={`font-bold motion-safe:transition-[color] ${filter === name ? "text-accent" : "text-muted hover:text-ink-hover"}`}
        >
          {filterLabels[name]}
        </button>
      ))}
    </div>
  );
}
