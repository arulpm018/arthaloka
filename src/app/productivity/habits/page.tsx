"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Flame } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { FAB } from "@/components/layout/FAB";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { HabitRow } from "@/components/productivity/habits/HabitRow";
import { HabitSheet } from "@/components/productivity/habits/HabitSheet";
import { useHabits } from "@/hooks/useHabits";
import { useAppStore } from "@/store/useAppStore";
import { Habit } from "@/types";
import { dateKey, getHabitProgress } from "@/lib/utils/productivity";

/** Suspense wajib untuk useSearchParams pada prerender statis (pola halaman transactions). */
export default function HabitsPage() {
  return (
    <Suspense fallback={<LoadingState variant="page" />}>
      <HabitsPageContent />
    </Suspense>
  );
}

function HabitsPageContent() {
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

  // Deep-link ?add=1 dari FAB halaman "Hari Ini" — buka sheet lalu bersihkan URL
  // supaya refresh tidak membuka sheet lagi.
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (searchParams.get("add") === "1") {
      openCreate();
      router.replace(pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
      {/* Tambah via FAB kanan bawah (hanya untuk habit sendiri) — tombol header dihapus */}
      <Header title="Habit" />

      <div className="mx-auto w-full max-w-2xl p-4 md:max-w-3xl md:p-6">
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

      {/* FAB tambah — hanya untuk habit sendiri (sama seperti tombol header) */}
      {!viewingPartner && (
        <FAB showOnDesktop ariaLabel="Tambah habit" onClick={openCreate} />
      )}
    </>
  );
}
