"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { BarChart3, Download, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { PayslipPrint, PayslipPrintStyles } from "@/components/payroll/payslip-print";

interface Employee {
  id: string;
  name: string;
  loginId: string;
  department: string | null;
  email?: string;
  empCode?: string | null;
  location?: string | null;
  dateOfJoining?: string | null;
  privateInfo?: {
    panNo: string | null;
    uanNo: string | null;
    accountNumber: string | null;
    bankName?: string | null;
    dateOfJoining: string | null;
  } | null;
}

type PayslipReport = {
  id: string;
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
  employee: Employee;
  payrun: { month: number; year: number; createdAt?: string; paidAt?: string | null; approvedAt?: string | null };
};

interface LeaveReport {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  user: Employee;
}

interface AttendanceReport {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: "PRESENT" | "ABSENT" | "ON_LEAVE";
  user: Employee;
}

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const statusStyles = {
  PENDING: "border-[#fbb130]/40 bg-[#fff8ec] text-[#b26f00]",
  APPROVED: "border-[#28a745]/30 bg-[#edf7ef] text-[#28a745]",
  REJECTED: "border-[#dc3545]/30 bg-[#fdecea] text-[#dc3545]",
  PRESENT: "border-[#28a745]/30 bg-[#edf7ef] text-[#28a745]",
  ABSENT: "border-[#fbb130]/40 bg-[#fff8ec] text-[#b26f00]",
  ON_LEAVE: "border-[#1bb6f9]/30 bg-[#e8f7ff] text-[#1bb6f9]",
};

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatTime(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(value))
    : "-";
}

