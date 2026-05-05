import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth";
import {
  countWorkingDaysBetween,
  dateKey,
  monthRange,
  normalizeLeaveType,
  overlapRange,
  publicHolidayKeys,
} from "@/lib/leave-utils";

export const dynamic = "force-dynamic";

function addWorkingDayKeys(keys: Set<string>, start: Date, end: Date, holidays: Set<string>) {
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  for (; cursor <= last; cursor.setDate(cursor.getDate() + 1)) {
    if (countWorkingDaysBetween(cursor, cursor, holidays) === 1) keys.add(dateKey(cursor));
  }
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = getTokenPayload(request);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const month = Number(searchParams.get("month") || now.getMonth() + 1);
    const year = Number(searchParams.get("year") || now.getFullYear());
    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year)) {
      return NextResponse.json({ error: "Invalid month or year" }, { status: 400 });
    }

    const { start, end } = monthRange(month, year);
    const holidays = await publicHolidayKeys(start, end);

    const [attendance, leaves] = await Promise.all([
      prisma.attendance.findMany({
        where: { userId: currentUser.id, date: { gte: start, lte: end } },
        select: { date: true, checkIn: true, status: true },
      }),
      prisma.timeOffRequest.findMany({
        where: {
          userId: currentUser.id,
          status: "APPROVED",
          startDate: { lte: end },
          endDate: { gte: start },
        },
        select: { leaveType: true, startDate: true, endDate: true },
      }),
    ]);

    const approvedLeaveDays = new Set<string>();
    for (const leave of leaves) {
      if (!["PAID", "SICK", "UNPAID"].includes(normalizeLeaveType(leave.leaveType))) continue;
      const overlap = overlapRange(leave.startDate, leave.endDate, start, end);
      if (overlap) addWorkingDayKeys(approvedLeaveDays, overlap.start, overlap.end, holidays);
    }

    const presentDays = new Set(
      attendance
        .filter((record) => record.checkIn || record.status === "PRESENT")
        .map((record) => dateKey(record.date))
        .filter((key) => !approvedLeaveDays.has(key))
    );
    const totalWorkingDays = countWorkingDaysBetween(start, end, holidays);

    return NextResponse.json({
      data: {
        daysPresent: presentDays.size,
        totalLeaves: approvedLeaveDays.size,
        totalWorkingDays,
        currentMonth: new Intl.DateTimeFormat("en-IN", { month: "long" }).format(start),
        currentYear: year,
      },
    });
  } catch (error) {
    console.error("[ATTENDANCE SUMMARY ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
