"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Plus, Save, Shield, X } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@/lib/UserContext";
import { cn } from "@/lib/utils";

interface EmployeeProfile {
  id: string;
  loginId: string;
  email: string;
  name: string;
  role: string;
  phone: string | null;
  profilePhoto: string | null;
  department: string | null;
  managerId: string | null;
  manager: { id: string; name: string } | null;
  location: string | null;
  empCode: string | null;
  dateOfJoining: string | null;
  resume: {
    about: string | null;
    loveAboutJob: string | null;
    interests: string | null;
    skills: string[];
    certifications: string[];
  } | null;
  privateInfo: {
    dob: string | null;
    address: string | null;
    nationality: string | null;
    personalEmail: string | null;
    gender: string | null;
    maritalStatus: string | null;
    accountNumber: string | null;
    bankName: string | null;
    ifscCode: string | null;
    panNo: string | null;
    uanNo: string | null;
    dateOfJoining: string | null;
  } | null;
  salaryInfo: SalaryInfo | null;
}

interface SalaryInfo {
  monthWage: number;
  yearlyWage: number;
  workingDaysPerWeek: number;
  breakTime: number;
  wageType: string;
  basicSalary: number;
  hra: number;
  standardAllowance: number;
  performanceBonus: number;
  lta: number;
  fixedAllowance: number;
  employeePF: number;
  employerPF: number;
  professionalTax: number;
}

interface ManagerOption {
  id: string;
  name: string;
  loginId: string;
  role: string;
}

const emptySalary: SalaryInfo = {
  monthWage: 0,
  yearlyWage: 0,
  workingDaysPerWeek: 5,
  breakTime: 1,
  wageType: "MONTHLY",
  basicSalary: 0,
  hra: 0,
  standardAllowance: 0,
  performanceBonus: 0,
  lta: 0,
  fixedAllowance: 0,
  employeePF: 0,
  employerPF: 0,
  professionalTax: 200,
};

