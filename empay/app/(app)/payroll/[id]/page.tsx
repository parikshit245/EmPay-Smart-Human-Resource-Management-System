"use client";

import { useEffect, useMemo, useState } from "react";
import { CreditCard, Loader2, Printer, Plus, RefreshCw, ShieldCheck, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { PayslipPrint, PayslipPrintStyles } from "@/components/payroll/payslip-print";

interface Payrun {
  id: string;
  month: number;
  year: number;
  status: PayrunStatus;
  createdAt: string;
  payslips: Payslip[];
}

type PayrunStatus = "DRAFT" | "GENERATED" | "REVIEWED" | "APPROVED" | "PAID" | "LOCKED";
type PayslipStatus = "GENERATED" | "VALIDATED" | "PAID";

interface Payslip {
  id: string;
  employeeId: string;
  totalWorkingDays: number;
  attendanceDays: number;
  paidLeaveDays: number;
  basicSalary: number;
  hra: number;
  standardAllowance: number;
  performanceBonus: number;
  lta: number;
  fixedAllowance: number;
  employeePF: number;
  employerPF: number;
  professionalTax: number;
  tdsDeduction: number;
  grossPay: number;
  netPay: number;
  employerCost: number;
  status: PayslipStatus;
  employee: {
    id: string;
    name: string;
    loginId: string;
    department: string | null;
    email: string;
    empCode: string | null;
    location: string | null;
    dateOfJoining: string | null;
    privateInfo: {
      panNo: string | null;
      uanNo: string | null;
      accountNumber: string | null;
      bankName: string | null;
      dateOfJoining: string | null;
    } | null;
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

const payrunStatusStyles: Record<PayrunStatus, string> = {
  DRAFT: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  GENERATED: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  REVIEWED: "border-indigo-500/30 bg-indigo-500/10 text-indigo-300",
  APPROVED: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  PAID: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  LOCKED: "border-amber-500/30 bg-amber-500/10 text-amber-300",
};

const payslipStatusStyles: Record<PayslipStatus, string> = {
  GENERATED: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  VALIDATED: "border-indigo-500/30 bg-indigo-500/10 text-indigo-300",
  PAID: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
};

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function StatusBadge({ status }: { status: PayrunStatus }) {
  return (
    <Badge variant="outline" className={cn("capitalize", payrunStatusStyles[status])}>
      {status.toLowerCase()}
    </Badge>
  );
}

function PayslipStatusBadge({ status }: { status: PayslipStatus }) {
  return (
    <Badge variant="outline" className={cn("capitalize", payslipStatusStyles[status])}>
      {status.toLowerCase()}
    </Badge>
  );
}

function WorkedDaysTab({ payslip }: { payslip: Payslip }) {
  const dailyRate = payslip.totalWorkingDays > 0 ? payslip.grossPay / Math.max(1, payslip.attendanceDays + payslip.paidLeaveDays) : 0;
  const attendanceAmount = dailyRate * payslip.attendanceDays;
  const paidLeaveAmount = dailyRate * payslip.paidLeaveDays;
  return (
    <div className="space-y-4">
      {payslip.attendanceDays === 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          No attendance data was found for this employee in this pay period.
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Days</th>
              <th className="px-4 py-3">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            <tr>
              <td className="px-4 py-3">Attendance</td>
              <td className="px-4 py-3">{payslip.attendanceDays.toFixed(2)} (5 working days/week)</td>
              <td className="px-4 py-3">{money(attendanceAmount)}</td>
            </tr>
            <tr>
              <td className="px-4 py-3">Paid Time Off</td>
              <td className="px-4 py-3">{payslip.paidLeaveDays.toFixed(2)} ({payslip.paidLeaveDays.toFixed(0)} Paid leaves/Month)</td>
              <td className="px-4 py-3">{money(paidLeaveAmount)}</td>
            </tr>
            <tr className="bg-slate-900/70 font-semibold text-slate-100">
              <td className="px-4 py-3">Total</td>
              <td className="px-4 py-3">{(payslip.attendanceDays + payslip.paidLeaveDays).toFixed(2)}</td>
              <td className="px-4 py-3 text-emerald-300">{money(payslip.grossPay)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-sm text-slate-400">
        Salary is calculated based on employee&apos;s monthly attendance. Paid leaves are included in total payable days, while unpaid leaves are deducted from the salary.
      </p>
    </div>
  );
}

function SalaryComputationTab({ payslip }: { payslip: Payslip }) {
  const rows = [
    ["Basic Salary", payslip.basicSalary, "earning"],
    ["House Rent Allowance", payslip.hra, "earning"],
    ["Standard Allowance", payslip.standardAllowance, "earning"],
    ["Performance Bonus", payslip.performanceBonus, "earning"],
    ["Leave Travel Allowance", payslip.lta, "earning"],
    ["Fixed Allowance", payslip.fixedAllowance, "earning"],
    ["Gross", payslip.grossPay, "gross"],
    ["PF Employee", -payslip.employeePF, "deduction"],
    ["PF Employer", -payslip.employerPF, "deduction"],
    ["Professional Tax", -payslip.professionalTax, "deduction"],
    ["TDS Deduction", -payslip.tdsDeduction, "deduction"],
    ["Net Amount", payslip.netPay, "net"],
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-900 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Rule Name</th>
            <th className="px-4 py-3">Rate %</th>
            <th className="px-4 py-3">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 text-slate-300">
          {rows.map(([label, value, type]) => (
            <tr
              key={String(label)}
              className={cn(
                type === "earning" && "bg-emerald-500/[0.03]",
                type === "deduction" && "bg-red-500/[0.04]",
                type === "gross" && "bg-indigo-500/10 font-semibold text-indigo-200",
                type === "net" && "bg-emerald-500/10 font-bold text-emerald-200"
              )}
            >
              <td className="px-4 py-3">{label}</td>
              <td className="px-4 py-3">100</td>
              <td className={cn("px-4 py-3", Number(value) < 0 ? "text-red-300" : "text-slate-100")}>
                {Number(value) < 0 ? `- ${money(Math.abs(Number(value)))}` : money(Number(value))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PayrunDetailPage({ params }: { params: { id: string } }) {
  const [payrun, setPayrun] = useState<Payrun | null>(null);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPayrun() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/payroll/payruns/${params.id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load payrun");
        setPayrun(json.data.payrun);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load payrun.");
      } finally {
        setLoading(false);
      }
    }
    loadPayrun();
  }, [params.id]);

  const monthName = payrun ? months[payrun.month - 1] : "";
  const summary = useMemo(() => {
    const payslips = payrun?.payslips || [];
    return {
      employerCost: payslips.reduce((sum, payslip) => sum + payslip.employerCost, 0),
      gross: payslips.reduce((sum, payslip) => sum + payslip.grossPay, 0),
      net: payslips.reduce((sum, payslip) => sum + payslip.netPay, 0),
    };
  }, [payrun?.payslips]);

  return (
    <div className="space-y-6">
      <PayslipPrintStyles />
      {selectedPayslip && payrun && <PayslipPrint payslip={selectedPayslip} payrun={payrun} />}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100">
              <CreditCard className="h-6 w-6 text-indigo-400" />
              {payrun ? `Payrun for ${monthName} ${payrun.year}` : "Payrun"}
            </h1>
            {payrun && <StatusBadge status={payrun.status} />}
          </div>
          <p className="mt-1 text-sm text-slate-400">Review generated payslips and payroll totals</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="bg-indigo-600 text-white hover:bg-indigo-500">
            <Plus className="h-4 w-4" />
            New Payslip
          </Button>
          <Button className="bg-violet-600 text-white hover:bg-violet-500">
            <RefreshCw className="h-4 w-4" />
            Compute
          </Button>
          <Button variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800">
            <ShieldCheck className="h-4 w-4" />
            Validate
          </Button>
          <Button variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800">
            <X className="h-4 w-4" />
            Cancel
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {payrun && (
        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard label="Employer Cost" value={money(summary.employerCost)} />
          <SummaryCard label="Gross" value={money(summary.gross)} />
          <SummaryCard label="Net" value={money(summary.net)} tone="text-emerald-300" />
          <div className="rounded-xl border border-slate-800/70 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">Status</p>
            <div className="mt-3"><StatusBadge status={payrun.status} /></div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        </div>
      ) : payrun ? (
        <div className="overflow-hidden rounded-xl border border-slate-800/70 bg-slate-900/70">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Employer Cost</th>
                  <th className="px-4 py-3 font-medium">Basic Wage</th>
                  <th className="px-4 py-3 font-medium">Gross Wage</th>
                  <th className="px-4 py-3 font-medium">Net Wage</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Payslip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {payrun.payslips.map((payslip) => (
                  <tr key={payslip.id} className="text-slate-300">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-200">{payslip.employee.name}</div>
                      <div className="text-xs text-slate-500">{payslip.employee.loginId}</div>
                    </td>
                    <td className="px-4 py-3">{money(payslip.employerCost)}</td>
                    <td className="px-4 py-3">{money(payslip.basicSalary)}</td>
                    <td className="px-4 py-3">{money(payslip.grossPay)}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-300">{money(payslip.netPay)}</td>
                    <td className="px-4 py-3"><PayslipStatusBadge status={payslip.status} /></td>
                    <td className="px-4 py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedPayslip(payslip)}
                        className="border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10"
                      >
                        View Payslip
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <Dialog open={Boolean(selectedPayslip)} onOpenChange={(open) => !open && setSelectedPayslip(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto border-slate-800 bg-slate-950 text-slate-100 sm:max-w-5xl">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3">
              <DialogTitle>Payslip</DialogTitle>
              <Button variant="outline" size="sm" onClick={() => window.print()} className="border-slate-700 text-slate-200 hover:bg-slate-800">
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          </DialogHeader>
          {selectedPayslip && payrun && (
            <div className="space-y-5">
              <Tabs defaultValue="worked-days">
                <TabsList>
                  <TabsTrigger value="worked-days">Worked Days</TabsTrigger>
                  <TabsTrigger value="salary-computation">Salary Computation</TabsTrigger>
                </TabsList>
                <TabsContent value="worked-days">
                  <WorkedDaysTab payslip={selectedPayslip} />
                </TabsContent>
                <TabsContent value="salary-computation">
                  <SalaryComputationTab payslip={selectedPayslip} />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ label, value, tone = "text-slate-100" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-slate-800/70 bg-slate-900/70 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={cn("mt-3 text-2xl font-bold", tone)}>{value}</p>
    </div>
  );
}
