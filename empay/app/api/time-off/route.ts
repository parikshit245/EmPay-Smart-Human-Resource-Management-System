import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const createTimeOffSchema = z
  .object({
    leaveType: z.enum(["Sick Leave", "Casual Leave", "Earned Leave", "Other"]),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    reason: z.string().optional(),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canViewAll = ["ADMIN", "HR_OFFICER", "PAYROLL_OFFICER"].includes(
      currentUser.role
    );

    const requests = await prisma.timeOffRequest.findMany({
      where: canViewAll ? undefined : { userId: currentUser.id },
      include: {
        user: { select: { id: true, name: true, loginId: true, department: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const myRequests = canViewAll
      ? requests.filter((request) => request.userId === currentUser.id)
      : requests;

    return NextResponse.json({ data: { requests, myRequests } });
  } catch (error) {
    console.error("[TIME_OFF GET ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["EMPLOYEE", "ADMIN", "HR_OFFICER"].includes(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createTimeOffSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const requestRecord = await prisma.timeOffRequest.create({
      data: {
        userId: currentUser.id,
        leaveType: parsed.data.leaveType,
        startDate: new Date(parsed.data.startDate),
        endDate: new Date(parsed.data.endDate),
        reason: parsed.data.reason || null,
      },
      include: {
        user: { select: { id: true, name: true, loginId: true, department: true } },
      },
    });

    return NextResponse.json({ data: { request: requestRecord } }, { status: 201 });
  } catch (error) {
    console.error("[TIME_OFF POST ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
