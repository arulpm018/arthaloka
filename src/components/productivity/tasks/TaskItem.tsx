"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Task } from "@/types";
import { formatDueLabel, dateKey } from "@/lib/utils/productivity";

interface TaskItemProps {
  task: Task;
  today: Date;
  onToggle: (task: Task, completed: boolean) => void;
  onEdit: (task: Task) => void;
}

export const TaskItem = ({ task, today, onToggle, onEdit }: TaskItemProps) => {
  const isOverdue =
    !task.completed && !!task.dueDate && task.dueDate < dateKey(today);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onEdit(task)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit(task);
        }
      }}
      className="flex w-full items-start gap-3 rounded-lg border border-border bg-card p-3.5 text-left transition-colors hover:bg-accent/50 active:bg-accent"
    >
      <Checkbox
        checked={task.completed}
        onCheckedChange={(checked) => onToggle(task, checked === true)}
        onClick={(e) => e.stopPropagation()}
        className="mt-0.5"
        aria-label={`Tandai "${task.title}" ${task.completed ? "belum selesai" : "selesai"}`}
      />

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-medium leading-snug",
            task.completed && "text-muted-foreground line-through"
          )}
        >
          {task.title}
        </p>
        {task.notes && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {task.notes}
          </p>
        )}
        {(task.dueDate || task.owner === "shared") && (
          <div className="mt-1.5 flex items-center gap-2 text-xs">
            {task.dueDate && (
              <span
                className={cn(
                  isOverdue
                    ? "font-medium text-expense"
                    : "text-muted-foreground"
                )}
              >
                {formatDueLabel(task.dueDate, today)}
              </span>
            )}
            {task.owner === "shared" && (
              <span className="inline-flex items-center gap-1 text-capybara">
                <Users className="h-3 w-3" aria-hidden="true" />
                Berdua
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
