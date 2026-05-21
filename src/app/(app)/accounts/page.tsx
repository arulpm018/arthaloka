"use client";

import { useState } from "react";
import { Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { AccountList } from "@/components/accounts/AccountList";
import { AccountForm } from "@/components/accounts/AccountForm";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAccounts } from "@/hooks/useAccounts";
import { Account } from "@/types";

export default function AccountsPage() {
  const { accounts, isLoading } = useAccounts();
  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const handleAccountTap = (account: Account) => {
    setEditingAccount(account);
    setFormOpen(true);
  };

  const handleClose = () => {
    setFormOpen(false);
    setEditingAccount(null);
  };

  return (
    <>
      <Header title="Akun">
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Tambah
        </Button>
      </Header>

      <div className="p-4 max-w-4xl mx-auto">
        {isLoading ? (
          <LoadingState variant="list" count={5} />
        ) : accounts.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Belum ada akun"
            description="Tambahkan akun keuangan pertama kamu"
            action={
              <Button size="sm" onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Tambah Akun
              </Button>
            }
          />
        ) : (
          <AccountList accounts={accounts} onAccountTap={handleAccountTap} />
        )}
      </div>

      <AccountForm
        open={formOpen}
        onClose={handleClose}
        editingAccount={editingAccount}
      />
    </>
  );
}
