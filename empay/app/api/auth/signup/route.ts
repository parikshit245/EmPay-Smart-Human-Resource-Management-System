import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { generateLoginId } from "@/lib/generateLoginId";
import { signToken } from "@/lib/jwt";
import { z } from "zod";

const signUpSchema = z.object({
  companyName: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = signUpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, phone, password } = parsed.data;

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const year = new Date().getFullYear();
    const nameParts = name.trim().split(" ");
    const firstName = nameParts[0] || "AD";
    const lastName = nameParts[1] || "MN";
    const loginId = generateLoginId(firstName, lastName, year, 1);

    // Check if loginId already taken
    const loginIdCheck = await prisma.user.findUnique({ where: { loginId } });
    const finalLoginId = loginIdCheck ? `${loginId}A` : loginId;

    const user = await prisma.user.create({
      data: {
        loginId: finalLoginId,
        email,
        name,
        phone: phone || null,
        role: "ADMIN",
        passwordHash,
        isFirstLogin: false,
      },
      select: {
        id: true,
        loginId: true,
        email: true,
        name: true,
        role: true,
        profilePhoto: true,
        department: true,
        phone: true,
        isFirstLogin: true,
        createdAt: true,
      },
    });

    const token = signToken({ id: user.id, role: user.role, loginId: user.loginId });

    const response = NextResponse.json({ data: { user, token } }, { status: 201 });
    response.cookies.set("empay_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[SIGNUP ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
