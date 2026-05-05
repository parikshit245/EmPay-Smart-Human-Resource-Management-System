import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth";
import {
  countWorkingDaysBetween,
  monthRange,
  overlapRange,
  publicHolidayKeys,
} from "@/lib/leave-utils";

export const dynamic = "force-dynamic";

function moneyNumber(value: number) {
  return Number(value.toFixed(2));
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = getTokenPayload(request);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    if (!startDateParam || !endDateParam) {
      return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 });
    }

    const startDate = new Date(startDateParam);
    const endDate = new Date(endDateParam);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }

    const salaryInfo = await prisma.salaryInfo.findUnique({
      where: { userId: currentUser.id },
      select: { basicSalary: true, fixedAllowance: true },
    });

    if (!salaryInfo) {
      return NextResponse.json({
        data: { deduction: 0, unpaidLeaveDays: 0, totalWorkingDays: 0, monthlySalary: 0 },
      });
    }

    const month = startDate.getMonth() + 1;
    const year = startDate.getFullYear();
    const { start, end } = monthRange(month, year);
    const holidays = await publicHolidayKeys(start, end);
    const overlap = overlapRange(startDate, endDate, start, end);
    const unpaidLeaveDays = overlap ? countWorkingDaysBetween(overlap.start, overlap.end, holidays) : 0;
    const totalWorkingDays = countWorkingDaysBetween(start, end, holidays);
    const monthlySalary = salaryInfo.basicSalary + salaryInfo.fixedAllowance;
    const deduction = totalWorkingDays > 0 ? (monthlySalary / totalWorkingDays) * unpaidLeaveDays : 0;

    return NextResponse.json({
      data: {
        deduction: moneyNumber(deduction),
        unpaidLeaveDays,
        totalWorkingDays,
        monthlySalary: moneyNumber(monthlySalary),
      },
    });
  } catch (error) {
    console.error("[TIME_OFF DEDUCTION ESTIMATE ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
