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

    const payslips = await prisma.payslip.findMany({
      where: {
        employeeId: userId && userId !== "all" ? userId : undefined,
        payrun: {
          month: month ? Number(month) : undefined,
          year: year ? Number(year) : undefined,
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            loginId: true,
            department: true,
            email: true,
            empCode: true,
            location: true,
            dateOfJoining: true,
            privateInfo: {
              select: {
                panNo: true,
                uanNo: true,
                accountNumber: true,
                bankName: true,
                dateOfJoining: true,
              },
            },
          },
        },
        payrun: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: { payslips } });
  } catch (error) {
    console.error("[REPORT PAYSLIPS GET ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
