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
      tone: "text-[#28a745]",
    },
    {
      label: "Employees Included",
      value: String(data?.latestSummary.employeesIncluded || 0),
      icon: Users,
      tone: "text-primary",
    },
    {
      label: "Average Net Pay",
      value: money(data?.latestSummary.averageNetPay || 0),
      icon: IndianRupee,
      tone: "text-[#28a745]",
    },
    {
      label: "Total Deductions",
      value: money(data?.latestSummary.totalDeductions || 0),
      icon: AlertTriangle,
      tone: "text-[#dc3545]",
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
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[#1a1c24]">
            <CreditCard className="h-6 w-6 text-primary" />
            Payroll
          </h1>
          <p className="mt-1 text-sm text-[#6c757d]">Manage payruns and payslips</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-white hover:bg-[#5a3a52]">
              <Plus className="h-4 w-4" />
              Create Payrun
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[88vh] overflow-y-auto border-[#ede7f6] bg-[#f4f5f7] text-[#1a1c24] sm:max-w-5xl">
            <DialogHeader>
              <DialogTitle>Create Payrun</DialogTitle>
            </DialogHeader>
            <form className="space-y-5" onSubmit={createPayrun}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Month</Label>
                  <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger className="w-full border-[#e5e7eb] bg-[#ffffff] text-[#1a1c24]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-[#e5e7eb] bg-[#ffffff] text-[#374151]">
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
                    className="border-[#e5e7eb] bg-[#ffffff] text-[#1a1c24]"
                  />
                </div>
              </div>

              {duplicatePayrun && (
                <div className="rounded-lg border border-[#dc3545]/30 bg-[#fdecea] p-3 text-sm text-[#dc3545]">
                  A payrun already exists for {months[Number(month) - 1]} {year}.
                </div>
              )}

              {(data?.missingSalaryEmployees || []).length > 0 && (
                <div className="rounded-xl border border-yellow-500/30 bg-yellow-50/50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-yellow-800">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    Employees missing salary info
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {data?.missingSalaryEmployees.map((employee) => (
                      <Link
                        key={employee.id}
                        href={`/employees/${employee.id}`}
                        className="rounded-lg border border-yellow-500/20 bg-background px-3 py-2 text-sm text-foreground hover:bg-yellow-50 hover:border-yellow-500/40 transition-colors"
                      >
                        <span className="font-medium">{employee.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{employee.loginId}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {previewEmployees.length === 0 ? (
                <div className="rounded-xl border border-[#fbb130]/40 bg-[#fff8ec] p-5 text-sm text-[#b26f00]">
                  No employees with salary info found.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-[#ede7f6]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[#ffffff] text-xs uppercase text-[#6c757d]">
                        <tr>
                          <th className="px-4 py-3 font-medium">Employee Name</th>
                          <th className="px-4 py-3 font-medium">Login ID</th>
                          <th className="px-4 py-3 font-medium">Basic Salary</th>
                          <th className="px-4 py-3 font-medium">Gross Pay</th>
                          <th className="px-4 py-3 font-medium">Deductions</th>
                          <th className="px-4 py-3 font-medium">Net Pay</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#ede7f6]">
                        {previewEmployees.map((employee) => (
                          <tr key={employee.id} className="text-[#374151]">
                            <td className="px-4 py-3 font-medium text-[#374151]">{employee.name}</td>
                            <td className="px-4 py-3 text-[#6c757d]">{employee.loginId}</td>
                            <td className="px-4 py-3">{money(employee.basicSalary)}</td>
                            <td className="px-4 py-3">{money(employee.grossPay)}</td>
                            <td className="px-4 py-3 text-[#dc3545]">{money(employee.deductions)}</td>
                            <td className="px-4 py-3 font-semibold text-[#28a745]">{money(employee.netPay)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t border-[#ede7f6] bg-[#ffffff] shadow-[0_1px_4px_rgba(113,75,103,0.10)]">
                        <tr>
                          <td colSpan={5} className="px-4 py-3 font-semibold text-[#1a1c24]">
                            Total Net Payable
                          </td>
                          <td className="px-4 py-3 text-lg font-bold text-[#28a745]">
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
                className="w-full bg-primary text-white hover:bg-[#5a3a52]"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                Generate Payslips
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="rounded-lg border border-[#dc3545]/30 bg-[#fdecea] p-3 text-sm text-[#dc3545]">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="rounded-2xl border border-border bg-card shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6 transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                <div className="rounded-lg bg-primary/5 p-2">
                  <Icon className={`h-4 w-4 ${metric.tone}`} />
                </div>
              </div>
              <p className={`mt-3 text-2xl font-bold ${metric.tone}`}>{metric.value}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-[0_2px_8px_rgba(0,0,0,0.05)] overflow-hidden transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1">
        <div className="border-b border-border bg-muted/30 px-6 py-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-card-foreground">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Incomplete Employee Info
          </h2>
          <p className="text-xs text-muted-foreground mt-1 ml-6">
            Resolve these missing details before generating payslips.
          </p>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {warnings.map(([label, count, filter]) => (
            <Link
              key={label}
              href={`/employees?filter=${filter}`}
              className="flex items-center justify-between rounded-lg border border-yellow-500/30 bg-yellow-50/50 p-3 transition-all hover:bg-yellow-50 hover:border-yellow-500/50 hover:shadow-sm group"
            >
              <p className="text-sm font-medium text-yellow-800 transition-colors">{label}</p>
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-yellow-100 px-2.5 text-xs font-bold text-yellow-800 ring-1 ring-inset ring-yellow-500/30">
                {count}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : payruns.length === 0 ? (
        <div className="rounded-xl border border-[#ede7f6] bg-[#ffffff] shadow-[0_1px_4px_rgba(113,75,103,0.10)] py-16 text-center">
          <CreditCard className="mx-auto h-10 w-10 text-[#adb5bd]" />
          <p className="mt-3 text-sm text-[#6c757d]">No payruns generated yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {payruns.map((payrun) => (
            <button
              key={payrun.id}
              onClick={() => router.push(`/payroll/${payrun.id}`)}
              className="rounded-2xl border border-border bg-card shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6 text-left transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1 hover:border-primary/50"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    Payrun for {months[payrun.month - 1]} {payrun.year}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {payrun._count.payslips} Payslip{payrun._count.payslips !== 1 ? "s" : ""}
                  </p>
                </div>
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
