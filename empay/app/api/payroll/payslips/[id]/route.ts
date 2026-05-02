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

    const payslip = await prisma.payslip.findUnique({
      where: { id: params.id },
      include: {
        payrun: true,
        employee: {
          select: {
            id: true,
            name: true,
            loginId: true,
            email: true,
            department: true,
            empCode: true,
          },
        },
      },
    });

    if (!payslip) {
      return NextResponse.json({ error: "Payslip not found" }, { status: 404 });
    }

    if (
      !["ADMIN", "PAYROLL_OFFICER"].includes(currentUser.role) &&
      payslip.employeeId !== currentUser.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ data: { payslip } });
  } catch (error) {
    console.error("[PAYSLIP GET ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
