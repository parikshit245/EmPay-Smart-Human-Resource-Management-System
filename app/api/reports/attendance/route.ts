import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const currentUser = getTokenPayload(request);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "PAYROLL_OFFICER"].includes(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    const selectedMonth = month ? Number(month) - 1 : new Date().getMonth();
    const selectedYear = year ? Number(year) : new Date().getFullYear();
    const start = new Date(selectedYear, selectedMonth, 1);
    const end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);

    const attendance = await prisma.attendance.findMany({
      where: {
        userId: userId && userId !== "all" ? userId : undefined,
        date: { gte: start, lte: end },
      },
      include: {
        user: { select: { id: true, name: true, loginId: true, department: true } },
      },
      orderBy: { date: "asc" },
    });

    return NextResponse.json({ data: { attendance } });
  } catch (error) {
    console.error("[REPORT ATTENDANCE GET ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
