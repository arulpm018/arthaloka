"use client";

import { Account, Owner } from "@/types";
import { OWNER_LABELS } from "@/lib/constants/labels";
import { AccountCard } from "./AccountCard";

interface AccountListProps {
  accounts: Account[];
  onAccountTap: (account: Account) => void;
}

const ownerSections: { key: Owner; label: string }[] = [
  { key: "arul", label: OWNER_LABELS["arul"] },
  { key: "fifi", label: OWNER_LABELS["fifi"] },
  { key: "shared", label: OWNER_LABELS["shared"] },
];

export const AccountList = ({ accounts, onAccountTap }: AccountListProps) => {
  const grouped = ownerSections
    .map((section) => ({
      ...section,
      accounts: accounts.filter((a) => a.owner === section.key),
    }))
    .filter((section) => section.accounts.length > 0);

  return (
    <div className="space-y-6">
      {grouped.map((section) => (
        <div key={section.key}>
          <h3 className="mb-2 px-1 text-sm-label font-medium uppercase tracking-wide text-muted-foreground">
            {section.label}
          </h3>
          <div className="space-y-2">
            {section.accounts.map((account) => (
              <AccountCard
                key={account.accountId}
                account={account}
                onTap={() => onAccountTap(account)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
