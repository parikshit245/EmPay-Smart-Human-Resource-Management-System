import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "PAYROLL_OFFICER"].includes(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const leaves = await prisma.timeOffRequest.findMany({
      where: {
        userId: userId && userId !== "all" ? userId : undefined,
        startDate: endDate ? { lte: new Date(endDate) } : undefined,
        endDate: startDate ? { gte: new Date(startDate) } : undefined,
      },
      include: {
        user: { select: { id: true, name: true, loginId: true, department: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: { leaves } });
  } catch (error) {
    console.error("[REPORT LEAVES GET ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
