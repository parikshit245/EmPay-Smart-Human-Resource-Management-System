import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth";

export const dynamic = "force-dynamic";

const updateTimeOffSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

function dayBounds(startDate: Date, endDate: Date) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = getTokenPayload(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["ADMIN", "HR_OFFICER"].includes(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateTimeOffSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await prisma.timeOffRequest.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Time-off request not found" }, { status: 404 });
    }

    if (existing.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending requests can be updated" },
        { status: 409 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.timeOffRequest.update({
        where: { id: params.id },
        data: { status: parsed.data.status },
        include: {
          user: { select: { id: true, name: true, loginId: true, department: true } },
        },
      });

      if (parsed.data.status === "APPROVED") {
        const { start, end } = dayBounds(existing.startDate, existing.endDate);
        await tx.attendance.updateMany({
          where: {
            userId: existing.userId,
            date: { gte: start, lte: end },
          },
          data: { status: "ON_LEAVE" },
        });
      }

      return result;
    });

    return NextResponse.json({ data: { request: updated } });
  } catch (error) {
    console.error("[TIME_OFF PATCH ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
