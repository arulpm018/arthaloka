"use client";

import { useMemo, useState } from "react";
import { Plus, ListTodo, ChevronDown } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/EmptyState";
import { TaskItem } from "@/components/productivity/tasks/TaskItem";
import { TaskSheet } from "@/components/productivity/tasks/TaskSheet";
import { useTasks } from "@/hooks/useTasks";
import { useAppStore } from "@/store/useAppStore";
import { Task } from "@/types";
import { dateKey, groupTasks } from "@/lib/utils/productivity";
import { cn } from "@/lib/utils/cn";

export default function TasksPage() {
  const { tasks, isLoading, error, create, update, setCompleted, remove } =
    useTasks();
  const role = useAppStore((s) => s.currentUser?.role);
  const uid = useAppStore((s) => s.currentUser?.uid);

  const today = useMemo(() => new Date(), []);
  const todayKey = dateKey(today);

  const groups = useMemo(() => groupTasks(tasks, todayKey), [tasks, todayKey]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [quickTitle, setQuickTitle] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = quickTitle.trim();
    if (!title || !role || !uid) return;
    setQuickTitle("");
    try {
      await create({
        title,
        notes: null,
        dueDate: null,
        owner: role,
        createdBy: uid,
      });
    } catch {
      // toast sudah ditangani di service caller pattern — biarkan hook melempar
      setQuickTitle(title);
    }
  };

  const handleToggle = async (task: Task, completed: boolean) => {
    try {
      await setCompleted(task.taskId, completed);
    } catch {
      console.error("Failed to toggle task");
    }
  };

  const handleSheetSubmit = async (values: {
    title: string;
    notes: string | null;
    dueDate: string | null;
    owner: Task["owner"];
  }) => {
    if (editingTask) {
      await update(editingTask.taskId, values);
    } else if (role && uid) {
      await create({ ...values, createdBy: uid });
    }
  };

  const handleDelete = async (task: Task) => {
    await remove(task.taskId);
  };

  const openCreate = () => {
    setEditingTask(null);
    setSheetOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setSheetOpen(true);
  };

  const sections: { key: string; label: string; items: Task[] }[] = [
    { key: "overdue", label: "Terlambat", items: groups.overdue },
    { key: "today", label: "Hari Ini", items: groups.today },
    { key: "upcoming", label: "Mendatang", items: groups.upcoming },
    { key: "someday", label: "Tanpa Tenggat", items: groups.someday },
  ].filter((s) => s.items.length > 0);

  return (
    <>
      <Header title="Tugas">
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Tambah
        </Button>
      </Header>

      <div className="mx-auto max-w-2xl p-4">
        {/* Quick add */}
        <form onSubmit={handleQuickAdd} className="flex gap-2">
          <Input
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Tambah tugas cepat…"
            aria-label="Tambah tugas cepat"
          />
          <Button
            type="submit"
            size="icon"
            variant="outline"
            disabled={!quickTitle.trim()}
            aria-label="Tambah"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </form>

        {error && <p className="mt-4 text-xs text-destructive">{error}</p>}

        {isLoading ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Memuat tugas…
          </p>
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={ListTodo}
            title="Belum ada tugas"
            description="Tambahkan tugas pertama kamu di atas."
          />
        ) : (
          <div className="mt-6 space-y-6">
            {sections.map((section) => (
              <section key={section.key}>
                <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {section.label} · {section.items.length}
                </h2>
                <div className="space-y-2">
                  {section.items.map((task) => (
                    <TaskItem
                      key={task.taskId}
                      task={task}
                      today={today}
                      onToggle={handleToggle}
                      onEdit={openEdit}
                    />
                  ))}
                </div>
              </section>
            ))}

            {groups.completed.length > 0 && (
              <section>
                <button
                  type="button"
                  onClick={() => setShowCompleted((v) => !v)}
                  className="mb-2 flex w-full items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform",
                      showCompleted && "rotate-180"
                    )}
                  />
                  Selesai · {groups.completed.length}
                </button>
                {showCompleted && (
                  <div className="space-y-2">
                    {groups.completed.map((task) => (
                      <TaskItem
                        key={task.taskId}
                        task={task}
                        today={today}
                        onToggle={handleToggle}
                        onEdit={openEdit}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </div>

      <TaskSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        task={editingTask}
        onSubmit={handleSheetSubmit}
        onDelete={handleDelete}
      />
    </>
  );
}
