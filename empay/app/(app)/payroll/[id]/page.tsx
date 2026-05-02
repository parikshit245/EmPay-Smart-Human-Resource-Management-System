"use client";

import { useEffect, useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Payrun {
  id: string;
  month: number;
  year: number;
  payslips: Payslip[];
}

interface Payslip {
  id: string;
  userId: string;
  basicSalary: number;
  hra: number;
  standardAllowance: number;
  performanceBonus: number;
  lta: number;
  fixedAllowance: number;
  employeePF: number;
  employerPF: number;
  professionalTax: number;
  grossPay: number;
  netPay: number;
  user: {
    id: string;
    name: string;
    loginId: string;
    department: string | null;
    email: string;
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
    maximumFractionDigits: 0,
  }).format(value);
}

function PayslipDocument({
  payslip,
  monthName,
  year,
}: {
  payslip: Payslip;
  monthName: string;
  year: number;
}) {
  const totalDeductions = payslip.employeePF + payslip.professionalTax;

  return (
    <div className="rounded-xl bg-white p-6 text-slate-950">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-2xl font-bold text-indigo-700">EmPay</div>
          <p className="text-sm text-slate-500">Salary Slip</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-lg font-semibold">{payslip.user.name}</p>
          <p className="text-sm text-slate-500">{payslip.user.loginId}</p>
          <p className="text-sm text-slate-500">
            {monthName} {year}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <div className="bg-slate-100 px-4 py-2 font-semibold">Earnings</div>
          {[
            ["Basic", payslip.basicSalary],
            ["HRA", payslip.hra],
            ["Standard Allowance", payslip.standardAllowance],
            ["Performance Bonus", payslip.performanceBonus],
            ["LTA", payslip.lta],
            ["Fixed Allowance", payslip.fixedAllowance],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between border-t border-slate-100 px-4 py-2 text-sm">
              <span>{label}</span>
              <span className="font-medium">{money(Number(value))}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-slate-200 bg-emerald-50 px-4 py-2 font-semibold">
            <span>Total Gross</span>
            <span>{money(payslip.grossPay)}</span>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200">
          <div className="bg-slate-100 px-4 py-2 font-semibold">Deductions</div>
          {[
            ["Employee PF", payslip.employeePF],
            ["Professional Tax", payslip.professionalTax],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between border-t border-slate-100 px-4 py-2 text-sm">
              <span>{label}</span>
              <span className="font-medium">{money(Number(value))}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-slate-200 bg-red-50 px-4 py-2 font-semibold">
            <span>Total Deductions</span>
            <span>{money(totalDeductions)}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="text-sm font-medium text-emerald-700">Net Pay</p>
        <p className="mt-1 text-3xl font-bold text-emerald-800">
          {money(payslip.netPay)}
        </p>
      </div>
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100">
          <CreditCard className="h-6 w-6 text-indigo-400" />
          {payrun ? `Payrun for ${monthName} ${payrun.year}` : "Payrun"}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Review generated payslips and payroll totals
        </p>
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
      ) : payrun ? (
        <div className="overflow-hidden rounded-xl border border-slate-800/70 bg-slate-900/70">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Gross Pay</th>
                  <th className="px-4 py-3 font-medium">Deductions</th>
                  <th className="px-4 py-3 font-medium">Net Pay</th>
                  <th className="px-4 py-3 font-medium">Payslip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {payrun.payslips.map((payslip) => (
                  <tr key={payslip.id} className="text-slate-300">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-200">{payslip.user.name}</div>
                      <div className="text-xs text-slate-500">{payslip.user.loginId}</div>
                    </td>
                    <td className="px-4 py-3">{money(payslip.grossPay)}</td>
                    <td className="px-4 py-3">
                      {money(payslip.employeePF + payslip.professionalTax)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-300">
                      {money(payslip.netPay)}
                    </td>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto border-slate-800 bg-slate-950 text-slate-100 sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Payslip</DialogTitle>
          </DialogHeader>
          {selectedPayslip && payrun && (
            <PayslipDocument
              payslip={selectedPayslip}
              monthName={months[payrun.month - 1]}
              year={payrun.year}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
