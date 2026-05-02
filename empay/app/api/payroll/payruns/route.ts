import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const createPayrunSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

function canUsePayroll(role: string) {
  return role === "ADMIN" || role === "PAYROLL_OFFICER";
}

function moneyNumber(value: number) {
  return Number(value.toFixed(2));
}

function monthRange(month: number, year: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

function isWeekday(date: Date) {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

function workingDaysInMonth(month: number, year: number) {
  const { start, end } = monthRange(month, year);
  let count = 0;
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    if (isWeekday(date)) count += 1;
  }
  return count;
}

function countWeekdaysBetween(start: Date, end: Date) {
  let count = 0;
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  for (; cursor <= last; cursor.setDate(cursor.getDate() + 1)) {
    if (isWeekday(cursor)) count += 1;
  }
  return count;
}

function salaryHasValues(salaryInfo: {
  basicSalary: number;
  hra: number;
  standardAllowance: number;
  performanceBonus: number;
  lta: number;
  fixedAllowance: number;
} | null) {
  if (!salaryInfo) return false;
  return (
    salaryInfo.basicSalary +
      salaryInfo.hra +
      salaryInfo.standardAllowance +
      salaryInfo.performanceBonus +
      salaryInfo.lta +
      salaryInfo.fixedAllowance >
    0
  );
}

function toPayslipData(user: {
  id: string;
  salaryInfo: {
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
  } | null;
  attendance?: Array<{ date: Date; checkIn: Date | null; status: string }>;
  timeOffRequests?: Array<{ startDate: Date; endDate: Date; status: string }>;
}, month: number, year: number) {
  if (!user.salaryInfo || !salaryHasValues(user.salaryInfo)) return null;

  const grossPay =
    user.salaryInfo.basicSalary +
    user.salaryInfo.hra +
    user.salaryInfo.standardAllowance +
    user.salaryInfo.performanceBonus +
    user.salaryInfo.lta +
    user.salaryInfo.fixedAllowance;
  const totalWorkingDays = workingDaysInMonth(month, year);
  const attendanceDays = new Set(
    (user.attendance || [])
      .filter((item) => item.checkIn || item.status === "PRESENT")
      .map((item) => item.date.toISOString().slice(0, 10))
  ).size;
  const { start: monthStart, end: monthEnd } = monthRange(month, year);
  const paidLeaveDays = (user.timeOffRequests || []).reduce((sum, leave) => {
    if (leave.status !== "APPROVED") return sum;
    const overlapStart = leave.startDate > monthStart ? leave.startDate : monthStart;
    const overlapEnd = leave.endDate < monthEnd ? leave.endDate : monthEnd;
    if (overlapStart > overlapEnd) return sum;
    return sum + countWeekdaysBetween(overlapStart, overlapEnd);
  }, 0);
  const paidDays = Math.min(totalWorkingDays, attendanceDays + paidLeaveDays);
  const dailyRate = totalWorkingDays > 0 ? grossPay / totalWorkingDays : 0;
  const earnedGross = dailyRate * paidDays;
  const netPay =
    earnedGross -
    user.salaryInfo.employeePF -
    user.salaryInfo.professionalTax -
    user.salaryInfo.tdsDeduction;

  return {
    employeeId: user.id,
    totalWorkingDays,
    attendanceDays,
    paidLeaveDays,
    basicSalary: user.salaryInfo.basicSalary,
    hra: user.salaryInfo.hra,
    standardAllowance: user.salaryInfo.standardAllowance,
    performanceBonus: user.salaryInfo.performanceBonus,
    lta: user.salaryInfo.lta,
    fixedAllowance: user.salaryInfo.fixedAllowance,
    employeePF: user.salaryInfo.employeePF,
    employerPF: user.salaryInfo.employerPF,
    professionalTax: user.salaryInfo.professionalTax,
    tdsDeduction: user.salaryInfo.tdsDeduction,
    grossPay: moneyNumber(earnedGross),
    netPay: moneyNumber(netPay),
    employerCost: moneyNumber(user.salaryInfo.basicSalary + user.salaryInfo.employerPF),
  };
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canUsePayroll(currentUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const { start, end } = monthRange(month, year);

    const [payruns, users, warningUsers] = await Promise.all([
      prisma.payrun.findMany({
        include: { _count: { select: { payslips: true } } },
        orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
      }),
      prisma.user.findMany({
        where: { salaryInfo: { isNot: null } },
        select: {
          id: true,
          name: true,
          loginId: true,
          department: true,
          salaryInfo: true,
          attendance: { where: { date: { gte: start, lte: end } }, select: { date: true, checkIn: true, status: true } },
          timeOffRequests: { where: { status: "APPROVED", startDate: { lte: end }, endDate: { gte: start } }, select: { startDate: true, endDate: true, status: true } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          loginId: true,
          managerId: true,
          department: true,
          privateInfo: { select: { accountNumber: true, panNo: true, uanNo: true } },
          salaryInfo: {
            select: {
              basicSalary: true,
              hra: true,
              standardAllowance: true,
              performanceBonus: true,
              lta: true,
              fixedAllowance: true,
            },
          },
        },
      }),
    ]);

    const latestPayrun = payruns[0]
      ? await prisma.payrun.findUnique({
          where: { id: payruns[0].id },
          include: { payslips: true },
        })
      : null;
    const latestPayslips = latestPayrun?.payslips || [];
    const totalNetPay = latestPayslips.reduce((sum, payslip) => sum + payslip.netPay, 0);
    const totalDeductions = latestPayslips.reduce(
      (sum, payslip) => sum + payslip.employeePF + payslip.professionalTax + payslip.tdsDeduction,
      0
    );

    const previewEmployees = users
      .map((user) => {
        const payslip = toPayslipData(user, month, year);
        if (!payslip) return null;
        const fullGross =
          user.salaryInfo!.basicSalary +
          user.salaryInfo!.hra +
          user.salaryInfo!.standardAllowance +
          user.salaryInfo!.performanceBonus +
          user.salaryInfo!.lta +
          user.salaryInfo!.fixedAllowance;
        return {
          id: user.id,
          name: user.name,
          loginId: user.loginId,
          department: user.department,
          basicSalary: user.salaryInfo!.basicSalary,
          grossPay: fullGross,
          deductions: payslip.employeePF + payslip.professionalTax + payslip.tdsDeduction,
          netPay: payslip.netPay,
        };
      })
      .filter(Boolean);

    const missingSalaryEmployees = warningUsers
      .filter((user) => !salaryHasValues(user.salaryInfo))
      .map((user) => ({ id: user.id, name: user.name, loginId: user.loginId }));
    const warnings = {
      withoutBankAccount: warningUsers.filter((user) => !user.privateInfo?.accountNumber).length,
      withoutPan: warningUsers.filter((user) => !user.privateInfo?.panNo).length,
      withoutUan: warningUsers.filter((user) => !user.privateInfo?.uanNo).length,
      withoutDepartment: warningUsers.filter((user) => !user.department).length,
      withoutManager: warningUsers.filter((user) => !user.managerId).length,
      missingSalaryInfo: missingSalaryEmployees.length,
    };

    return NextResponse.json({
      data: {
        payruns,
        previewEmployees,
        missingSalaryEmployees,
        warnings,
        latestSummary: {
          totalMonthlyPayroll: totalNetPay,
          employeesIncluded: latestPayslips.length,
          averageNetPay: latestPayslips.length ? totalNetPay / latestPayslips.length : 0,
          totalDeductions,
        },
      },
    });
  } catch (error) {
    console.error("[PAYRUNS GET ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canUsePayroll(currentUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const parsed = createPayrunSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const existing = await prisma.payrun.findFirst({
      where: { month: parsed.data.month, year: parsed.data.year },
    });
    if (existing) {
      return NextResponse.json({ error: "A payrun already exists for this month and year" }, { status: 409 });
    }

    const { start, end } = monthRange(parsed.data.month, parsed.data.year);
    const users = await prisma.user.findMany({
      where: { salaryInfo: { isNot: null } },
      select: {
        id: true,
        salaryInfo: true,
        attendance: { where: { date: { gte: start, lte: end } }, select: { date: true, checkIn: true, status: true } },
        timeOffRequests: { where: { status: "APPROVED", startDate: { lte: end }, endDate: { gte: start } }, select: { startDate: true, endDate: true, status: true } },
      },
    });

    const payslips = users
      .map((user) => toPayslipData(user, parsed.data.month, parsed.data.year))
      .filter((payslip): payslip is NonNullable<typeof payslip> => Boolean(payslip));

    if (payslips.length === 0) {
      return NextResponse.json({ error: "No employees with salary info found" }, { status: 400 });
    }

    const payrun = await prisma.payrun.create({
      data: {
        month: parsed.data.month,
        year: parsed.data.year,
        status: "GENERATED",
        createdBy: currentUser.id,
        payslips: { create: payslips },
      },
      include: { _count: { select: { payslips: true } } },
    });

    return NextResponse.json({ data: { payrun } }, { status: 201 });
  } catch (error) {
    console.error("[PAYRUNS POST ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
