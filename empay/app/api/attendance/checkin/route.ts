import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function todayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { now, start, end };
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { now, start, end } = todayRange();
    const existing = await prisma.attendance.findFirst({
      where: {
        userId: currentUser.id,
        date: { gte: start, lt: end },
      },
    });

    const record = existing
      ? await prisma.attendance.update({
          where: { id: existing.id },
          data: { checkIn: existing.checkIn ?? now, status: "PRESENT" },
        })
      : await prisma.attendance.create({
          data: {
            userId: currentUser.id,
            date: start,
            checkIn: now,
            status: "PRESENT",
          },
        });

    return NextResponse.json({ data: { record } });
  } catch (error) {
    console.error("[CHECKIN ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
