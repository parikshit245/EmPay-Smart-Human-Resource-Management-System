"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, Check, Loader2, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@/lib/UserContext";
import { cn } from "@/lib/utils";

type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

interface TimeOffRequest {
  id: string;
  userId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: LeaveStatus;
  medicalCertificateName: string | null;
  medicalCertificateData: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    loginId: string;
    department: string | null;
  };
}

interface LeaveBalances {
  paid: { allocated: number; approved: number; remaining: number };
  sick: { allocated: number; approved: number; remaining: number };
}

const statusStyles: Record<LeaveStatus, string> = {
  PENDING: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  APPROVED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  REJECTED: "border-red-500/30 bg-red-500/10 text-red-300",
};

const leaveTypes = ["Sick Leave", "Casual Leave", "Paid Leave", "Other"];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function RequestTable({
  requests,
  showEmployee,
  canAct,
  actionLoadingId,
  onAction,
}: {
  requests: TimeOffRequest[];
  showEmployee: boolean;
  canAct: boolean;
  actionLoadingId: string | null;
  onAction: (id: string, status: "APPROVED" | "REJECTED") => void;
}) {
  if (requests.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-slate-400">
        No time-off requests found.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-950/60 text-xs uppercase text-slate-500">
          <tr>
            {showEmployee && <th className="px-4 py-3 font-medium">Employee</th>}
            <th className="px-4 py-3 font-medium">Leave Type</th>
            <th className="px-4 py-3 font-medium">Dates</th>
            <th className="px-4 py-3 font-medium">Reason</th>
            {showEmployee && <th className="px-4 py-3 font-medium">Certificate</th>}
            <th className="px-4 py-3 font-medium">Status</th>
            {showEmployee && <th className="px-4 py-3 font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/70">
          {requests.map((request) => (
            <tr key={request.id} className="text-slate-300">
              {showEmployee && (
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-200">{request.user.name}</div>
                  <div className="text-xs text-slate-500">{request.user.loginId}</div>
                </td>
              )}
              <td className="px-4 py-3">{request.leaveType}</td>
              <td className="px-4 py-3">
                {formatDate(request.startDate)} - {formatDate(request.endDate)}
              </td>
              <td className="max-w-xs px-4 py-3 text-slate-400">
                {request.reason || "-"}
              </td>
              {showEmployee && (
                <td className="px-4 py-3">
                  {request.medicalCertificateData ? (
                    <a
                      href={request.medicalCertificateData}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-300 underline-offset-4 hover:underline"
                    >
                      {request.medicalCertificateName || "View file"}
                    </a>
                  ) : (
                    <span className="text-xs text-slate-500">-</span>
                  )}
                </td>
              )}
              <td className="px-4 py-3">
                <Badge variant="outline" className={cn(statusStyles[request.status])}>
                  {request.status}
                </Badge>
              </td>
              {showEmployee && (
                <td className="px-4 py-3">
                  {canAct && request.status === "PENDING" ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => onAction(request.id, "APPROVED")}
                        disabled={actionLoadingId === request.id}
                        className="bg-emerald-600 text-white hover:bg-emerald-500"
                      >
                        {actionLoadingId === request.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => onAction(request.id, "REJECTED")}
                        disabled={actionLoadingId === request.id}
                        className="bg-red-600 text-white hover:bg-red-500"
                      >
                        <X className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500">-</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TimeOffPage() {
  const { user } = useUser();
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [myRequests, setMyRequests] = useState<TimeOffRequest[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalances | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    leaveType: "Sick Leave",
    startDate: "",
    endDate: "",
    reason: "",
    medicalCertificateName: "",
    medicalCertificateType: "",
    medicalCertificateData: "",
  });

  const canApply = ["EMPLOYEE", "ADMIN", "HR_OFFICER"].includes(user?.role || "");
  const canReview = user?.role === "ADMIN" || user?.role === "HR_OFFICER";
  const canViewAll = canReview || user?.role === "PAYROLL_OFFICER";

  const allRequests = useMemo(
    () => requests.filter((request) => request.userId !== user?.id || canViewAll),
    [canViewAll, requests, user?.id]
  );

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/time-off");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load time-off requests");
      setRequests(json.data.requests || []);
      setMyRequests(json.data.myRequests || []);
      setLeaveBalances(json.data.leaveBalances || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requests.");
    } finally {
      setLoading(false);
    }
  }

  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form.leaveType === "Sick Leave" && !form.medicalCertificateData) {
      setError("Medical certificate is required for sick leave.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/time-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit request");
      setDialogOpen(false);
      setForm({
        leaveType: "Sick Leave",
        startDate: "",
        endDate: "",
        reason: "",
        medicalCertificateName: "",
        medicalCertificateType: "",
        medicalCertificateData: "",
      });
      await loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCertificateUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setForm((prev) => ({
        ...prev,
        medicalCertificateName: "",
        medicalCertificateType: "",
        medicalCertificateData: "",
      }));
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Medical certificate must be under 2 MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        medicalCertificateName: file.name,
        medicalCertificateType: file.type,
        medicalCertificateData: String(reader.result),
      }));
    };
    reader.readAsDataURL(file);
  }

  async function updateRequest(id: string, status: "APPROVED" | "REJECTED") {
    setActionLoadingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/time-off/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update request");
      await loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update request.");
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100">
            <Calendar className="h-6 w-6 text-indigo-400" />
            Time Off
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage leave requests and approvals
          </p>
        </div>

        {canApply && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500">
                <Plus className="h-4 w-4" />
                Apply for Time Off
              </Button>
            </DialogTrigger>
            <DialogContent className="border-slate-800 bg-slate-950 text-slate-100 sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Apply for Time Off</DialogTitle>
              </DialogHeader>
              {leaveBalances && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-3">
                    <p className="text-xs text-emerald-200/80">Paid Leaves Left</p>
                    <p className="mt-1 text-2xl font-bold text-emerald-300">
                      {leaveBalances.paid.remaining}
                    </p>
                    <p className="text-xs text-slate-500">
                      {leaveBalances.paid.approved} of {leaveBalances.paid.allocated} used
                    </p>
                  </div>
                  <div className="rounded-lg border border-blue-500/25 bg-blue-500/10 p-3">
                    <p className="text-xs text-blue-200/80">Sick Leaves Left</p>
                    <p className="mt-1 text-2xl font-bold text-blue-300">
                      {leaveBalances.sick.remaining}
                    </p>
                    <p className="text-xs text-slate-500">
                      {leaveBalances.sick.approved} of {leaveBalances.sick.allocated} used
                    </p>
                  </div>
                </div>
              )}
              <form className="space-y-4" onSubmit={submitRequest}>
                <div className="space-y-1.5">
                  <Label>Leave Type</Label>
                  <Select
                    value={form.leaveType}
                    onValueChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        leaveType: value,
                        ...(value === "Sick Leave"
                          ? {}
                          : {
                              medicalCertificateName: "",
                              medicalCertificateType: "",
                              medicalCertificateData: "",
                            }),
                      }))
                    }
                  >
                    <SelectTrigger className="w-full border-slate-700 bg-slate-900 text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-slate-700 bg-slate-900 text-slate-200">
                      {leaveTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Start Date</Label>
                    <Input
                      required
                      type="date"
                      value={form.startDate}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, startDate: event.target.value }))
                      }
                      className="border-slate-700 bg-slate-900 text-slate-100 [color-scheme:dark]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>End Date</Label>
                    <Input
                      required
                      type="date"
                      value={form.endDate}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, endDate: event.target.value }))
                      }
                      className="border-slate-700 bg-slate-900 text-slate-100 [color-scheme:dark]"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Reason</Label>
                  <Textarea
                    value={form.reason}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, reason: event.target.value }))
                    }
                    className="border-slate-700 bg-slate-900 text-slate-100"
                    placeholder="Add a short reason..."
                  />
                </div>
                {form.leaveType === "Sick Leave" && (
                  <div className="space-y-1.5">
                    <Label>Medical Certificate *</Label>
                    <Input
                      required
                      type="file"
                      accept="image/*,.pdf,application/pdf"
                      onChange={handleCertificateUpload}
                      className="border-slate-700 bg-slate-900 text-slate-100 file:text-slate-200"
                    />
                    {form.medicalCertificateName && (
                      <p className="text-xs text-slate-400">
                        Attached: {form.medicalCertificateName}
                      </p>
                    )}
                  </div>
                )}
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-indigo-600 text-white hover:bg-indigo-500"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Submit Request
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <Tabs defaultValue="mine">
        <TabsList>
          <TabsTrigger value="mine">My Requests</TabsTrigger>
          {canViewAll && <TabsTrigger value="all">All Requests</TabsTrigger>}
        </TabsList>
        <TabsContent value="mine">
          <div className="overflow-hidden rounded-xl border border-slate-800/70 bg-slate-900/70">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
              </div>
            ) : (
              <RequestTable
                requests={myRequests}
                showEmployee={false}
                canAct={false}
                actionLoadingId={actionLoadingId}
                onAction={updateRequest}
              />
            )}
          </div>
        </TabsContent>
        {canViewAll && (
          <TabsContent value="all">
            <div className="overflow-hidden rounded-xl border border-slate-800/70 bg-slate-900/70">
              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
                </div>
              ) : (
                <RequestTable
                  requests={allRequests}
                  showEmployee
                  canAct={canReview}
                  actionLoadingId={actionLoadingId}
                  onAction={updateRequest}
                />
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