function dateInput(value?: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function calculateSalary(monthWage: number, base: SalaryInfo): SalaryInfo {
  const basicSalary = monthWage * 0.5;
  const hra = basicSalary * 0.5;
  const standardAllowance = monthWage * 0.1667;
  const performanceBonus = basicSalary * 0.0833;
  const lta = basicSalary * 0.0833;
  const employeePF = basicSalary * 0.12;
  const employerPF = basicSalary * 0.12;
  const professionalTax = 200;
  const fixedAllowance = basicSalary * 0.1167;

  return {
    ...base,
    monthWage,
    yearlyWage: monthWage * 12,
    basicSalary,
    hra,
    standardAllowance,
    performanceBonus,
    lta,
    fixedAllowance,
    employeePF,
    employerPF,
    professionalTax,
  };
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function EmployeeProfilePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user } = useUser();
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [newSkill, setNewSkill] = useState("");
  const [newCert, setNewCert] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const canEdit = Boolean(
    user &&
      employee &&
      (user.id === employee.id || user.role === "ADMIN" || user.role === "HR_OFFICER")
  );
  const canAssignManager = user?.role === "ADMIN" || user?.role === "HR_OFFICER";
  const canViewPrivateInfo = Boolean(
    user &&
      employee &&
      (user.id === employee.id ||
        user.role === "ADMIN" ||
        user.role === "HR_OFFICER" ||
        user.role === "PAYROLL_OFFICER")
  );
  const canUseSecurity = Boolean(user && employee && user.id === employee.id);
  const canViewSalary = user?.role === "ADMIN" || user?.role === "PAYROLL_OFFICER";

  useEffect(() => {
    async function loadEmployee() {
      try {
        const res = await fetch(`/api/employees/${params.id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load employee");
        setEmployee({
          ...json.data.employee,
          salaryInfo: json.data.employee.salaryInfo || null,
        });
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to load employee.");
      } finally {
        setLoading(false);
      }
    }
    loadEmployee();
  }, [params.id]);

  useEffect(() => {
    if (!canEdit) return;

    async function loadManagers() {
      const res = await fetch("/api/employees");
      if (!res.ok) return;
      const json = await res.json();
      setManagers(json.data.employees || []);
    }

    loadManagers();
  }, [canEdit]);

  const initials = useMemo(
    () =>
      employee?.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "EP",
    [employee?.name]
  );

  function updateEmployee(patch: Partial<EmployeeProfile>) {
    setEmployee((current) => (current ? { ...current, ...patch } : current));
  }

  function updateResume(
    patch: Partial<NonNullable<EmployeeProfile["resume"]>>
  ) {
    setEmployee((current) =>
      current
        ? {
            ...current,
            resume: {
              about: null,
              loveAboutJob: null,
              interests: null,
              skills: [],
              certifications: [],
              ...current.resume,
              ...patch,
            },
          }
        : current
    );
  }

  function updatePrivate(
    patch: Partial<NonNullable<EmployeeProfile["privateInfo"]>>
  ) {
    setEmployee((current) =>
      current
        ? {
            ...current,
            privateInfo: {
              dob: null,
              address: null,
              nationality: null,
              personalEmail: null,
              gender: null,
              maritalStatus: null,
              accountNumber: null,
              bankName: null,
              ifscCode: null,
              panNo: null,
              uanNo: null,
              dateOfJoining: null,
              ...current.privateInfo,
              ...patch,
            },
          }
        : current
    );
  }

  async function saveProfile() {
    if (!employee) return;
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        department: employee.department,
        location: employee.location,
        empCode: employee.empCode,
        dateOfJoining: employee.dateOfJoining,
        resume: employee.resume,
        privateInfo: employee.privateInfo,
        ...(canAssignManager ? { managerId: employee.managerId } : {}),
      };
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Save failed");
      updateEmployee(json.data.employee);
      setMessage("Profile saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function saveSalary() {
    if (!employee?.salaryInfo) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/employees/${employee.id}/salary`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthWage: employee.salaryInfo.monthWage,
          workingDaysPerWeek: employee.salaryInfo.workingDaysPerWeek,
          breakTime: employee.salaryInfo.breakTime,
          wageType: employee.salaryInfo.wageType,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Save failed");
      updateEmployee({ salaryInfo: json.data.salaryInfo });
      setMessage("Salary info saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword, confirmPassword }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Password update failed");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password updated.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Password update failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!employee) {
    return <p className="text-red-400">{message || "Employee not found."}</p>;
  }

  const salary = employee.salaryInfo || emptySalary;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold text-slate-100">Employee Profile</h1>
      </div>

      <Card className="bg-slate-900/70 border-slate-800/70">
        <CardContent className="p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-5">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-indigo-500/20 text-2xl font-bold text-indigo-200">
                {employee.profilePhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={employee.profilePhoto} alt={employee.name} className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold text-slate-100">{employee.name}</h2>
                  <Badge variant="outline" className="border-indigo-500/30 text-indigo-300">
                    {employee.role.replace("_", " ")}
                  </Badge>
                </div>
                <div className="mt-2 grid gap-x-6 gap-y-1 text-sm text-slate-400 sm:grid-cols-2 lg:grid-cols-3">
                  <span>{employee.loginId}</span>
                  <span>{employee.email}</span>
                  <span>{employee.phone || "No phone"}</span>
                  <span>{employee.department || "No department"}</span>
                  <span>{employee.manager?.name || "No manager"}</span>
                  <span>{employee.location || "No location"}</span>
                </div>
              </div>
            </div>
            {canEdit && (
              <Button
                onClick={saveProfile}
                disabled={saving}
                className="bg-indigo-600 text-white hover:bg-indigo-500"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {message && (
        <div className={cn(
          "rounded-lg border p-3 text-sm",
          message.includes("saved") || message.includes("updated")
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            : "border-red-500/30 bg-red-500/10 text-red-300"
        )}>
          {message}
        </div>
      )}

      <Tabs defaultValue="resume">
        <TabsList className="flex w-full max-w-3xl justify-start overflow-x-auto">
          <TabsTrigger value="resume">Resume</TabsTrigger>
          {canViewPrivateInfo && <TabsTrigger value="private">Private Info</TabsTrigger>}
          {canViewSalary && <TabsTrigger value="salary">Salary Info</TabsTrigger>}
          {canUseSecurity && <TabsTrigger value="security">Security</TabsTrigger>}
        </TabsList>

        <TabsContent value="resume">
          <Card className="bg-slate-900/70 border-slate-800/70">
            <CardHeader>
              <CardTitle className="text-slate-100">Resume</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <TextareaField label="About" value={employee.resume?.about || ""} disabled={!canEdit} onChange={(value) => updateResume({ about: value })} />
              <TextareaField label="What I Love About My Job" value={employee.resume?.loveAboutJob || ""} disabled={!canEdit} onChange={(value) => updateResume({ loveAboutJob: value })} />
              <TextareaField label="Interests & Hobbies" value={employee.resume?.interests || ""} disabled={!canEdit} onChange={(value) => updateResume({ interests: value })} />
              <TagEditor
                label="Skills"
                items={employee.resume?.skills || []}
                value={newSkill}
                disabled={!canEdit}
                onValueChange={setNewSkill}
                onAdd={() => {
                  if (!newSkill.trim()) return;
                  updateResume({ skills: [...(employee.resume?.skills || []), newSkill.trim()] });
                  setNewSkill("");
                }}
                onRemove={(item) => updateResume({ skills: (employee.resume?.skills || []).filter((skill) => skill !== item) })}
              />
              <TagEditor
                label="Certifications"
                items={employee.resume?.certifications || []}
                value={newCert}
                disabled={!canEdit}
                onValueChange={setNewCert}
                onAdd={() => {
                  if (!newCert.trim()) return;
                  updateResume({ certifications: [...(employee.resume?.certifications || []), newCert.trim()] });
                  setNewCert("");
                }}
                onRemove={(item) => updateResume({ certifications: (employee.resume?.certifications || []).filter((cert) => cert !== item) })}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {canViewPrivateInfo && (
        <TabsContent value="private">
          <Card className="bg-slate-900/70 border-slate-800/70">
            <CardHeader>
              <CardTitle className="text-slate-100">Private Info</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <TextField label="DOB" type="date" value={dateInput(employee.privateInfo?.dob)} disabled={!canEdit} onChange={(value) => updatePrivate({ dob: value || null })} />
              <TextField label="Nationality" value={employee.privateInfo?.nationality || ""} disabled={!canEdit} onChange={(value) => updatePrivate({ nationality: value })} />
              <TextField label="Personal Email" type="email" value={employee.privateInfo?.personalEmail || ""} disabled={!canEdit} onChange={(value) => updatePrivate({ personalEmail: value })} />
              <SelectField label="Gender" value={employee.privateInfo?.gender || ""} disabled={!canEdit} values={["Female", "Male", "Non-binary", "Prefer not to say"]} onChange={(value) => updatePrivate({ gender: value })} />
              <SelectField label="Marital Status" value={employee.privateInfo?.maritalStatus || ""} disabled={!canEdit} values={["Single", "Married", "Divorced", "Widowed"]} onChange={(value) => updatePrivate({ maritalStatus: value })} />
              <TextField label="Address" value={employee.privateInfo?.address || ""} disabled={!canEdit} onChange={(value) => updatePrivate({ address: value })} className="md:col-span-2" />
              <SectionTitle title="Bank Details" />
              <TextField label="Account Number" value={employee.privateInfo?.accountNumber || ""} disabled={!canEdit} onChange={(value) => updatePrivate({ accountNumber: value })} />
              <TextField label="Bank Name" value={employee.privateInfo?.bankName || ""} disabled={!canEdit} onChange={(value) => updatePrivate({ bankName: value })} />
              <TextField label="IFSC Code" value={employee.privateInfo?.ifscCode || ""} disabled={!canEdit} onChange={(value) => updatePrivate({ ifscCode: value })} />
              <TextField label="PAN No" value={employee.privateInfo?.panNo || ""} disabled={!canEdit} onChange={(value) => updatePrivate({ panNo: value })} />
              <TextField label="UAN No" value={employee.privateInfo?.uanNo || ""} disabled={!canEdit} onChange={(value) => updatePrivate({ uanNo: value })} />
              <TextField label="Emp Code" value={employee.empCode || ""} disabled={!canEdit} onChange={(value) => updateEmployee({ empCode: value })} />
              <ManagerField
                value={employee.managerId || "none"}
                managers={managers.filter((manager) => manager.id !== employee.id)}
                disabled={!canAssignManager}
                onChange={(value) =>
                  updateEmployee({
                    managerId: value === "none" ? null : value,
                    manager:
                      value === "none"
                        ? null
                        : managers.find((manager) => manager.id === value) || employee.manager,
                  })
                }
              />
              <TextField label="Date of Joining" type="date" value={dateInput(employee.privateInfo?.dateOfJoining || employee.dateOfJoining)} disabled={!canEdit} onChange={(value) => {
                updatePrivate({ dateOfJoining: value || null });
                updateEmployee({ dateOfJoining: value || null });
              }} />
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {canViewSalary && (
          <TabsContent value="salary">
            <Card className="bg-slate-900/70 border-slate-800/70">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-slate-100">Salary Info</CardTitle>
                <Button onClick={saveSalary} disabled={saving} className="bg-indigo-600 text-white hover:bg-indigo-500">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Salary
                </Button>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <TextField label="Month Wage" type="number" value={String(salary.monthWage)} onChange={(value) => updateEmployee({ salaryInfo: calculateSalary(Number(value), salary) })} />
                <TextField label="Working Days/Week" type="number" value={String(salary.workingDaysPerWeek)} onChange={(value) => updateEmployee({ salaryInfo: { ...salary, workingDaysPerWeek: Number(value) } })} />
                <TextField label="Break Time" type="number" value={String(salary.breakTime)} onChange={(value) => updateEmployee({ salaryInfo: { ...salary, breakTime: Number(value) } })} />
                <SelectField label="Wage Type" value={salary.wageType} values={["MONTHLY", "HOURLY", "DAILY"]} onChange={(value) => updateEmployee({ salaryInfo: { ...salary, wageType: value } })} />
                {[
                  ["Basic", salary.basicSalary],
                  ["HRA", salary.hra],
                  ["Standard Allowance", salary.standardAllowance],
                  ["Performance Bonus", salary.performanceBonus],
                  ["LTA", salary.lta],
                  ["Fixed Allowance", salary.fixedAllowance],
                  ["Employee PF", salary.employeePF],
                  ["Employer PF", salary.employerPF],
                  ["Professional Tax", salary.professionalTax],
                ].map(([label, value]) => (
                  <ReadOnlyMoney key={label as string} label={label as string} value={value as number} />
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {canUseSecurity && (
        <TabsContent value="security">
          <Card className="bg-slate-900/70 border-slate-800/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-100">
                <Shield className="h-5 w-5 text-indigo-300" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={changePassword} className="grid max-w-xl grid-cols-1 gap-4">
                <TextField label="Login ID" value={employee.loginId} disabled onChange={() => undefined} />
                <TextField label="Old Password" type="password" value={oldPassword} onChange={setOldPassword} />
                <TextField label="New Password" type="password" value={newPassword} onChange={setNewPassword} />
                <TextField label="Confirm New Password" type="password" value={confirmPassword} onChange={setConfirmPassword} />
                <Button type="submit" disabled={saving} className="w-fit bg-indigo-600 text-white hover:bg-indigo-500">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Password
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h3 className="md:col-span-2 pt-2 text-sm font-semibold text-slate-200">{title}</h3>;
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  disabled,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-slate-300">{label}</Label>
      <Input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="bg-slate-800/50 border-slate-600 text-slate-100 disabled:text-slate-400 [color-scheme:dark]"
      />
    </div>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-slate-300">{label}</Label>
      <Textarea
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="bg-slate-800/50 border-slate-600 text-slate-100 disabled:text-slate-400"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  values,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  values: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-slate-300">{label}</Label>
      <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-full bg-slate-800/50 border-slate-600 text-slate-100">
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
          {values.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ManagerField({
  value,
  managers,
  onChange,
  disabled,
}: {
  value: string;
  managers: ManagerOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-slate-300">Reporting Manager</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-full bg-slate-800/50 border-slate-600 text-slate-100">
          <SelectValue placeholder="Select reporting manager" />
        </SelectTrigger>
        <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
          <SelectItem value="none">No Manager</SelectItem>
          {managers.map((manager) => (
            <SelectItem key={manager.id} value={manager.id}>
              {manager.name} ({manager.role.replace("_", " ")})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function TagEditor({
  label,
  items,
  value,
  onValueChange,
  onAdd,
  onRemove,
  disabled,
}: {
  label: string;
  items: string[];
  value: string;
  onValueChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (item: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-slate-300">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge key={item} variant="outline" className="gap-1 border-indigo-500/30 bg-indigo-500/10 text-indigo-200">
            {item}
            {!disabled && (
              <button type="button" onClick={() => onRemove(item)}>
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
      </div>
      {!disabled && (
        <div className="flex max-w-md gap-2">
          <Input
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            className="bg-slate-800/50 border-slate-600 text-slate-100"
          />
          <Button type="button" onClick={onAdd} variant="outline" className="border-slate-700 text-slate-200">
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      )}
    </div>
  );
}

function ReadOnlyMoney({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-slate-300">{label}</Label>
      <Input value={money(value)} readOnly className="bg-slate-800/50 border-slate-700 text-slate-300" />
    </div>
  );
}
