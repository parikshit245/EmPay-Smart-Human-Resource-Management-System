import { prisma } from "@/lib/prisma";

export interface AIContext {
  userName: string;
  userRole: string;
  adminData?: {
    totalEmployees: number;
    presentToday: number;
    pendingLeaveRequests: number;
    nextPayrunDueDate: string | null;
  };
  employeeData?: {
    presentDaysThisMonth: number;
    remainingLeaves: number;
    lastSalaryAmount: number;
    pendingLeaveStatus: string;
  };
  hrData?: {
    totalEmployees: number;
    absentToday: number;
    employeesWithAttendanceIssues: number;
    pendingLeaveAllocations: number;
  };
  payrollData?: {
    pendingPayslips: number;
    currentMonthPayrunEstimate: number;
    lastMonthPayrunTotal: number;
    pendingTimeOffApprovals: number;
  };
}

export async function fetchAIContext(
  userId: string,
  role: string
): Promise<AIContext> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });

  const context: AIContext = {
    userName: user?.name || "User",
    userRole: role,
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const currentYear = today.getFullYear();
  const monthStart = new Date(currentYear, today.getMonth(), 1);
  const monthEnd = new Date(currentYear, today.getMonth() + 1, 0);

  if (role === "ADMIN") {
    // All queries run in parallel
    const [totalEmployees, presentToday, pendingLeaveRequests, nextPayrun] =
      await Promise.all([
        prisma.user.count({ where: { role: "EMPLOYEE" } }),
        prisma.attendance.count({
          where: {
            date: { gte: today, lt: tomorrow },
            status: "PRESENT",
          },
        }),
        prisma.timeOffRequest.count({ where: { status: "PENDING" } }),
        prisma.payrun.findFirst({
          where: { status: { in: ["DRAFT", "GENERATED"] } },
          orderBy: { createdAt: "asc" },
          select: { createdAt: true },
        }),
      ]);

    context.adminData = {
      totalEmployees,
      presentToday,
      pendingLeaveRequests,
      nextPayrunDueDate: nextPayrun
        ? nextPayrun.createdAt.toISOString().split("T")[0]
        : null,
    };
  }

  if (role === "EMPLOYEE") {
    // All queries run in parallel
    const [
      presentDaysThisMonth,
      currentYearAllocation,
      takenLeaves,
      lastPayslip,
      pendingLeave,
    ] = await Promise.all([
      prisma.attendance.count({
        where: {
          userId,
          date: { gte: monthStart, lte: monthEnd },
          status: "PRESENT",
        },
      }),
      prisma.employeeLeaveAllocation.findUnique({
        where: { employeeId_year: { employeeId: userId, year: currentYear } },
      }),
      prisma.timeOffRequest.count({
        where: {
          userId,
          status: "APPROVED",
          startDate: {
            gte: new Date(currentYear, 0, 1),
            lte: new Date(currentYear, 11, 31),
          },
        },
      }),
      prisma.payslip.findFirst({
        where: { employeeId: userId },
        orderBy: { createdAt: "desc" },
        select: { netPay: true },
      }),
      prisma.timeOffRequest.findFirst({
        where: { userId, status: "PENDING" },
        select: { status: true },
      }),
    ]);

    const allocatedPaid = currentYearAllocation?.paidLeavesAllocated || 20;
    const remainingLeaves = Math.max(0, allocatedPaid - takenLeaves);

    context.employeeData = {
      presentDaysThisMonth,
      remainingLeaves,
      lastSalaryAmount: lastPayslip?.netPay || 0,
      pendingLeaveStatus: pendingLeave
        ? "You have a pending leave request"
        : "No pending leave requests",
    };
  }

  if (role === "HR_OFFICER") {
    // Fixed N+1 query: single aggregation instead of looping per employee
    const twoMonthsAgo = new Date(currentYear, today.getMonth() - 1, 1);
    const currentMonthEnd = new Date(currentYear, today.getMonth() + 1, 0);

    const [totalEmployees, absentToday, absenceGroups] = await Promise.all([
      prisma.user.count({ where: { role: "EMPLOYEE" } }),
      prisma.attendance.count({
        where: {
          date: { gte: today, lt: tomorrow },
          status: "ABSENT",
        },
      }),
      // Single grouped query replaces the N+1 loop
      prisma.attendance.groupBy({
        by: ["userId"],
        where: {
          status: "ABSENT",
          date: { gte: twoMonthsAgo, lte: currentMonthEnd },
          user: { role: "EMPLOYEE" },
        },
        _count: { id: true },
        having: { id: { _count: { gte: 5 } } },
      }),
    ]);

    context.hrData = {
      totalEmployees,
      absentToday,
      employeesWithAttendanceIssues: absenceGroups.length,
      pendingLeaveAllocations: 0,
    };
  }

  if (role === "PAYROLL_OFFICER") {
    const currentMonth = today.getMonth() + 1;
    const lastMonthDate = new Date(today);
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);

    // All queries run in parallel
    const [pendingPayslips, currentMonthPayrun, lastMonthPayrun, pendingTimeOffApprovals] =
      await Promise.all([
        prisma.payslip.count({
          where: { status: { in: ["GENERATED", "VALIDATED"] } },
        }),
        prisma.payrun.findFirst({
          where: { month: currentMonth, year: currentYear },
          include: { payslips: { select: { netPay: true } } },
        }),
        prisma.payrun.findFirst({
          where: {
            month: lastMonthDate.getMonth() + 1,
            year: lastMonthDate.getFullYear(),
          },
          include: { payslips: { select: { netPay: true } } },
        }),
        prisma.timeOffRequest.count({ where: { status: "PENDING" } }),
      ]);

    const currentMonthPayrunEstimate = currentMonthPayrun
      ? currentMonthPayrun.payslips.reduce((sum, p) => sum + p.netPay, 0)
      : 0;
    const lastMonthPayrunTotal = lastMonthPayrun
      ? lastMonthPayrun.payslips.reduce((sum, p) => sum + p.netPay, 0)
      : 0;

    context.payrollData = {
      pendingPayslips,
      currentMonthPayrunEstimate,
      lastMonthPayrunTotal,
      pendingTimeOffApprovals,
    };
  }

  return context;
}