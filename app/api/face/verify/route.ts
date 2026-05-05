import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Euclidean distance between two 128-d face descriptors
function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}

const MATCH_THRESHOLD = 0.55; // face-api.js recommends 0.5–0.6

export async function POST(request: NextRequest) {
  try {
    const currentUser = getTokenPayload(request);
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

    // Fetch stored face descriptor for the current user
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { faceDescriptor: true },
    });

    if (!user?.faceDescriptor) {
      return NextResponse.json(
        { error: "No face enrolled for this account. Please enroll your face first.", code: "NO_FACE_ENROLLED" },
        { status: 404 }
      );
    }

    const storedDescriptor = user.faceDescriptor as number[];
    const distance = euclideanDistance(descriptor, storedDescriptor);
    const isMatch = distance < MATCH_THRESHOLD;

    return NextResponse.json({
      verified: isMatch,
      distance: Math.round(distance * 1000) / 1000,
      threshold: MATCH_THRESHOLD,
    });
  } catch (error) {
    console.error("[FACE VERIFY ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
