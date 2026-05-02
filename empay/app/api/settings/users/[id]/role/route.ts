import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const roleSchema = z.object({
  role: z.enum(["ADMIN", "EMPLOYEE", "HR_OFFICER", "PAYROLL_OFFICER"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = roleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: { role: parsed.data.role },
      select: { id: true, name: true, loginId: true, role: true, email: true },
    });

    return NextResponse.json({ data: { user } });
  } catch (error) {
    console.error("[SETTINGS ROLE PATCH ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
