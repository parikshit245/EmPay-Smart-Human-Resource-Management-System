"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock, Loader2, LogIn, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUser } from "@/lib/UserContext";
import { cn } from "@/lib/utils";

interface AttendanceRecord {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: "PRESENT" | "ABSENT" | "ON_LEAVE";
  user: { id: string; name: string; loginId: string };
}

interface EmployeeOption {
  id: string;
  name: string;
  loginId: string;
}

interface AttendanceSummaryData {
  daysPresent: number;
  totalLeaves: number;
  totalWorkingDays: number;
  currentMonth: string;
  currentYear: number;
}

type RangeMode = "week" | "month" | "custom";

function formatTime(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(new Date(value))
    : "-";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function hoursWorked(record: AttendanceRecord) {
  if (!record.checkIn || !record.checkOut) return "-";
  const ms = new Date(record.checkOut).getTime() - new Date(record.checkIn).getTime();
  if (ms <= 0) return "-";
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return `${hours}h ${minutes}m`;
}

function getRange(mode: RangeMode, customFrom: string, customTo: string) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (mode === "week") {
    const day = now.getDay() || 7;
    start.setDate(now.getDate() - day + 1);
  } else if (mode === "month") {
    start.setDate(1);
  } else {
    return { from: customFrom, to: customTo };
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

const statusStyles = {
  PRESENT: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  ABSENT: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  ON_LEAVE: "border-blue-500/30 bg-blue-500/10 text-blue-300",
};

function AttendanceSummary() {
  const [summary, setSummary] = useState<AttendanceSummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSummary() {
      try {
        const res = await fetch("/api/attendance/summary");
        const json = await res.json();
        if (res.ok) setSummary(json.data);
      } finally {
        setLoading(false);
      }
    }
    loadSummary();
  }, []);

  const metrics = [
    { label: "Days Present", value: summary?.daysPresent ?? 0, className: "text-emerald-300" },
    { label: "Total Leaves", value: summary?.totalLeaves ?? 0, className: "text-blue-300" },
    { label: "Working Days", value: summary?.totalWorkingDays ?? 0, className: "text-indigo-300" },
  ];

  return (
    <Card className="border-slate-800/70 bg-slate-900/70">
      <CardHeader className="border-b border-slate-800/70">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-slate-100">Attendance Summary</CardTitle>
          <Badge variant="outline" className="w-fit border-indigo-500/30 bg-indigo-500/10 text-indigo-200">
            Current Month: {summary ? `${summary.currentMonth} ${summary.currentYear}` : "..."}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 pt-0 sm:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">{metric.label}</p>
            <p className={cn("mt-2 text-3xl font-bold", metric.className)}>
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : metric.value}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function AttendancePage() {
  const { user } = useUser();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [employeeId, setEmployeeId] = useState("all");
  const [rangeMode, setRangeMode] = useState<RangeMode>("week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [now, setNow] = useState(new Date());
  const [error, setError] = useState<string | null>(null);

  const canFilterEmployees =
    user?.role === "ADMIN" ||
    user?.role === "HR_OFFICER" ||
    user?.role === "PAYROLL_OFFICER";

  const todayRecord = useMemo(() => {
    const today = new Date().toDateString();
    return records.find(
      (record) =>
        record.user.id === user?.id && new Date(record.date).toDateString() === today
    );
  }, [records, user?.id]);

  const checkedIn = Boolean(todayRecord?.checkIn && !todayRecord?.checkOut);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!canFilterEmployees) return;
    async function loadEmployees() {
      const res = await fetch("/api/employees");
      if (!res.ok) return;
      const json = await res.json();
      setEmployees(json.data.employees || []);
    }
    loadEmployees();
  }, [canFilterEmployees]);

  useEffect(() => {
    loadAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, rangeMode, customFrom, customTo]);

  async function loadAttendance() {
    setLoading(true);
    setError(null);
    try {
      const range = getRange(rangeMode, customFrom, customTo);
      const query = new URLSearchParams();
      if (range.from) query.set("from", range.from);
      if (range.to) query.set("to", range.to);
      if (canFilterEmployees && employeeId !== "all") query.set("employeeId", employeeId);

      const res = await fetch(`/api/attendance?${query.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load attendance");
      setRecords(json.data.records);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load attendance.");
    } finally {
      setLoading(false);
    }
  }

  async function runAttendanceAction(endpoint: "checkin" | "checkout") {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/attendance/${endpoint}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Attendance update failed");
      await loadAttendance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Attendance update failed.");
    } finally {
      setActionLoading(false);
    }
  }

  const elapsed = useMemo(() => {
    if (!todayRecord?.checkIn || todayRecord.checkOut) return null;
    const diff = now.getTime() - new Date(todayRecord.checkIn).getTime();
    const hours = Math.floor(diff / 3_600_000);
    const minutes = Math.floor((diff % 3_600_000) / 60_000);
    return `${hours}h ${minutes}m`;
  }, [now, todayRecord]);

  return (
    <div className="space-y-6">
      <AttendanceSummary />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Clock className="w-6 h-6 text-indigo-400" />
            Attendance
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Track daily check-ins and check-outs
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/70 bg-slate-900/70 p-4">
          {checkedIn ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-medium text-emerald-300">
                  Since {formatTime(todayRecord?.checkIn || null)}
                </p>
                <p className="text-xs text-slate-400">{elapsed} elapsed</p>
              </div>
              <Button
                onClick={() => runAttendanceAction("checkout")}
                disabled={actionLoading}
                className="bg-red-600 text-white hover:bg-red-500"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                Check OUT
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => runAttendanceAction("checkin")}
              disabled={actionLoading || Boolean(todayRecord?.checkOut)}
              className="h-12 bg-emerald-600 px-6 text-white hover:bg-emerald-500"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              {todayRecord?.checkOut ? "Checked Out" : "Check IN"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-800/70 bg-slate-900/70 p-4 md:grid-cols-4">
        {canFilterEmployees && (
          <div className="space-y-1.5">
            <Label className="text-slate-300">Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="w-full bg-slate-800/50 border-slate-600 text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1.5">
          <Label className="text-slate-300">Date Range</Label>
          <Select value={rangeMode} onValueChange={(value) => setRangeMode(value as RangeMode)}>
            <SelectTrigger className="w-full bg-slate-800/50 border-slate-600 text-slate-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {rangeMode === "custom" && (
          <>
            <div className="space-y-1.5">
              <Label className="text-slate-300">From</Label>
              <Input
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
                className="bg-slate-800/50 border-slate-600 text-slate-100 [color-scheme:dark]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">To</Label>
              <Input
                type="date"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
                className="bg-slate-800/50 border-slate-600 text-slate-100 [color-scheme:dark]"
              />
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-800/70 bg-slate-900/70">
        <div className="flex items-center gap-2 border-b border-slate-800/70 px-4 py-3">
          <CalendarDays className="h-4 w-4 text-indigo-300" />
          <h2 className="font-semibold text-slate-100">Attendance Log</h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
          </div>
        ) : records.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-400">No attendance records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-xs uppercase text-slate-500">
                <tr>
                  {canFilterEmployees && <th className="px-4 py-3 font-medium">Employee</th>}
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Check In</th>
                  <th className="px-4 py-3 font-medium">Check Out</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Hours Worked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {records.map((record) => (
                  <tr key={record.id} className="text-slate-300">
                    {canFilterEmployees && (
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-200">{record.user.name}</div>
                        <div className="text-xs text-slate-500">{record.user.loginId}</div>
                      </td>
                    )}
                    <td className="px-4 py-3">{formatDate(record.date)}</td>
                    <td className="px-4 py-3">{formatTime(record.checkIn)}</td>
                    <td className="px-4 py-3">{formatTime(record.checkOut)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={cn(statusStyles[record.status])}>
                        {record.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{hoursWorked(record)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
