import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword } from "@/lib/auth";
import { signToken } from "@/lib/jwt";
import { z } from "zod";

const signInSchema = z.object({
  loginId: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = signInSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { loginId, password } = parsed.data;

    // Find user by loginId OR email
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ loginId }, { email: loginId }],
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = signToken({
      id: user.id,
      role: user.role,
      loginId: user.loginId,
      isFirstLogin: user.isFirstLogin,
    });

    const safeUser = {
      id: user.id,
      loginId: user.loginId,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      profilePhoto: user.profilePhoto,
      department: user.department,
      managerId: user.managerId,
      location: user.location,
      empCode: user.empCode,
      dateOfJoining: user.dateOfJoining,
      isFirstLogin: user.isFirstLogin,
      createdAt: user.createdAt,
    };

    const response = NextResponse.json({ data: { user: safeUser, token } });
    response.cookies.set("empay_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[SIGNIN ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
