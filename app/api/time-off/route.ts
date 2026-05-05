import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth";
import { countCalendarDaysBetween, normalizeLeaveType } from "@/lib/leave-utils";

export const dynamic = "force-dynamic";

const createTimeOffSchema = z
  .object({
    leaveType: z.enum(["PAID", "SICK", "UNPAID", "OTHER"]),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    reason: z.string().optional(),
    medicalCertificateName: z.string().optional(),
    medicalCertificateType: z.string().optional(),
    medicalCertificateData: z.string().max(3_000_000, "File must be under 2 MB").optional(),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: "End date must be on or after start date",
    path: ["endDate"],
  })
  .refine((data) => data.leaveType !== "SICK" || Boolean(data.medicalCertificateData), {
    message: "Medical certificate is required for sick leave",
    path: ["medicalCertificateData"],
  });

const LEAVE_ALLOCATIONS = {
  paid: 12,
  sick: 6,
};

export async function GET(request: NextRequest) {
  try {
    const currentUser = getTokenPayload(request);
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

    const approvedMine = await prisma.timeOffRequest.findMany({
      where: {
        userId: currentUser.id,
        status: "APPROVED",
      },
      select: { leaveType: true, startDate: true, endDate: true },
    });

    const usedPaid = approvedMine
      .filter((request) => normalizeLeaveType(request.leaveType) === "PAID")
      .reduce((sum, request) => sum + countCalendarDaysBetween(request.startDate, request.endDate), 0);
    const usedSick = approvedMine
      .filter((request) => normalizeLeaveType(request.leaveType) === "SICK")
      .reduce((sum, request) => sum + countCalendarDaysBetween(request.startDate, request.endDate), 0);

    const leaveBalances = {
      paid: {
        allocated: LEAVE_ALLOCATIONS.paid,
        approved: usedPaid,
        remaining: Math.max(0, LEAVE_ALLOCATIONS.paid - usedPaid),
      },
      sick: {
        allocated: LEAVE_ALLOCATIONS.sick,
        approved: usedSick,
        remaining: Math.max(0, LEAVE_ALLOCATIONS.sick - usedSick),
      },
    };

    return NextResponse.json({ data: { requests, myRequests, leaveBalances } });
  } catch (error) {
    console.error("[TIME_OFF GET ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = getTokenPayload(request);
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
        medicalCertificateName: parsed.data.medicalCertificateName || null,
        medicalCertificateType: parsed.data.medicalCertificateType || null,
        medicalCertificateData: parsed.data.medicalCertificateData || null,
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
