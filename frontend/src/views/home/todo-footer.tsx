import { clearCompleted } from "@/lib";
import type { TodoFilter } from "@/types";
import FilterGroup from "./filter-group";

type TodoFooterProps = {
  activeCount: number;
  completedCount: number;
  filter: TodoFilter;
  onFilterChange: (filter: TodoFilter) => void;
};

export default function TodoFooter({
  activeCount,
  completedCount,
  filter,
  onFilterChange,
}: TodoFooterProps) {
  return (
    <div className="text-meta sm:text-meta-lg text-muted grid h-12.5 grid-cols-[1fr_auto_1fr] items-center px-5 sm:h-12.25 sm:px-6">
      <p role="status" className="col-start-1 justify-self-start">
        {activeCount} {activeCount === 1 ? "item" : "items"} left
      </p>
      <FilterGroup
        filter={filter}
        onChange={onFilterChange}
        className="text-meta-lg col-start-2 flex gap-4.5 max-sm:hidden"
      />
      <button
        type="button"
        onClick={clearCompleted}
        disabled={completedCount === 0}
        className="enabled:hover:text-ink-hover disabled:text-dim col-start-3 justify-self-end motion-safe:transition-[color]"
      >
        Clear Completed
      </button>
    </div>
  );
}
