"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Users, Loader2 } from "lucide-react";
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
  todayStatus: "PRESENT" | "ABSENT" | "ON_LEAVE";
}

export default function EmployeesPage() {
  const router = useRouter();
  const { user } = useUser();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filtered, setFiltered] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEmployees() {
      try {
        const res = await fetch("/api/employees");
        if (!res.ok) throw new Error("Failed to load employees");
        const json = await res.json();
        setEmployees(json.data.employees);
        setFiltered(json.data.employees);
      } catch {
        setError("Failed to load employees. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    loadEmployees();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      employees.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (e.department?.toLowerCase().includes(q) ?? false) ||
          e.email.toLowerCase().includes(q)
      )
    );
  }, [search, employees]);

  const canAddEmployee = user?.role === "ADMIN" || user?.role === "HR_OFFICER";

  const presentCount = employees.filter((e) => e.todayStatus === "PRESENT").length;
  const absentCount = employees.filter((e) => e.todayStatus === "ABSENT").length;
  const onLeaveCount = employees.filter((e) => e.todayStatus === "ON_LEAVE").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            Employees
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {employees.length} team member{employees.length !== 1 ? "s" : ""}
          </p>
        </div>
        {canAddEmployee && (
          <Button
            onClick={() => router.push("/employees/new")}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/25 gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Employee
          </Button>
        )}
      </div>

      {/* Stats row */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Present Today", value: presentCount, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
            { label: "Absent Today", value: absentCount, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
            { label: "On Leave", value: onLeaveCount, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
          ].map((stat) => (
            <div key={stat.label} className={`${stat.bg} border ${stat.border} rounded-2xl p-4`}>
              <p className="text-slate-400 text-xs mb-1">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, department, or email..."
          className="pl-9 bg-slate-900/60 border-slate-700 text-slate-200 placeholder:text-slate-500 focus:border-indigo-500"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            <p className="text-slate-400">Loading employees...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <p className="text-red-400">{error}</p>
            <Button
              variant="ghost"
              className="mt-3 text-indigo-400 hover:text-indigo-300"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Users className="w-12 h-12 text-slate-700" />
          <p className="text-slate-400">
            {search ? `No employees matching "${search}"` : "No employees found"}
          </p>
          {canAddEmployee && !search && (
            <Button
              onClick={() => router.push("/employees/new")}
              variant="outline"
              className="border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10 mt-2"
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
