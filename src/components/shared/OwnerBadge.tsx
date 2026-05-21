import { cn } from "@/lib/utils/cn";

interface OwnerBadgeProps {
  owner: "arul" | "fifi" | "shared";
  className?: string;
}

const ownerConfig = {
  arul: { label: "Arul", color: "bg-arul/10 text-arul" },
  fifi: { label: "Fifi", color: "bg-fifi/10 text-fifi" },
  shared: { label: "Together", color: "bg-shared/10 text-shared" },
};

export const OwnerBadge = ({ owner, className }: OwnerBadgeProps) => {
  const config = ownerConfig[owner];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs-badge font-medium",
        config.color,
        className
      )}
    >
      {config.label}
    </span>
  );
};
