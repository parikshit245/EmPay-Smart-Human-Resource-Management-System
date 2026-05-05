import { prisma } from "@/lib/prisma";

export const LEAVE_TYPE_LABELS: Record<string, string> = {
  PAID: "Paid Leave",
  SICK: "Sick Leave",
  UNPAID: "Unpaid Leave",
  OTHER: "Other",
};

export function normalizeLeaveType(value: string) {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, "_");
  if (normalized === "PAID_LEAVE" || normalized === "CASUAL_LEAVE") return "PAID";
  if (normalized === "SICK_LEAVE") return "SICK";
  if (normalized === "UNPAID_LEAVE") return "UNPAID";
  if (["PAID", "SICK", "UNPAID", "OTHER"].includes(normalized)) return normalized;
  return "OTHER";
}

export function monthRange(month: number, year: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

export function overlapRange(startDate: Date, endDate: Date, rangeStart: Date, rangeEnd: Date) {
  const start = startDate > rangeStart ? startDate : rangeStart;
  const end = endDate < rangeEnd ? endDate : rangeEnd;
  return start > end ? null : { start, end };
}

export function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export async function publicHolidayKeys(start: Date, end: Date) {
  const holidays = await prisma.publicHoliday.findMany({
    where: { date: { gte: start, lte: end } },
    select: { date: true },
  });

  return new Set(holidays.map((holiday) => dateKey(holiday.date)));
}

export function countWorkingDaysBetween(startDate: Date, endDate: Date, holidays = new Set<string>()) {
  let count = 0;
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const last = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  for (; cursor <= last; cursor.setDate(cursor.getDate() + 1)) {
    if (!isWeekend(cursor) && !holidays.has(dateKey(cursor))) count += 1;
  }

  return count;
}

export async function workingDaysInMonth(month: number, year: number) {
  const { start, end } = monthRange(month, year);
  const holidays = await publicHolidayKeys(start, end);
  return countWorkingDaysBetween(start, end, holidays);
}

export function countCalendarDaysBetween(startDate: Date, endDate: Date) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1);
}
