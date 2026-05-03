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
  DRAFT: "border-primary/30 bg-[#ede7f6] text-[#374151]",
  GENERATED: "border-[#1bb6f9]/30 bg-[#e8f7ff] text-[#1bb6f9]",
  REVIEWED: "border-primary/30 bg-[#ede7f6] text-primary",
  APPROVED: "border-primary/30 bg-[#ede7f6] text-primary",
  PAID: "border-[#28a745]/30 bg-[#edf7ef] text-[#28a745]",
  LOCKED: "border-[#fbb130]/40 bg-[#fff8ec] text-[#b26f00]",
};

const payslipStatusStyles: Record<PayslipStatus, string> = {
  GENERATED: "border-[#1bb6f9]/30 bg-[#e8f7ff] text-[#1bb6f9]",
  VALIDATED: "border-primary/30 bg-[#ede7f6] text-primary",
  PAID: "border-[#28a745]/30 bg-[#edf7ef] text-[#28a745]",
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
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-50/50 p-3 text-sm text-yellow-800">
          No attendance data was found for this employee in this pay period.
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-border shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/30 text-xs uppercase text-muted-foreground border-b border-border">
            <tr>
              <th className="px-5 py-4 font-medium">Type</th>
              <th className="px-5 py-4 font-medium text-center">Days</th>
              <th className="px-5 py-4 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card text-foreground">
            <tr className="hover:bg-muted/30 transition-colors">
              <td className="px-5 py-3.5">Attendance</td>
              <td className="px-5 py-3.5 text-center text-muted-foreground">{payslip.attendanceDays.toFixed(2)} (5 working days/week)</td>
              <td className="px-5 py-3.5 text-right font-medium text-green-600">{money(attendanceAmount)}</td>
            </tr>
            <tr className="hover:bg-muted/30 transition-colors">
              <td className="px-5 py-3.5">Paid Time Off</td>
              <td className="px-5 py-3.5 text-center text-muted-foreground">{payslip.paidLeaveDays.toFixed(2)} ({payslip.paidLeaveDays.toFixed(0)} Paid leaves/Month)</td>
              <td className="px-5 py-3.5 text-right font-medium text-green-600">{money(paidLeaveAmount)}</td>
            </tr>
            <tr className="bg-muted/30 font-semibold text-foreground border-t-2 border-border">
              <td className="px-5 py-3.5">Total</td>
              <td className="px-5 py-3.5 text-center">{(payslip.attendanceDays + payslip.paidLeaveDays).toFixed(2)}</td>
              <td className="px-5 py-3.5 text-right text-primary text-base">{money(payslip.grossPay)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted-foreground">
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
    <div className="overflow-hidden rounded-xl border border-border shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/30 text-xs uppercase text-muted-foreground border-b border-border">
          <tr>
            <th className="px-5 py-4 font-medium">Rule Name</th>
            <th className="px-5 py-4 font-medium text-center">Rate %</th>
            <th className="px-5 py-4 font-medium text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card text-foreground">
          {rows.map(([label, value, type]) => (
            <tr
              key={String(label)}
              className={cn(
                "transition-colors hover:bg-muted/30",
                type === "gross" && "bg-muted/30 font-semibold text-foreground border-y border-border",
                type === "net" && "bg-muted/50 font-bold text-foreground border-t-2 border-border"
              )}
            >
              <td className="px-5 py-3.5">{label}</td>
              <td className="px-5 py-3.5 text-center text-muted-foreground">100</td>
              <td className={cn(
                "px-5 py-3.5 text-right font-medium",
                type === "earning" && "text-green-600",
                type === "deduction" && "text-red-600",
                type === "gross" && "text-primary",
                type === "net" && "text-primary text-base"
              )}>
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
            <h1 className="flex items-center gap-2 text-2xl font-bold text-[#1a1c24]">
              <CreditCard className="h-6 w-6 text-primary" />
              {payrun ? `Payrun for ${monthName} ${payrun.year}` : "Payrun"}
            </h1>
            {payrun && <StatusBadge status={payrun.status} />}
          </div>
          <p className="mt-1 text-sm text-[#6c757d]">Review generated payslips and payroll totals</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="bg-primary text-white hover:bg-[#5a3a52]">
            <Plus className="h-4 w-4" />
            New Payslip
          </Button>
          <Button className="bg-primary text-white hover:bg-[#5a3a52]">
            <RefreshCw className="h-4 w-4" />
            Compute
          </Button>
          <Button variant="outline" className="border-[#e5e7eb] text-[#374151] hover:bg-[#faf8ff]">
            <ShieldCheck className="h-4 w-4" />
            Validate
          </Button>
          <Button variant="outline" className="border-[#e5e7eb] text-[#374151] hover:bg-[#faf8ff]">
            <X className="h-4 w-4" />
            Cancel
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-[#dc3545]/30 bg-[#fdecea] p-3 text-sm text-[#dc3545]">
          {error}
        </div>
      )}

      {payrun && (
        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard label="Employer Cost" value={money(summary.employerCost)} />
          <SummaryCard label="Gross" value={money(summary.gross)} />
          <SummaryCard label="Net" value={money(summary.net)} tone="text-[#28a745]" />
          <div className="rounded-2xl border border-border bg-card shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6 transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1">
            <p className="text-sm font-medium text-muted-foreground">Status</p>
            <div className="mt-3"><StatusBadge status={payrun.status} /></div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : payrun ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-6 py-4 font-medium">Employee</th>
                  <th className="px-6 py-4 font-medium">Employer Cost</th>
                  <th className="px-6 py-4 font-medium">Basic Wage</th>
                  <th className="px-6 py-4 font-medium">Gross Wage</th>
                  <th className="px-6 py-4 font-medium">Net Wage</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Payslip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payrun.payslips.map((payslip) => (
                  <tr key={payslip.id} className="text-foreground transition-colors hover:bg-muted/30">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{payslip.employee.name}</div>
                      <div className="text-xs text-muted-foreground">{payslip.employee.loginId}</div>
                    </td>
                    <td className="px-6 py-4">{money(payslip.employerCost)}</td>
                    <td className="px-6 py-4">{money(payslip.basicSalary)}</td>
                    <td className="px-6 py-4">{money(payslip.grossPay)}</td>
                    <td className="px-6 py-4 font-semibold text-primary">{money(payslip.netPay)}</td>
                    <td className="px-6 py-4"><PayslipStatusBadge status={payslip.status} /></td>
                    <td className="px-6 py-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedPayslip(payslip)}
                        className="border-primary/40 text-primary hover:bg-primary/10"
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
        <DialogContent className="max-h-[92vh] overflow-y-auto border-border bg-card text-foreground shadow-lg sm:max-w-4xl p-0">
          <DialogHeader className="px-6 py-4 border-b border-border bg-card sticky top-0 z-10">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-xl">Payslip Details</DialogTitle>
              <Button variant="outline" size="sm" onClick={() => window.print()} className="shadow-sm">
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          </DialogHeader>
          {selectedPayslip && payrun && (
            <div className="p-6 pt-2 space-y-6">
              <Tabs defaultValue="salary-computation" className="w-full">
                <TabsList className="grid w-full max-w-[400px] grid-cols-2 mb-6">
                  <TabsTrigger value="salary-computation">Salary Computation</TabsTrigger>
                  <TabsTrigger value="worked-days">Worked Days</TabsTrigger>
                </TabsList>
                <TabsContent value="worked-days" className="mt-0">
                  <WorkedDaysTab payslip={selectedPayslip} />
                </TabsContent>
                <TabsContent value="salary-computation" className="mt-0">
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

function SummaryCard({ label, value, tone = "text-foreground" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6 transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-3 text-2xl font-bold", tone)}>{value}</p>
    </div>
  );
}
