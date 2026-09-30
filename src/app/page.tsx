import { redirect } from "next/navigation";

/** Launcher modul sudah tidak ada — app langsung ke Beranda. */
export default function RootPage() {
  redirect("/dashboard");
}
