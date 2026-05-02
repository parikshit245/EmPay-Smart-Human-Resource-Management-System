"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface CompanySettings {
  id: string;
  companyName: string;
  companyLogo: string | null;
}

interface SettingsUser {
  id: string;
  name: string;
  loginId: string;
  email: string;
  role: "ADMIN" | "EMPLOYEE" | "HR_OFFICER" | "PAYROLL_OFFICER";
}

const roles = [
  { value: "ADMIN", label: "Admin" },
  { value: "EMPLOYEE", label: "Employee" },
  { value: "HR_OFFICER", label: "HR Officer" },
  { value: "PAYROLL_OFFICER", label: "Payroll Officer" },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [users, setUsers] = useState<SettingsUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roleSavingId, setRoleSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    const res = await fetch("/api/settings");
    const json = await res.json();
    if (res.ok) {
      setSettings(json.data.settings);
      setUsers(json.data.users || []);
    }
    setLoading(false);
  }

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName: settings.companyName,
        companyLogo: settings.companyLogo,
      }),
    });
    const json = await res.json();
    if (res.ok) {
      setSettings(json.data.settings);
      setMessage("Company settings saved.");
    } else {
      setMessage(json.error || "Failed to save settings.");
    }
    setSaving(false);
  }

  async function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSettings((prev) =>
        prev ? { ...prev, companyLogo: String(reader.result) } : prev
      );
    };
    reader.readAsDataURL(file);
  }

  async function updateRole(id: string, role: SettingsUser["role"]) {
    setRoleSavingId(id);
    const res = await fetch(`/api/settings/users/${id}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const json = await res.json();
    if (res.ok) {
      setUsers((prev) => prev.map((user) => (user.id === id ? json.data.user : user)));
    }
    setRoleSavingId(null);
  }

  if (loading || !settings) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100">
          <Settings className="h-6 w-6 text-indigo-400" />
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-400">Manage organization configuration</p>
      </div>

      {message && (
        <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3 text-sm text-indigo-200">
          {message}
        </div>
      )}

      <form
        onSubmit={saveSettings}
        className="rounded-xl border border-slate-800/70 bg-slate-900/70 p-5"
      >
        <h2 className="mb-4 font-semibold text-slate-100">Company Info</h2>
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div className="space-y-1.5">
            <Label>Company Name</Label>
            <Input
              value={settings.companyName}
              onChange={(event) =>
                setSettings((prev) =>
                  prev ? { ...prev, companyName: event.target.value } : prev
                )
              }
              className="border-slate-700 bg-slate-900 text-slate-100"
            />
          </div>
          <Button disabled={saving} className="bg-indigo-600 text-white hover:bg-indigo-500">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[auto_1fr] md:items-center">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
            {settings.companyLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.companyLogo} alt="Company logo" className="h-full w-full object-cover" />
            ) : (
              <span className="text-lg font-bold text-indigo-300">EP</span>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Company Logo</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="border-slate-700 bg-slate-900 text-slate-100 file:text-slate-200"
            />
          </div>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-800/70 bg-slate-900/70">
        <div className="border-b border-slate-800/70 px-4 py-3">
          <h2 className="font-semibold text-slate-100">Role Management</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/60 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">LoginId</th>
                <th className="px-4 py-3 font-medium">Current Role</th>
                <th className="px-4 py-3 font-medium">Change Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {users.map((user) => (
                <tr key={user.id} className="text-slate-300">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-200">{user.name}</div>
                    <div className="text-xs text-slate-500">{user.email}</div>
                  </td>
                  <td className="px-4 py-3">{user.loginId}</td>
                  <td className="px-4 py-3">{user.role.replace("_", " ")}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Select
                        value={user.role}
                        onValueChange={(value) => updateRole(user.id, value as SettingsUser["role"])}
                        disabled={roleSavingId === user.id}
                      >
                        <SelectTrigger className="w-48 border-slate-700 bg-slate-900 text-slate-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-slate-700 bg-slate-900 text-slate-200">
                          {roles.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {roleSavingId === user.id && (
                        <Loader2 className="h-4 w-4 animate-spin text-indigo-300" />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
