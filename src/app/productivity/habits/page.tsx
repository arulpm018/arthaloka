"use client";

import { useMemo, useState } from "react";
import { Plus, Flame } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/EmptyState";
import { HabitRow } from "@/components/productivity/habits/HabitRow";
import { HabitSheet } from "@/components/productivity/habits/HabitSheet";
import { useHabits } from "@/hooks/useHabits";
import { useAppStore } from "@/store/useAppStore";
import { Habit } from "@/types";
import { dateKey, getHabitProgress } from "@/lib/utils/productivity";

export default function HabitsPage() {
  const currentUser = useAppStore((s) => s.currentUser);
  const partner = useAppStore((s) => s.partner);

  const [viewingPartner, setViewingPartner] = useState(false);
  const activeUid = viewingPartner ? partner?.uid : currentUser?.uid;

  const { habits, isLoading, error, create, update, toggleDate, remove } =
    useHabits(activeUid);

  const today = useMemo(() => new Date(), []);
  const todayKey = dateKey(today);
  const progress = getHabitProgress(habits, today);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  const openCreate = () => {
    setEditingHabit(null);
    setSheetOpen(true);
  };

  const openEdit = (habit: Habit) => {
    setEditingHabit(habit);
    setSheetOpen(true);
  };

  const handleToggleToday = async (habit: Habit, done: boolean) => {
    try {
      await toggleDate(habit.habitId, todayKey, done);
    } catch {
      console.error("Failed to toggle habit");
    }
  };

  const handleSheetSubmit = async (values: {
    name: string;
    icon: string;
    frequency: Habit["frequency"];
  }) => {
    if (editingHabit) {
      await update(editingHabit.habitId, values);
    } else if (currentUser?.uid) {
      await create({ ...values, uid: currentUser.uid });
    }
  };

  return (
    <>
      <Header title="Habit">
        {!viewingPartner && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Tambah
          </Button>
        )}
      </Header>

      <div className="mx-auto max-w-2xl p-4">
        {partner && (
          <Tabs
            value={viewingPartner ? "partner" : "me"}
            onValueChange={(v) => setViewingPartner(v === "partner")}
            className="mb-4"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="me">Saya</TabsTrigger>
              <TabsTrigger value="partner">
                {partner.displayName || "Pasangan"}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {error && <p className="mb-4 text-xs text-destructive">{error}</p>}

        {/* Progress hari ini */}
        {habits.length > 0 && (
          <div className="mb-4 rounded-lg border border-border bg-card p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">Hari ini</span>
              <span className="tabular-nums text-muted-foreground">
                {progress.done}/{progress.total}
              </span>
            </div>
            <Progress
              value={progress.total === 0 ? 0 : (progress.done / progress.total) * 100}
            />
          </div>
        )}

        {isLoading ? (
          <p className="text-center text-sm text-muted-foreground">
            Memuat habit…
          </p>
        ) : habits.length === 0 ? (
          <EmptyState
            icon={Flame}
            title={viewingPartner ? "Belum ada habit" : "Mulai habit pertama"}
            description={
              viewingPartner
                ? `${partner?.displayName ?? "Pasangan"} belum membuat habit.`
                : "Bangun rutinitas kecil yang konsisten."
            }
          />
        ) : (
          <div className="space-y-2">
            {habits.map((habit) => (
              <HabitRow
                key={habit.habitId}
                habit={habit}
                today={today}
                editable={!viewingPartner}
                onToggleToday={handleToggleToday}
                onEdit={openEdit}
              />
            ))}
          </div>
        )}
      </div>

      <HabitSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        habit={editingHabit}
        onSubmit={handleSheetSubmit}
        onDelete={(habit) => remove(habit.habitId)}
      />
    </>
  );
}
