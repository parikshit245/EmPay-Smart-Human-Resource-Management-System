import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { comparePassword, getCurrentUser, hashPassword } from "@/lib/auth";
import { signToken } from "@/lib/jwt";

export const dynamic = "force-dynamic";

const changePasswordSchema = z
  .object({
    oldPassword: z.string().optional(),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => !data.confirmPassword || data.confirmPassword === data.newPassword,
    { path: ["confirmPassword"], message: "Passwords do not match" }
  );

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: currentUser.id } });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.isFirstLogin) {
      if (!parsed.data.oldPassword) {
        return NextResponse.json(
          { error: "Old password is required" },
          { status: 400 }
        );
      }

      const isValid = await comparePassword(parsed.data.oldPassword, user.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { error: "Old password is incorrect" },
          { status: 400 }
        );
      }
    }

    const passwordHash = await hashPassword(parsed.data.newPassword);
    const updated = await prisma.user.update({
      where: { id: currentUser.id },
      data: { passwordHash, isFirstLogin: false },
    });

    const token = signToken({
      id: updated.id,
      role: updated.role,
      loginId: updated.loginId,
      isFirstLogin: false,
    });
    const response = NextResponse.json({ data: { success: true } });
    response.cookies.set("empay_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[CHANGE PASSWORD ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
