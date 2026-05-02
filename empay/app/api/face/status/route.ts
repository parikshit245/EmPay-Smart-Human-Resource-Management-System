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

    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { faceDescriptor: true },
    });

    return NextResponse.json({
      enrolled: user?.faceDescriptor !== null && user?.faceDescriptor !== undefined,
    });
  } catch (error) {
    console.error("[FACE STATUS ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
