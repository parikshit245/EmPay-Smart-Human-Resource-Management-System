import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["ADMIN", "PAYROLL_OFFICER"].includes(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const payrun = await prisma.payrun.findUnique({
      where: { id: params.id },
      include: {
        payslips: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                loginId: true,
                department: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!payrun) {
      return NextResponse.json({ error: "Payrun not found" }, { status: 404 });
    }

    return NextResponse.json({ data: { payrun } });
  } catch (error) {
    console.error("[PAYRUN GET ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
