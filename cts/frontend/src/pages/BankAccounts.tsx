import { useEffect, useState } from "react";
import { Landmark, PlusCircle, Trash2, CheckCircle2, X } from "lucide-react";
import { api } from "../lib/api";
import { useToast } from "../context/ToastContext";
import type { BankAccount } from "../types";
import { SUPPORTED_BANKS } from "../types";
import EmptyState from "../components/EmptyState";
import Skeleton from "../components/Skeleton";

export default function BankAccounts() {
  const [banks, setBanks] = useState<BankAccount[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ bank_name: SUPPORTED_BANKS[0], account_number: "", ifsc: "", account_type: "Savings" });
  const [saving, setSaving] = useState(false);
  const { show } = useToast();

  function load() {
    api.get<BankAccount[]>("/banks").then(setBanks);
  }

  useEffect(load, []);

  async function addBank() {
    if (!form.account_number || !form.ifsc) {
      show("Enter the account number and IFSC code.", "error");
      return;
    }
    setSaving(true);
    try {
      await api.post("/banks", form);
      show("Bank account added.", "success");
      setShowForm(false);
      setForm({ bank_name: SUPPORTED_BANKS[0], account_number: "", ifsc: "", account_type: "Savings" });
      load();
    } catch {
      show("Couldn't add that bank account.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function removeBank(id: string) {
    try {
      await api.delete(`/banks/${id}`);
      show("Bank account removed.", "success");
      load();
    } catch {
      show("Couldn't remove that account.", "error");
    }
  }

  async function makeDefault(id: string) {
    await api.put(`/banks/${id}/default`);
    load();
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-5 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-cream mb-1.5">Your bank accounts</h2>
          <p className="text-sm text-mist">Used when depositing a cheque.</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="btn-primary">
          {showForm ? <X size={15} /> : <PlusCircle size={15} />}
          {showForm ? "Cancel" : "Add Bank Account"}
        </button>
      </div>

      {showForm && (
        <div className="ledger-card p-5 flex flex-col gap-4">
          <div>
            <label className="label-text">Bank</label>
            <select value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} className="input-field">
              {SUPPORTED_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label-text">Account number</label>
              <input value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} className="input-field font-mono" placeholder="0012345678214821" />
            </div>
            <div>
              <label className="label-text">IFSC code</label>
              <input value={form.ifsc} onChange={(e) => setForm({ ...form, ifsc: e.target.value.toUpperCase() })} className="input-field font-mono" placeholder="HDFC0001234" />
            </div>
          </div>
          <div>
            <label className="label-text">Account type</label>
            <select value={form.account_type} onChange={(e) => setForm({ ...form, account_type: e.target.value })} className="input-field">
              <option>Savings</option>
              <option>Current</option>
            </select>
          </div>
          <button onClick={addBank} disabled={saving} className="btn-primary self-start">
            {saving ? "Adding…" : "Add Bank Account"}
          </button>
        </div>
      )}

      {banks === null ? (
        <div className="flex flex-col gap-3">{[0, 1].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : banks.length === 0 && !showForm ? (
        <EmptyState
          icon={<Landmark size={20} />}
          title="No bank accounts yet"
          description="Add a bank account to start depositing cheques."
          actionLabel="Add Bank Account"
          actionTo="#"
        />
      ) : (
        <div className="flex flex-col gap-3">
          {banks?.map((b) => (
            <div key={b.id} className="ledger-card p-5 flex items-start justify-between">
              <div>
                <p className="text-cream font-medium mb-0.5">{b.bank_name}</p>
                <p className="text-xs text-mist mb-2">{b.account_type} Account</p>
                <p className="font-mono text-sm text-cream mb-1">{b.masked_account_number}</p>
                <p className="font-mono text-xs text-mist mb-2">IFSC: {b.ifsc}</p>
                {b.is_verified && (
                  <span className="flex items-center gap-1 text-xs text-success">
                    <CheckCircle2 size={12} /> Verified
                  </span>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                {b.is_default ? (
                  <span className="text-xs font-mono text-gold-500 border border-gold-500/40 rounded-full px-2 py-0.5">Default</span>
                ) : (
                  <button onClick={() => makeDefault(b.id)} className="text-xs text-mist hover:text-gold-500">Set default</button>
                )}
                <button onClick={() => removeBank(b.id)} className="text-mist hover:text-danger">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
