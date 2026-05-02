"use client";

import { useEffect, useMemo, useState } from "react";
import { CreditCard, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Payrun {
  id: string;
  month: number;
  year: number;
  createdAt: string;
  _count: { payslips: number };
}

interface PreviewEmployee {
  id: string;
  name: string;
  loginId: string;
  department: string | null;
  basicSalary: number;
  deductions: number;
  netPay: number;
}

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function PayrollPage() {
  const router = useRouter();
  const [payruns, setPayruns] = useState<Payrun[]>([]);
  const [previewEmployees, setPreviewEmployees] = useState<PreviewEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const totalNetPayable = useMemo(
    () => previewEmployees.reduce((sum, employee) => sum + employee.netPay, 0),
    [previewEmployees]
  );

  useEffect(() => {
    loadPayruns();
  }, []);

  async function loadPayruns() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payroll/payruns");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load payroll");
      setPayruns(json.data.payruns || []);
      setPreviewEmployees(json.data.previewEmployees || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payroll.");
    } finally {
      setLoading(false);
    }
  }

  async function createPayrun(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/payroll/payruns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: Number(month), year: Number(year) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create payrun");
      setDialogOpen(false);
      await loadPayruns();
      router.push(`/payroll/${json.data.payrun.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create payrun.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100">
            <CreditCard className="h-6 w-6 text-indigo-400" />
            Payroll
          </h1>
          <p className="mt-1 text-sm text-slate-400">Manage payruns and payslips</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500">
              <Plus className="h-4 w-4" />
              Create Payrun
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[88vh] overflow-y-auto border-slate-800 bg-slate-950 text-slate-100 sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>Create Payrun</DialogTitle>
            </DialogHeader>
            <form className="space-y-5" onSubmit={createPayrun}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Month</Label>
                  <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger className="w-full border-slate-700 bg-slate-900 text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-slate-700 bg-slate-900 text-slate-200">
                      {months.map((name, index) => (
                        <SelectItem key={name} value={String(index + 1)}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Year</Label>
                  <Input
                    required
                    min={2000}
                    max={2100}
                    type="number"
                    value={year}
                    onChange={(event) => setYear(event.target.value)}
                    className="border-slate-700 bg-slate-900 text-slate-100"
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-800">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Employee Name</th>
                        <th className="px-4 py-3 font-medium">Basic Salary</th>
                        <th className="px-4 py-3 font-medium">Deductions</th>
                        <th className="px-4 py-3 font-medium">Net Pay</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {previewEmployees.map((employee) => (
                        <tr key={employee.id} className="text-slate-300">
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-200">{employee.name}</div>
                            <div className="text-xs text-slate-500">{employee.loginId}</div>
                          </td>
                          <td className="px-4 py-3">{money(employee.basicSalary)}</td>
                          <td className="px-4 py-3">{money(employee.deductions)}</td>
                          <td className="px-4 py-3 font-semibold text-emerald-300">
                            {money(employee.netPay)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-slate-800 bg-slate-900/70">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 font-semibold text-slate-100">
                          Total Net Payable
                        </td>
                        <td className="px-4 py-3 text-lg font-bold text-emerald-300">
                          {money(totalNetPayable)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <Button
                type="submit"
                disabled={creating || previewEmployees.length === 0}
                className="w-full bg-indigo-600 text-white hover:bg-indigo-500"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                Generate Payslips
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        </div>
      ) : payruns.length === 0 ? (
        <div className="rounded-xl border border-slate-800/70 bg-slate-900/70 py-16 text-center">
          <CreditCard className="mx-auto h-10 w-10 text-slate-600" />
          <p className="mt-3 text-sm text-slate-400">No payruns generated yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {payruns.map((payrun) => (
            <button
              key={payrun.id}
              onClick={() => router.push(`/payroll/${payrun.id}`)}
              className="rounded-xl border border-slate-800/70 bg-slate-900/70 p-5 text-left transition hover:border-indigo-500/50 hover:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-slate-100">
                    Payrun for {months[payrun.month - 1]} {payrun.year}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {payrun._count.payslips} Payslip
                    {payrun._count.payslips !== 1 ? "s" : ""}
                  </p>
                </div>
                <CreditCard className="h-5 w-5 text-indigo-300" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
