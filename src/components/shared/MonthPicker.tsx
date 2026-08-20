"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMonthYear } from "@/lib/utils/formatDate";
import { addMonths, subMonths } from "date-fns";

interface MonthPickerProps {
  value: Date;
  onChange: (date: Date) => void;
}

export const MonthPicker = ({ value, onChange }: MonthPickerProps) => {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onChange(subMonths(value, 1))}
        aria-label="Bulan sebelumnya"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-base font-semibold min-w-[110px] text-center">
        {formatMonthYear(value)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onChange(addMonths(value, 1))}
        aria-label="Bulan berikutnya"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};
