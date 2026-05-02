import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { descriptor } = body as { descriptor: number[] };

    if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
      return NextResponse.json(
        { error: "Invalid face descriptor. Must be a 128-element array." },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: currentUser.id },
      data: { faceDescriptor: descriptor },
    });

    return NextResponse.json({ success: true, message: "Face enrolled successfully." });
  } catch (error) {
    console.error("[FACE ENROLL ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: currentUser.id },
      data: { faceDescriptor: Prisma.JsonNull },
    });

    return NextResponse.json({ success: true, message: "Face data removed." });
  } catch (error) {
    console.error("[FACE DELETE ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
