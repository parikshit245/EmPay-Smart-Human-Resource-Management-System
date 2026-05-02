"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, Users, Loader2, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import EmployeeCard from "@/components/employees/EmployeeCard";
import { useUser } from "@/lib/UserContext";

interface Employee {
  id: string;
  name: string;
  email: string;
  loginId: string;
  role: string;
  department: string | null;
  profilePhoto: string | null;
  managerId: string | null;
  hasBankAccount: boolean;
  todayStatus: "PRESENT" | "ABSENT" | "ON_LEAVE";
}

export default function EmployeesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filtered, setFiltered] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warningCounts, setWarningCounts] = useState<{
    withoutBankAccount: number;
    withoutManager: number;
  } | null>(null);
  const [showWarningBanner, setShowWarningBanner] = useState(true);
  const activeFilter = searchParams.get("filter");

  useEffect(() => {
    async function loadEmployees(showLoader = true) {
      try {
        if (showLoader) setLoading(true);
        const res = await fetch("/api/employees");
        if (!res.ok) throw new Error("Failed to load employees");
        const json = await res.json();
        setEmployees(json.data.employees);
        setWarningCounts(json.data.warningCounts || null);
        setFiltered(json.data.employees);
      } catch {
        setError("Failed to load employees. Please try again.");
      } finally {
        if (showLoader) setLoading(false);
      }
    }
    loadEmployees();
    const interval = window.setInterval(() => loadEmployees(false), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      employees.filter((e) => {
        const matchesSearch =
          e.name.toLowerCase().includes(q) ||
          (e.department?.toLowerCase().includes(q) ?? false) ||
          e.email.toLowerCase().includes(q);
        const matchesFilter =
          activeFilter === "missingBank"
            ? !e.hasBankAccount
            : activeFilter === "missingManager"
              ? !e.managerId
              : true;
        return matchesSearch && matchesFilter;
      })
    );
  }, [search, employees, activeFilter]);

  const canAddEmployee = user?.role === "ADMIN" || user?.role === "HR_OFFICER";

  const presentCount = employees.filter((e) => e.todayStatus === "PRESENT").length;
  const absentCount = employees.filter((e) => e.todayStatus === "ABSENT").length;
  const onLeaveCount = employees.filter((e) => e.todayStatus === "ON_LEAVE").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1c24] flex items-center gap-2">
            <Users className="w-6 h-6 text-[#714b67]" />
            Employees
          </h1>
          <p className="text-[#6c757d] text-sm mt-1">
            {employees.length} team member{employees.length !== 1 ? "s" : ""}
          </p>
        </div>
        {canAddEmployee && (
          <Button
            onClick={() => router.push("/employees/new")}
            className="bg-[#714b67] hover:bg-[#5a3a52] text-white shadow-[0_1px_4px_rgba(113,75,103,0.10)]  gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Employee
          </Button>
        )}
      </div>

      {user?.role === "ADMIN" &&
        showWarningBanner &&
        warningCounts &&
        (warningCounts.withoutBankAccount > 0 || warningCounts.withoutManager > 0) && (
          <div className="flex flex-col gap-3 rounded-xl border border-[#dc3545]/30 bg-[#fdecea] p-4 text-[#dc3545] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#dc3545]" />
              <div>
                <p className="font-medium">Employee setup warnings</p>
                <p className="text-sm text-[#dc3545]/80">
                  {warningCounts.withoutBankAccount} without Bank A/c ·{" "}
                  {warningCounts.withoutManager} without Manager
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push("/employees?filter=missingBank")}
                className="border-[#dc3545]/30 text-[#dc3545] hover:bg-[#fdecea]"
              >
                Bank A/c
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/employees?filter=missingManager")}
                className="border-[#dc3545]/30 text-[#dc3545] hover:bg-[#fdecea]"
              >
                Manager
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowWarningBanner(false)}
                className="text-[#dc3545] hover:bg-[#fdecea]"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

      {/* Stats row */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Present Today", value: presentCount, color: "text-[#28a745]", bg: "bg-[#edf7ef]", border: "border-[#28a745]/20" },
            { label: "Absent Today", value: absentCount, color: "text-[#b26f00]", bg: "bg-[#fff8ec]", border: "border-[#fbb130]/30" },
            { label: "On Leave", value: onLeaveCount, color: "text-[#1bb6f9]", bg: "bg-[#e8f7ff]", border: "border-[#1bb6f9]/20" },
          ].map((stat) => (
            <div key={stat.label} className={`${stat.bg} border ${stat.border} rounded-2xl p-4`}>
              <p className="text-[#6c757d] text-xs mb-1">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6c757d]" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, department, or email..."
          className="pl-9 bg-[#ffffff] shadow-[0_1px_4px_rgba(113,75,103,0.10)] border-[#e5e7eb] text-[#374151] placeholder:text-[#6c757d] focus:border-[#714b67]"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-[#714b67] animate-spin" />
            <p className="text-[#6c757d]">Loading employees...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <p className="text-[#dc3545]">{error}</p>
            <Button
              variant="ghost"
              className="mt-3 text-[#714b67] hover:text-[#714b67]"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Users className="w-12 h-12 text-[#adb5bd]" />
          <p className="text-[#6c757d]">
            {search ? `No employees matching "${search}"` : "No employees found"}
          </p>
          {canAddEmployee && !search && (
            <Button
              onClick={() => router.push("/employees/new")}
              variant="outline"
              className="border-[#714b67]/50 text-[#714b67] hover:bg-[#5a3a52]/10 mt-2"
            >
              Add First Employee
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((employee) => (
            <EmployeeCard key={employee.id} employee={employee} />
          ))}
        </div>
      )}
    </div>
  );
}
