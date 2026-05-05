import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  countCalendarDaysBetween,
  countWorkingDaysBetween,
  monthRange,
  normalizeLeaveType,
  overlapRange,
  publicHolidayKeys,
} from "@/lib/leave-utils";

export const dynamic = "force-dynamic";

function canViewLeaveAvailability(role: string) {
  return ["ADMIN", "HR_OFFICER", "PAYROLL_OFFICER"].includes(role);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canViewLeaveAvailability(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const year = Number(searchParams.get("year") || now.getFullYear());
    if (!Number.isInteger(year)) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }

    const employee = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

    const allocation = await prisma.employeeLeaveAllocation.upsert({
      where: { employeeId_year: { employeeId: params.id, year } },
      create: { employeeId: params.id, year },
      update: {},
    });

    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);
    const leaves = await prisma.timeOffRequest.findMany({
      where: {
        userId: params.id,
        status: "APPROVED",
        startDate: { lte: yearEnd },
        endDate: { gte: yearStart },
      },
      select: { leaveType: true, startDate: true, endDate: true },
    });

    const paidLeavesUsed = leaves
      .filter((leave) => normalizeLeaveType(leave.leaveType) === "PAID")
      .reduce((sum, leave) => {
        const overlap = overlapRange(leave.startDate, leave.endDate, yearStart, yearEnd);
        return overlap ? sum + countCalendarDaysBetween(overlap.start, overlap.end) : sum;
      }, 0);
    const sickLeavesUsed = leaves
      .filter((leave) => normalizeLeaveType(leave.leaveType) === "SICK")
      .reduce((sum, leave) => {
        const overlap = overlapRange(leave.startDate, leave.endDate, yearStart, yearEnd);
        return overlap ? sum + countCalendarDaysBetween(overlap.start, overlap.end) : sum;
      }, 0);

    const { start: monthStart, end: monthEnd } = monthRange(now.getMonth() + 1, now.getFullYear());
    const holidays = await publicHolidayKeys(monthStart, monthEnd);
    const unpaidLeavesUsedCurrentMonth = leaves
      .filter((leave) => normalizeLeaveType(leave.leaveType) === "UNPAID")
      .reduce((sum, leave) => {
        const overlap = overlapRange(leave.startDate, leave.endDate, monthStart, monthEnd);
        return overlap ? sum + countWorkingDaysBetween(overlap.start, overlap.end, holidays) : sum;
      }, 0);

    return NextResponse.json({
      data: {
        paidLeavesAllocated: allocation.paidLeavesAllocated,
        paidLeavesUsed,
        paidLeavesLeft: Math.max(0, allocation.paidLeavesAllocated - paidLeavesUsed),
        sickLeavesAllocated: allocation.sickLeavesAllocated,
        sickLeavesUsed,
        sickLeavesLeft: Math.max(0, allocation.sickLeavesAllocated - sickLeavesUsed),
        unpaidLeavesUsedCurrentMonth,
        year,
      },
    });
  } catch (error) {
    console.error("[LEAVE AVAILABILITY ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