export default function ReportsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [payslips, setPayslips] = useState<PayslipReport[]>([]);
  const [printablePayslip, setPrintablePayslip] = useState<PayslipReport | null>(null);
  const [leaves, setLeaves] = useState<LeaveReport[]>([]);
  const [attendance, setAttendance] = useState<AttendanceReport[]>([]);
  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1);
  const [filters, setFilters] = useState({
    payslipUser: "all",
    payslipMonth: currentMonth,
    payslipYear: String(currentYear),
    leaveUser: "all",
    startDate: "",
    endDate: "",
    attendanceUser: "all",
    attendanceMonth: currentMonth,
    attendanceYear: String(currentYear),
  });

  useEffect(() => {
    async function loadEmployees() {
      const res = await fetch("/api/employees");
      const json = await res.json();
      if (res.ok) setEmployees(json.data.employees || []);
      setLoadingEmployees(false);
    }
    loadEmployees();
  }, []);

  useEffect(() => {
    loadPayslips();
    loadLeaves();
    loadAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchReport(url: string, setter: (value: never[]) => void, key: string) {
    setLoadingReport(true);
    try {
      const res = await fetch(url);
      const json = await res.json();
      if (res.ok) setter(json.data[key] || []);
    } finally {
      setLoadingReport(false);
    }
  }

  function employeeSelect(value: string, onChange: (value: string) => void) {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full border-[#e5e7eb] bg-[#ffffff] text-[#1a1c24]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-[#e5e7eb] bg-[#ffffff] text-[#374151]">
          <SelectItem value="all">All Employees</SelectItem>
          {employees.map((employee) => (
            <SelectItem key={employee.id} value={employee.id}>
              {employee.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  function monthSelect(value: string, onChange: (value: string) => void) {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full border-[#e5e7eb] bg-[#ffffff] text-[#1a1c24]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-[#e5e7eb] bg-[#ffffff] text-[#374151]">
          {months.map((month, index) => (
            <SelectItem key={month} value={String(index + 1)}>
              {month}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  function loadPayslips() {
    const q = new URLSearchParams({
      userId: filters.payslipUser,
      month: filters.payslipMonth,
      year: filters.payslipYear,
    });
    fetchReport(`/api/reports/payslips?${q}`, setPayslips as (value: never[]) => void, "payslips");
  }

  function loadLeaves() {
    const q = new URLSearchParams({ userId: filters.leaveUser });
    if (filters.startDate) q.set("startDate", filters.startDate);
    if (filters.endDate) q.set("endDate", filters.endDate);
    fetchReport(`/api/reports/leaves?${q}`, setLeaves as (value: never[]) => void, "leaves");
  }

  function loadAttendance() {
    const q = new URLSearchParams({
      userId: filters.attendanceUser,
      month: filters.attendanceMonth,
      year: filters.attendanceYear,
    });
    fetchReport(`/api/reports/attendance?${q}`, setAttendance as (value: never[]) => void, "attendance");
  }

  function printPayslip(payslip: PayslipReport) {
    flushSync(() => setPrintablePayslip(payslip));
    window.print();
  }

  if (loadingEmployees) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      <PayslipPrintStyles />
      {printablePayslip && <PayslipPrint payslip={printablePayslip} payrun={printablePayslip.payrun} />}

      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-[#1a1c24]">
          <BarChart3 className="h-6 w-6 text-[#714b67]" />
          Reports
        </h1>
        <p className="mt-1 text-sm text-[#6c757d]">Analytics and downloadable reports</p>
      </div>

      <Tabs defaultValue="payslips">
        <TabsList className="overflow-x-auto">
          <TabsTrigger value="payslips">Payslip Reports</TabsTrigger>
          <TabsTrigger value="leaves">Leave Reports</TabsTrigger>
          <TabsTrigger value="attendance">Attendance Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="payslips" className="space-y-4">
          <div className="grid gap-3 rounded-xl border border-[#ede7f6] bg-[#ffffff] shadow-[0_1px_4px_rgba(113,75,103,0.10)] p-4 md:grid-cols-4">
            <div className="space-y-1.5"><Label>Employee</Label>{employeeSelect(filters.payslipUser, (value) => setFilters((p) => ({ ...p, payslipUser: value })))}</div>
            <div className="space-y-1.5"><Label>Month</Label>{monthSelect(filters.payslipMonth, (value) => setFilters((p) => ({ ...p, payslipMonth: value })))}</div>
            <div className="space-y-1.5"><Label>Year</Label><Input value={filters.payslipYear} onChange={(e) => setFilters((p) => ({ ...p, payslipYear: e.target.value }))} className="border-[#e5e7eb] bg-[#ffffff] text-[#1a1c24]" /></div>
            <Button onClick={loadPayslips} className="self-end bg-[#714b67] text-white hover:bg-[#5a3a52]">Apply</Button>
          </div>
          <ReportShell loading={loadingReport}>
            <table className="w-full text-left text-sm">
              <thead className="bg-[#faf8ff] text-xs uppercase text-[#6c757d]"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Month</th><th className="px-4 py-3">Gross</th><th className="px-4 py-3">Deductions</th><th className="px-4 py-3">Net</th><th className="px-4 py-3">Download</th></tr></thead>
              <tbody className="divide-y divide-[#ede7f6]">
                {payslips.map((p) => <tr key={p.id} className="text-[#374151]"><td className="px-4 py-3">{p.employee.name}</td><td className="px-4 py-3">{months[p.payrun.month - 1]} {p.payrun.year}</td><td className="px-4 py-3">{money(p.grossPay)}</td><td className="px-4 py-3">{money(p.employeePF + p.employerPF + p.professionalTax + p.tdsDeduction)}</td><td className="px-4 py-3 text-[#28a745]">{money(p.netPay)}</td><td className="px-4 py-3"><Button size="sm" variant="outline" onClick={() => printPayslip(p)}><Download className="h-3.5 w-3.5" />PDF</Button></td></tr>)}
              </tbody>
            </table>
          </ReportShell>
        </TabsContent>

        <TabsContent value="leaves" className="space-y-4">
          <div className="grid gap-3 rounded-xl border border-[#ede7f6] bg-[#ffffff] shadow-[0_1px_4px_rgba(113,75,103,0.10)] p-4 md:grid-cols-4">
            <div className="space-y-1.5"><Label>Employee</Label>{employeeSelect(filters.leaveUser, (value) => setFilters((p) => ({ ...p, leaveUser: value })))}</div>
            <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={filters.startDate} onChange={(e) => setFilters((p) => ({ ...p, startDate: e.target.value }))} className="border-[#e5e7eb] bg-[#ffffff] text-[#1a1c24] [color-scheme:light]" /></div>
            <div className="space-y-1.5"><Label>End Date</Label><Input type="date" value={filters.endDate} onChange={(e) => setFilters((p) => ({ ...p, endDate: e.target.value }))} className="border-[#e5e7eb] bg-[#ffffff] text-[#1a1c24] [color-scheme:light]" /></div>
            <Button onClick={loadLeaves} className="self-end bg-[#714b67] text-white hover:bg-[#5a3a52]">Apply</Button>
          </div>
          <ReportShell loading={loadingReport}>
            <table className="w-full text-left text-sm">
              <thead className="bg-[#faf8ff] text-xs uppercase text-[#6c757d]"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Dates</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Status</th></tr></thead>
              <tbody className="divide-y divide-[#ede7f6]">
                {leaves.map((l) => <tr key={l.id} className="text-[#374151]"><td className="px-4 py-3">{l.user.name}</td><td className="px-4 py-3">{l.leaveType}</td><td className="px-4 py-3">{formatDate(l.startDate)} - {formatDate(l.endDate)}</td><td className="px-4 py-3">{l.reason || "-"}</td><td className="px-4 py-3"><Badge variant="outline" className={cn(statusStyles[l.status])}>{l.status}</Badge></td></tr>)}
              </tbody>
            </table>
          </ReportShell>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <div className="grid gap-3 rounded-xl border border-[#ede7f6] bg-[#ffffff] shadow-[0_1px_4px_rgba(113,75,103,0.10)] p-4 md:grid-cols-4">
            <div className="space-y-1.5"><Label>Employee</Label>{employeeSelect(filters.attendanceUser, (value) => setFilters((p) => ({ ...p, attendanceUser: value })))}</div>
            <div className="space-y-1.5"><Label>Month</Label>{monthSelect(filters.attendanceMonth, (value) => setFilters((p) => ({ ...p, attendanceMonth: value })))}</div>
            <div className="space-y-1.5"><Label>Year</Label><Input value={filters.attendanceYear} onChange={(e) => setFilters((p) => ({ ...p, attendanceYear: e.target.value }))} className="border-[#e5e7eb] bg-[#ffffff] text-[#1a1c24]" /></div>
            <Button onClick={loadAttendance} className="self-end bg-[#714b67] text-white hover:bg-[#5a3a52]">Apply</Button>
          </div>
          <ReportShell loading={loadingReport}>
            <table className="w-full text-left text-sm">
              <thead className="bg-[#faf8ff] text-xs uppercase text-[#6c757d]"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Check In</th><th className="px-4 py-3">Check Out</th><th className="px-4 py-3">Status</th></tr></thead>
              <tbody className="divide-y divide-[#ede7f6]">
                {attendance.map((a) => <tr key={a.id} className="text-[#374151]"><td className="px-4 py-3">{a.user.name}</td><td className="px-4 py-3">{formatDate(a.date)}</td><td className="px-4 py-3">{formatTime(a.checkIn)}</td><td className="px-4 py-3">{formatTime(a.checkOut)}</td><td className="px-4 py-3"><Badge variant="outline" className={cn(statusStyles[a.status])}>{a.status.replace("_", " ")}</Badge></td></tr>)}
              </tbody>
            </table>
          </ReportShell>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReportShell({
  loading,
  children,
}: {
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#ede7f6] bg-[#ffffff] shadow-[0_1px_4px_rgba(113,75,103,0.10)]">
      {loading ? (
        <div className="flex justify-center py-14">
          <Loader2 className="h-7 w-7 animate-spin text-[#714b67]" />
        </div>
      ) : (
        <div className="overflow-x-auto">{children}</div>
      )}
    </div>
  );
}
