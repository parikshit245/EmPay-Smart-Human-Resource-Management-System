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

  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  const monthStart = new Date(currentYear, today.getMonth(), 1);
  const monthEnd = new Date(currentYear, today.getMonth() + 1, 0);

  if (role === "ADMIN") {
    // Total employee count
    const totalEmployees = await prisma.user.count({
      where: { role: "EMPLOYEE" },
    });

    // Present today
    const presentToday = await prisma.attendance.count({
      where: {
        date: { gte: today, lt: tomorrow },
        status: "PRESENT",
      },
    });

    // Pending leave requests
    const pendingLeaveRequests = await prisma.timeOffRequest.count({
      where: { status: "PENDING" },
    });

    // Next payrun due date (find the next payrun)
    const nextPayrun = await prisma.payrun.findFirst({
      where: { status: { in: ["DRAFT", "GENERATED"] } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });

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
    // Attendance this month
    const presentDaysThisMonth = await prisma.attendance.count({
      where: {
        userId,
        date: { gte: monthStart, lte: monthEnd },
        status: "PRESENT",
      },
    });

    // Remaining leaves (calculate from allocations)
    const currentYearAllocation =
      await prisma.employeeLeaveAllocation.findUnique({
        where: { employeeId_year: { employeeId: userId, year: currentYear } },
      });

    const takenLeaves = await prisma.timeOffRequest.count({
      where: {
        userId,
        status: "APPROVED",
        startDate: {
          gte: new Date(currentYear, 0, 1),
          lte: new Date(currentYear, 11, 31),
        },
      },
    });

    const allocatedPaid = currentYearAllocation?.paidLeavesAllocated || 20;
    const remainingLeaves = Math.max(0, allocatedPaid - takenLeaves);

    // Last salary/payslip
    const lastPayslip = await prisma.payslip.findFirst({
      where: { employeeId: userId },
      orderBy: { createdAt: "desc" },
      select: { netPay: true },
    });

    // Pending leave request status
    const pendingLeave = await prisma.timeOffRequest.findFirst({
      where: { userId, status: "PENDING" },
      select: { status: true },
    });

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
    // Total employees
    const totalEmployees = await prisma.user.count({
      where: { role: "EMPLOYEE" },
    });

    // Absent today
    const absentToday = await prisma.attendance.count({
      where: {
        date: { gte: today, lt: tomorrow },
        status: "ABSENT",
      },
    });

    // Employees with 5+ absences
    const employeesWithIssues = await prisma.user.findMany({
      where: {
        role: "EMPLOYEE",
        attendance: {
          some: {
            status: "ABSENT",
            date: {
              gte: new Date(currentYear, today.getMonth() - 1, 1),
              lte: new Date(currentYear, today.getMonth() + 1, 0),
            },
          },
        },
      },
      select: { id: true },
    });

    const absenceCounts: Record<string, number> = {};
    for (const emp of employeesWithIssues) {
      const count = await prisma.attendance.count({
        where: {
          userId: emp.id,
          status: "ABSENT",
          date: {
            gte: new Date(currentYear, today.getMonth() - 1, 1),
            lte: new Date(currentYear, today.getMonth() + 1, 0),
          },
        },
      });
      if (count >= 5) {
        absenceCounts[emp.id] = count;
      }
    }

    // Pending leave allocations
    const pendingLeaveAllocations = 0; // This depends on your leave allocation workflow

    context.hrData = {
      totalEmployees,
      absentToday,
      employeesWithAttendanceIssues: Object.keys(absenceCounts).length,
      pendingLeaveAllocations,
    };
  }

  if (role === "PAYROLL_OFFICER") {
    // Pending payslips
    const pendingPayslips = await prisma.payslip.count({
      where: { status: { in: ["GENERATED", "VALIDATED"] } },
    });

    // Current month payrun estimate
    const currentMonthPayrun = await prisma.payrun.findFirst({
      where: {
        month: currentMonth,
        year: currentYear,
      },
    });

    let currentMonthPayrunEstimate = 0;
    if (currentMonthPayrun) {
      const payslips = await prisma.payslip.findMany({
        where: { payrunId: currentMonthPayrun.id },
        select: { netPay: true },
      });
      currentMonthPayrunEstimate = payslips.reduce(
        (sum, p) => sum + p.netPay,
        0
      );
    }

    // Last month payrun total
    const lastMonthDate = new Date(today);
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonthPayrun = await prisma.payrun.findFirst({
      where: {
        month: lastMonthDate.getMonth() + 1,
        year: lastMonthDate.getFullYear(),
      },
    });

    let lastMonthPayrunTotal = 0;
    if (lastMonthPayrun) {
      const payslips = await prisma.payslip.findMany({
        where: { payrunId: lastMonthPayrun.id },
        select: { netPay: true },
      });
      lastMonthPayrunTotal = payslips.reduce((sum, p) => sum + p.netPay, 0);
    }

    // Pending time-off approvals
    const pendingTimeOffApprovals = await prisma.timeOffRequest.count({
      where: { status: "PENDING" },
    });

    context.payrollData = {
      pendingPayslips,
      currentMonthPayrunEstimate,
      lastMonthPayrunTotal,
      pendingTimeOffApprovals,
    };
  }

  return context;
}