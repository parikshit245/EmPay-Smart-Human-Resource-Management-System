import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const canViewAll = ["ADMIN", "HR_OFFICER", "PAYROLL_OFFICER"].includes(
      currentUser.role
    );
    const scopedUserId = canViewAll ? employeeId || undefined : currentUser.id;

    const records = await prisma.attendance.findMany({
      where: {
        userId: scopedUserId,
        date: {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined,
        },
      },
      include: {
        user: { select: { id: true, name: true, loginId: true } },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ data: { records } });
  } catch (error) {
    console.error("[ATTENDANCE GET ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
