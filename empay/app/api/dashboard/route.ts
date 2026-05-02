import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dateRangeForMonth(year: number, monthIndex: number) {
  return {
    start: new Date(year, monthIndex, 1),
    end: new Date(year, monthIndex + 1, 0, 23, 59, 59, 999),
  };
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    if (currentUser.role === "ADMIN") {
      const year = now.getFullYear();
      const [
        withoutBankAccount,
        withoutManager,
        lastPayruns,
        salaryInfos,
        users,
      ] = await Promise.all([
        prisma.user.count({
          where: {
            OR: [
              { privateInfo: null },
              { privateInfo: { accountNumber: null } },
              { privateInfo: { accountNumber: "" } },
            ],
          },
        }),
        prisma.user.count({ where: { managerId: null } }),
        prisma.payrun.findMany({
          take: 2,
          include: { _count: { select: { payslips: true } } },
          orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
        }),
        prisma.salaryInfo.findMany({ select: { monthWage: true, employerPF: true } }),
        prisma.user.findMany({ select: { createdAt: true } }),
      ]);

      const monthlyEmployerCost = salaryInfos.reduce(
        (sum, salary) => sum + salary.monthWage + salary.employerPF,
        0
      );

      const employerCost = months.map((month) => ({
        month,
        total: monthlyEmployerCost,
      }));

      const employeeCount = months.map((month, index) => {
        const { end } = dateRangeForMonth(year, index);
        return {
          month,
          count: users.filter((user) => user.createdAt <= end).length,
        };
      });

      return NextResponse.json({
        data: {
          role: "ADMIN",
          warnings: { withoutBankAccount, withoutManager },
          lastPayruns,
          employerCost,
          employeeCount,
        },
      });
    }

    const [todayAttendance, recentTimeOff, recentPayslips] = await Promise.all([
      prisma.attendance.findFirst({
        where: {
          userId: currentUser.id,
          date: { gte: startOfDay, lt: endOfDay },
        },
      }),
      prisma.timeOffRequest.findMany({
        where: { userId: currentUser.id },
        take: 3,
        orderBy: { createdAt: "desc" },
      }),
      prisma.payslip.findMany({
        where: { userId: currentUser.id },
        take: 2,
        include: { payrun: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      data: {
        role: "EMPLOYEE",
        today: now,
        attendance: todayAttendance,
        recentTimeOff,
        recentPayslips,
      },
    });
  } catch (error) {
    console.error("[DASHBOARD GET ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
