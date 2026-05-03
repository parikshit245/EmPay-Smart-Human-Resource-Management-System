"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { CalendarDays, Clock, Loader2, LogIn, LogOut, Scan, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Backlight } from "@/components/ui/backlight";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUser } from "@/lib/UserContext";
import { cn } from "@/lib/utils";
import { FaceCamera } from "@/components/face/FaceCamera";
import Link from "next/link";

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
  PRESENT: "border-[#28a745]/30 bg-[#edf7ef] text-[#28a745]",
  ABSENT: "border-[#fbb130]/40 bg-[#fff8ec] text-[#b26f00]",
  ON_LEAVE: "border-[#1bb6f9]/30 bg-[#e8f7ff] text-[#1bb6f9]",
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
    { label: "Days Present", value: summary?.daysPresent ?? 0, className: "text-[#28a745]" },
    { label: "Total Leaves", value: summary?.totalLeaves ?? 0, className: "text-[#1bb6f9]" },
    { label: "Working Days", value: summary?.totalWorkingDays ?? 0, className: "text-[#714b67]" },
  ];

  return (
    <Card className="border-[#ede7f6] bg-[#ffffff] shadow-[0_1px_4px_rgba(113,75,103,0.10)]">
      <CardHeader className="border-b border-[#ede7f6]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-[#1a1c24]">Attendance Summary</CardTitle>
          <Badge variant="outline" className="w-fit border-[#714b67]/30 bg-[#ede7f6] text-[#714b67]">
            Current Month: {summary ? `${summary.currentMonth} ${summary.currentYear}` : "..."}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 pt-0 sm:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-lg border border-[#ede7f6] bg-[#faf8ff] p-4">
            <p className="text-xs uppercase tracking-wide text-[#6c757d]">{metric.label}</p>
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
  const [faceEnrolled, setFaceEnrolled] = useState<boolean | null>(null);
  const [showFaceCamera, setShowFaceCamera] = useState(false);
  const [pendingAction, setPendingAction] = useState<"checkin" | "checkout" | null>(null);

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
    fetch("/api/face/status")
      .then((r) => r.json())
      .then((j) => setFaceEnrolled(j.enrolled ?? false))
      .catch(() => setFaceEnrolled(false));
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

  // Called when the user clicks Check IN or Check OUT
  function requestAttendanceAction(endpoint: "checkin" | "checkout") {
    if (faceEnrolled === false) {
      setError("You must enroll your face before using attendance. Go to Face Recognition Setup.");
      return;
    }
    setPendingAction(endpoint);
    setShowFaceCamera(true);
  }

  // Called after face-camera captures a descriptor
  const handleFaceVerified = useCallback(async (descriptor: Float32Array) => {
    setShowFaceCamera(false);
    if (!pendingAction) return;

    setActionLoading(true);
    setError(null);
    try {
      // Step 1: verify face
      const verifyRes = await fetch("/api/face/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptor: Array.from(descriptor) }),
      });
      const verifyJson = await verifyRes.json();

      if (verifyJson.code === "NO_FACE_ENROLLED") {
        setFaceEnrolled(false);
        throw new Error("No face enrolled. Please enroll your face first in Face Recognition Setup.");
      }

      if (!verifyRes.ok || !verifyJson.verified) {
        throw new Error(
          `Face verification failed. Identity not confirmed (distance: ${verifyJson.distance ?? "?"}). Please try again.`
        );
      }

      // Step 2: mark attendance
      const action = pendingAction;
      setPendingAction(null);
      await runAttendanceAction(action);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
      setActionLoading(false);
    }
  }, [pendingAction]); // eslint-disable-line react-hooks/exhaustive-deps

  const elapsed = useMemo(() => {
    if (!todayRecord?.checkIn || todayRecord.checkOut) return null;
    const diff = now.getTime() - new Date(todayRecord.checkIn).getTime();
    const hours = Math.floor(diff / 3_600_000);
    const minutes = Math.floor((diff % 3_600_000) / 60_000);
    return `${hours}h ${minutes}m`;
  }, [now, todayRecord]);

  return (
    <>
      {showFaceCamera && (
        <FaceCamera
          mode="verify"
          onSuccess={handleFaceVerified}
          onClose={() => {
            setShowFaceCamera(false);
            setPendingAction(null);
          }}
        />
      )}
    <div className="space-y-6">
      <AttendanceSummary />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1c24] flex items-center gap-2">
            <Clock className="w-6 h-6 text-[#714b67]" />
            Attendance
          </h1>
          <p className="text-[#6c757d] text-sm mt-1">
            Track daily check-ins and check-outs
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/70 bg-slate-900/70 p-4">
          {faceEnrolled === false && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>
                Face not enrolled.{" "}
                <Link href="/face-setup" className="underline underline-offset-2 hover:text-amber-200">
                  Set it up now
                </Link>
              </span>
            </div>
          )}
          {checkedIn ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-medium text-[#28a745]">
                  Since {formatTime(todayRecord?.checkIn || null)}
                </p>
                <p className="text-xs text-[#6c757d]">{elapsed} elapsed</p>
              </div>
              <Button
                onClick={() => requestAttendanceAction("checkout")}
                disabled={actionLoading}
                className="bg-[#dc3545] text-white hover:bg-[#c82333]"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                Check OUT
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => requestAttendanceAction("checkin")}
              disabled={actionLoading || Boolean(todayRecord?.checkOut)}
              className="h-12 bg-[#28a745] px-6 text-white hover:bg-[#218838]"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              {todayRecord?.checkOut ? "Checked Out" : "Check IN"}
            </Button>
          )}
          {faceEnrolled && (
            <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
              <Scan className="h-3 w-3" />
              Face recognition required for attendance
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-xl border border-[#ede7f6] bg-[#ffffff] shadow-[0_1px_4px_rgba(113,75,103,0.10)] p-4 md:grid-cols-4">
        {canFilterEmployees && (
          <div className="space-y-1.5">
            <Label className="text-[#374151]">Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="w-full bg-[#faf8ff] border-[#e5e7eb] text-[#1a1c24]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#ffffff] border-[#e5e7eb] text-[#374151]">
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
          <Label className="text-[#374151]">Date Range</Label>
          <Select value={rangeMode} onValueChange={(value) => setRangeMode(value as RangeMode)}>
            <SelectTrigger className="w-full bg-[#faf8ff] border-[#e5e7eb] text-[#1a1c24]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#ffffff] border-[#e5e7eb] text-[#374151]">
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {rangeMode === "custom" && (
          <>
            <div className="space-y-1.5">
              <Label className="text-[#374151]">From</Label>
              <Input
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
                className="bg-[#faf8ff] border-[#e5e7eb] text-[#1a1c24] [color-scheme:light]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[#374151]">To</Label>
              <Input
                type="date"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
                className="bg-[#faf8ff] border-[#e5e7eb] text-[#1a1c24] [color-scheme:light]"
              />
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-[#dc3545]/30 bg-[#fdecea] p-3 text-sm text-[#dc3545]">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-[#ede7f6] bg-[#ffffff] shadow-[0_1px_4px_rgba(113,75,103,0.10)]">
        <div className="flex items-center gap-2 border-b border-[#ede7f6] px-4 py-3">
          <CalendarDays className="h-4 w-4 text-[#714b67]" />
          <h2 className="font-semibold text-[#1a1c24]">Attendance Log</h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-[#714b67]" />
          </div>
        ) : records.length === 0 ? (
          <p className="py-16 text-center text-sm text-[#6c757d]">No attendance records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#faf8ff] text-xs uppercase text-[#6c757d]">
                <tr>
                  {canFilterEmployees && <th className="px-4 py-3 font-medium">Employee</th>}
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Check In</th>
                  <th className="px-4 py-3 font-medium">Check Out</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Hours Worked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ede7f6]">
                {records.map((record) => (
                  <tr key={record.id} className="text-[#374151]">
                    {canFilterEmployees && (
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#374151]">{record.user.name}</div>
                        <div className="text-xs text-[#6c757d]">{record.user.loginId}</div>
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
    </>
  );
}
