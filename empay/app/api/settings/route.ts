import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const settingsSchema = z.object({
  companyName: z.string().min(1).optional(),
  companyLogo: z.string().nullable().optional(),
});

async function requireAdmin(request: NextRequest) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) return { error: "Unauthorized", status: 401 as const };
  if (currentUser.role !== "ADMIN") return { error: "Forbidden", status: 403 as const };
  return { currentUser };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const [settings, users] = await Promise.all([
      prisma.settings.upsert({
        where: { id: "singleton" },
        update: {},
        create: { id: "singleton" },
      }),
      prisma.user.findMany({
        select: { id: true, name: true, loginId: true, role: true, email: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({ data: { settings, users } });
  } catch (error) {
    console.error("[SETTINGS GET ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const settings = await prisma.settings.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        companyName: parsed.data.companyName || "EmPay",
        companyLogo: parsed.data.companyLogo || null,
      },
      update: parsed.data,
    });

    return NextResponse.json({ data: { settings } });
  } catch (error) {
    console.error("[SETTINGS PATCH ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
