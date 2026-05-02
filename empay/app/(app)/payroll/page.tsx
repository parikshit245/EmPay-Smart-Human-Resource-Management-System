"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CreditCard, IndianRupee, Loader2, Plus, Users } from "lucide-react";
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
  status: string;
  createdAt: string;
  _count: { payslips: number };
}

interface PreviewEmployee {
  id: string;
  name: string;
  loginId: string;
  department: string | null;
  basicSalary: number;
  grossPay: number;
  deductions: number;
  netPay: number;
}

interface MissingSalaryEmployee {
  id: string;
  name: string;
  loginId: string;
}

interface PayrollData {
  payruns: Payrun[];
  previewEmployees: PreviewEmployee[];
  missingSalaryEmployees: MissingSalaryEmployee[];
  warnings: {
    withoutBankAccount: number;
    withoutPan: number;
    withoutUan: number;
    withoutDepartment: number;
    withoutManager: number;
    missingSalaryInfo: number;
  };
  latestSummary: {
    totalMonthlyPayroll: number;
    employeesIncluded: number;
    averageNetPay: number;
    totalDeductions: number;
  };
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
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export default function PayrollPage() {
  const router = useRouter();
  const [data, setData] = useState<PayrollData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const payruns = data?.payruns || [];
  const previewEmployees = data?.previewEmployees || [];
  const duplicatePayrun = payruns.find(
    (payrun) => payrun.month === Number(month) && payrun.year === Number(year)
  );
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
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payroll.");
    } finally {
      setLoading(false);
    }
  }

  async function createPayrun(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (duplicatePayrun) {
      setError("A payrun already exists for this month and year.");
      return;
    }
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

  const metrics = [
    {
      label: "Total Monthly Payroll",
      value: money(data?.latestSummary.totalMonthlyPayroll || 0),
      icon: IndianRupee,
      tone: "text-emerald-300",
    },
    {
      label: "Employees Included",
      value: String(data?.latestSummary.employeesIncluded || 0),
      icon: Users,
      tone: "text-indigo-300",
    },
    {
      label: "Average Net Pay",
      value: money(data?.latestSummary.averageNetPay || 0),
      icon: IndianRupee,
      tone: "text-emerald-300",
    },
    {
      label: "Total Deductions",
      value: money(data?.latestSummary.totalDeductions || 0),
      icon: AlertTriangle,
      tone: "text-red-300",
    },
  ];

  const warnings = [
    ["Employees without Bank A/c", data?.warnings.withoutBankAccount || 0, "missingBank"],
    ["Employees without PAN", data?.warnings.withoutPan || 0, "missingPan"],
    ["Employees without UAN", data?.warnings.withoutUan || 0, "missingUan"],
    ["Employees without Department", data?.warnings.withoutDepartment || 0, "missingDepartment"],
    ["Employees without Manager assigned", data?.warnings.withoutManager || 0, "missingManager"],
    ["Employees with missing salary info", data?.warnings.missingSalaryInfo || 0, "missingSalary"],
  ] as const;

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
          <DialogContent className="max-h-[88vh] overflow-y-auto border-slate-800 bg-slate-950 text-slate-100 sm:max-w-5xl">
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

              {duplicatePayrun && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                  A payrun already exists for {months[Number(month) - 1]} {year}.
                </div>
              )}

              {(data?.missingSalaryEmployees || []).length > 0 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-200">
                    <AlertTriangle className="h-4 w-4" />
                    Employees missing salary info
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {data?.missingSalaryEmployees.map((employee) => (
                      <Link
                        key={employee.id}
                        href={`/employees/${employee.id}`}
                        className="rounded-lg border border-amber-500/20 bg-slate-950/40 px-3 py-2 text-sm text-amber-100 hover:bg-amber-500/10"
                      >
                        {employee.name}
                        <span className="ml-2 text-xs text-amber-200/70">{employee.loginId}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {previewEmployees.length === 0 ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-200">
                  No employees with salary info found.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-800">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-900 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-medium">Employee Name</th>
                          <th className="px-4 py-3 font-medium">Login ID</th>
                          <th className="px-4 py-3 font-medium">Basic Salary</th>
                          <th className="px-4 py-3 font-medium">Gross Pay</th>
                          <th className="px-4 py-3 font-medium">Deductions</th>
                          <th className="px-4 py-3 font-medium">Net Pay</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {previewEmployees.map((employee) => (
                          <tr key={employee.id} className="text-slate-300">
                            <td className="px-4 py-3 font-medium text-slate-200">{employee.name}</td>
                            <td className="px-4 py-3 text-slate-500">{employee.loginId}</td>
                            <td className="px-4 py-3">{money(employee.basicSalary)}</td>
                            <td className="px-4 py-3">{money(employee.grossPay)}</td>
                            <td className="px-4 py-3 text-red-300">{money(employee.deductions)}</td>
                            <td className="px-4 py-3 font-semibold text-emerald-300">{money(employee.netPay)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t border-slate-800 bg-slate-900/70">
                        <tr>
                          <td colSpan={5} className="px-4 py-3 font-semibold text-slate-100">
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
              )}

              <Button
                type="submit"
                disabled={creating || previewEmployees.length === 0 || Boolean(duplicatePayrun)}
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="rounded-xl border border-slate-800/70 bg-slate-900/70 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">{metric.label}</p>
                <div className="rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 p-2">
                  <Icon className={`h-4 w-4 ${metric.tone}`} />
                </div>
              </div>
              <p className={`mt-3 text-2xl font-bold ${metric.tone}`}>{metric.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {warnings.map(([label, count, filter]) => (
          <Link
            key={label}
            href={`/employees?filter=${filter}`}
            className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 transition hover:bg-amber-500/15"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-amber-100">{label}</p>
                <p className="mt-2 text-2xl font-bold text-amber-200">{count}</p>
              </div>
              <AlertTriangle className="h-5 w-5 text-amber-300" />
            </div>
          </Link>
        ))}
      </div>

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
                    {payrun._count.payslips} Payslip{payrun._count.payslips !== 1 ? "s" : ""}
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
