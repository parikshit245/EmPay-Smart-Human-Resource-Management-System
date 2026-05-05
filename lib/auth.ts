import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { verifyToken, JwtPayload } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

export function getTokenFromCookies(request: NextRequest): string | null {
  const cookie = request.cookies.get("empay_token");
  return cookie?.value || null;
}

/**
 * Fast auth check — returns JWT-only data without a DB round-trip.
 * Use this when you only need id/role/loginId (most API routes).
 */
export function getTokenPayload(request: NextRequest): JwtPayload | null {
  const token = getTokenFromCookies(request);
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Full user fetch — hits the database.
 * Use only when you need fresh DB fields (profilePhoto, department, etc.).
 */
export async function getCurrentUser(
  request: NextRequest
): Promise<{
  id: string;
  name: string;
  email: string;
  loginId: string;
  role: string;
  profilePhoto: string | null;
  department: string | null;
  phone: string | null;
  isFirstLogin: boolean;
  createdAt: Date;
} | null> {
  const payload = getTokenPayload(request);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: {
      id: true,
      name: true,
      email: true,
      loginId: true,
      role: true,
      profilePhoto: true,
      department: true,
      phone: true,
      isFirstLogin: true,
      createdAt: true,
    },
  });

  return user;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function comparePassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
