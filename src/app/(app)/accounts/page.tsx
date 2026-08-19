"use client";

import { useState } from "react";
import { Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { AccountList } from "@/components/accounts/AccountList";
import { AccountForm } from "@/components/accounts/AccountForm";
import { AccountDetailSheet } from "@/components/accounts/AccountDetailSheet";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAccounts } from "@/hooks/useAccounts";
import { Account } from "@/types";

export default function AccountsPage() {
  const { accounts, isLoading } = useAccounts();
  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  const handleAccountTap = (account: Account) => {
    setSelectedAccount(account);
    setDetailSheetOpen(true);
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setFormOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailSheetOpen(false);
    setSelectedAccount(null);
  };

  const handleCloseForm = () => {
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

      <div className="mx-auto w-full max-w-4xl p-4 md:max-w-5xl md:p-6">
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
        onClose={handleCloseForm}
        editingAccount={editingAccount}
      />

      <AccountDetailSheet
        open={detailSheetOpen}
        onClose={handleCloseDetail}
        account={selectedAccount}
        onEdit={handleEditAccount}
      />
    </>
  );
}
