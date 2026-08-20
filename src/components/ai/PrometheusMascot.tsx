import type { SVGProps } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Maskot Prometheus — capybara dengan jeruk di atas kepala.
 * Flat-first: dua keluarga warna (coklat hangat + oranye jeruk) di atas
 * krem solid. Desain sederhana supaya tetap terbaca di 16–24px.
 */
export const PrometheusMascot = ({
  className,
  ...props
}: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 64 64"
    role="img"
    aria-label="Prometheus, maskot capybara"
    className={cn("shrink-0 select-none", className)}
    {...props}
  >
    {/* Latar krem */}
    <rect width="64" height="64" rx="15" fill="#F5E7D3" />
    {/* Telinga capybara — kecil, bulat, berpasangan */}
    <rect x="14" y="10" width="10" height="12" rx="5" fill="#9A6B45" />
    <rect x="40" y="10" width="10" height="12" rx="5" fill="#9A6B45" />
    {/* Kepala — kotak membulat khas capybara */}
    <rect x="10.5" y="16.5" width="43" height="37" rx="15.5" fill="#B5875B" />
    {/* Jeruk di atas kepala — signature capybara */}
    <circle cx="32" cy="10.5" r="6.4" fill="#F59E3B" />
    <circle cx="30.2" cy="8.6" r="1.8" fill="#FBB25C" />
    {/* Moncong */}
    <rect x="23" y="33.5" width="18" height="15" rx="7.5" fill="#D9B48D" />
    {/* Mata sipir — capybara santai */}
    <circle cx="21.5" cy="29" r="2.2" fill="#543C29" />
    <circle cx="42.5" cy="29" r="2.2" fill="#543C29" />
    {/* Hidung */}
    <rect x="29.3" y="34.4" width="5.4" height="4" rx="2" fill="#543C29" />
    {/* Senyum tipis */}
    <path
      d="M29 43 Q32 45.4 35 43"
      stroke="#543C29"
      strokeWidth="1.7"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);
