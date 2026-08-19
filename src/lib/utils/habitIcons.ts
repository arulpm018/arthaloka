import {
  Droplet,
  BookOpen,
  Footprints,
  Dumbbell,
  Bike,
  Salad,
  Sun,
  Moon,
  Smile,
  Heart,
  Pill,
  Sprout,
  Flower2,
  PenLine,
  Guitar,
  Brain,
  PiggyBank,
  PhoneOff,
  Target,
  type LucideIcon,
} from "lucide-react";

export interface HabitIconOption {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const habitIconMap: Record<string, LucideIcon> = {
  droplet: Droplet,
  "book-open": BookOpen,
  footprints: Footprints,
  dumbbell: Dumbbell,
  bike: Bike,
  salad: Salad,
  sun: Sun,
  moon: Moon,
  smile: Smile,
  heart: Heart,
  pill: Pill,
  sprout: Sprout,
  "flower-2": Flower2,
  "pen-line": PenLine,
  guitar: Guitar,
  brain: Brain,
  "piggy-bank": PiggyBank,
  "phone-off": PhoneOff,
};

export const habitIconOptions: HabitIconOption[] = [
  { id: "droplet", label: "Minum air", icon: Droplet },
  { id: "book-open", label: "Baca buku", icon: BookOpen },
  { id: "footprints", label: "Jalan kaki", icon: Footprints },
  { id: "dumbbell", label: "Olahraga", icon: Dumbbell },
  { id: "bike", label: "Sepeda", icon: Bike },
  { id: "salad", label: "Makan sehat", icon: Salad },
  { id: "sun", label: "Bangun pagi", icon: Sun },
  { id: "moon", label: "Tidur cepat", icon: Moon },
  { id: "smile", label: "Gratitude", icon: Smile },
  { id: "heart", label: "Self-care", icon: Heart },
  { id: "pill", label: "Vitamin", icon: Pill },
  { id: "sprout", label: "Menanam", icon: Sprout },
  { id: "flower-2", label: "Meditasi", icon: Flower2 },
  { id: "pen-line", label: "Jurnal", icon: PenLine },
  { id: "guitar", label: "Musik", icon: Guitar },
  { id: "brain", label: "Belajar", icon: Brain },
  { id: "piggy-bank", label: "Nabung", icon: PiggyBank },
  { id: "phone-off", label: "Kurang HP", icon: PhoneOff },
];

/**
 * Get the Lucide icon component for a habit icon ID.
 * Falls back to Target icon if not found.
 */
export function getHabitIcon(iconId: string): LucideIcon {
  return habitIconMap[iconId] || Target;
}
