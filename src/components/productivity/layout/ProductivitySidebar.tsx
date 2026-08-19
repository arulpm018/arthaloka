"use client";

import { Sun, ListTodo, CalendarDays, Flame } from "lucide-react";
import {
  CollapsibleSidebar,
  type SidebarGroup,
} from "@/components/layout/CollapsibleSidebar";

const groups: SidebarGroup[] = [
  {
    items: [
      { href: "/productivity", label: "Hari Ini", icon: Sun, exact: true },
      { href: "/productivity/tasks", label: "Tugas", icon: ListTodo },
      { href: "/productivity/schedule", label: "Jadwal", icon: CalendarDays },
      { href: "/productivity/habits", label: "Habit", icon: Flame },
    ],
  },
];

interface ProductivitySidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const ProductivitySidebar = ({
  collapsed,
  onToggle,
}: ProductivitySidebarProps) => (
  <CollapsibleSidebar
    collapsed={collapsed}
    onToggle={onToggle}
    moduleLabel="Produktivitas"
    moduleLabelClassName="text-capybara"
    groups={groups}
  />
);
