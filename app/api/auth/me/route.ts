import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ data: { user } });
  } catch (error) {
    console.error("[ME ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
