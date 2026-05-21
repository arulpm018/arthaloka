import {
  ShoppingBag,
  Utensils,
  Car,
  Home,
  Zap,
  Heart,
  GraduationCap,
  Gamepad2,
  Shirt,
  Gift,
  Plane,
  Coffee,
  Wifi,
  Phone,
  Stethoscope,
  Baby,
  Dog,
  Dumbbell,
  Music,
  Film,
  BookOpen,
  Briefcase,
  CreditCard,
  Banknote,
  PiggyBank,
  TrendingUp,
  Receipt,
  Package,
  Wrench,
  Scissors,
  type LucideIcon,
} from "lucide-react";

export interface CategoryIconOption {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const categoryIconMap: Record<string, LucideIcon> = {
  "shopping-bag": ShoppingBag,
  utensils: Utensils,
  car: Car,
  home: Home,
  zap: Zap,
  heart: Heart,
  "graduation-cap": GraduationCap,
  gamepad: Gamepad2,
  shirt: Shirt,
  gift: Gift,
  plane: Plane,
  coffee: Coffee,
  wifi: Wifi,
  phone: Phone,
  stethoscope: Stethoscope,
  baby: Baby,
  dog: Dog,
  dumbbell: Dumbbell,
  music: Music,
  film: Film,
  "book-open": BookOpen,
  briefcase: Briefcase,
  "credit-card": CreditCard,
  banknote: Banknote,
  "piggy-bank": PiggyBank,
  "trending-up": TrendingUp,
  receipt: Receipt,
  package: Package,
  wrench: Wrench,
  scissors: Scissors,
};

export const categoryIconOptions: CategoryIconOption[] = [
  { id: "utensils", label: "Makan", icon: Utensils },
  { id: "coffee", label: "Kopi", icon: Coffee },
  { id: "shopping-bag", label: "Belanja", icon: ShoppingBag },
  { id: "car", label: "Transport", icon: Car },
  { id: "home", label: "Rumah", icon: Home },
  { id: "zap", label: "Utilitas", icon: Zap },
  { id: "wifi", label: "Internet", icon: Wifi },
  { id: "phone", label: "Telepon", icon: Phone },
  { id: "heart", label: "Kesehatan", icon: Heart },
  { id: "stethoscope", label: "Medis", icon: Stethoscope },
  { id: "graduation-cap", label: "Pendidikan", icon: GraduationCap },
  { id: "book-open", label: "Buku", icon: BookOpen },
  { id: "gamepad", label: "Hiburan", icon: Gamepad2 },
  { id: "film", label: "Film", icon: Film },
  { id: "music", label: "Musik", icon: Music },
  { id: "dumbbell", label: "Olahraga", icon: Dumbbell },
  { id: "shirt", label: "Pakaian", icon: Shirt },
  { id: "scissors", label: "Perawatan", icon: Scissors },
  { id: "gift", label: "Hadiah", icon: Gift },
  { id: "plane", label: "Travel", icon: Plane },
  { id: "baby", label: "Anak", icon: Baby },
  { id: "dog", label: "Hewan", icon: Dog },
  { id: "briefcase", label: "Kerja", icon: Briefcase },
  { id: "banknote", label: "Gaji", icon: Banknote },
  { id: "credit-card", label: "Cicilan", icon: CreditCard },
  { id: "piggy-bank", label: "Tabungan", icon: PiggyBank },
  { id: "trending-up", label: "Investasi", icon: TrendingUp },
  { id: "receipt", label: "Tagihan", icon: Receipt },
  { id: "wrench", label: "Perbaikan", icon: Wrench },
  { id: "package", label: "Lainnya", icon: Package },
];

/**
 * Get the Lucide icon component for a given icon ID.
 * Falls back to Package icon if not found.
 * Also handles legacy emoji values by returning Package.
 */
export function getCategoryIcon(iconId: string): LucideIcon {
  return categoryIconMap[iconId] || Package;
}
