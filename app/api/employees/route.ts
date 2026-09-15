import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { generateLoginId, getNextSerialNumber } from "@/lib/generateLoginId";
import { z } from "zod";

export const dynamic = "force-dynamic";

function generateRandomPassword(length = 8): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join("");
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const compact = searchParams.get("compact") === "1";

    if (compact && search) {
      const employees = await prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { loginId: { contains: search, mode: "insensitive" } },
            { department: { contains: search, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          loginId: true,
          department: true,
        },
        orderBy: { name: "asc" },
        take: 8,
      });

      return NextResponse.json({ data: { employees } });
    }

    // Run main query and warning counts in parallel
    const isAdmin = currentUser.role === "ADMIN";
    const [users, ...warningResults] = await Promise.all([
      prisma.user.findMany({
        where: search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { loginId: { contains: search, mode: "insensitive" } },
                { department: { contains: search, mode: "insensitive" } },
              ],
            }
          : undefined,
        select: {
          id: true,
          name: true,
          email: true,
          loginId: true,
          role: true,
          department: true,
          profilePhoto: true,
          empCode: true,
          managerId: true,
          phone: true,
          dateOfJoining: true,
          createdAt: true,
          privateInfo: { select: { accountNumber: true } },
          attendance: {
            where: {
              date: { gte: startOfDay, lt: endOfDay },
            },
            select: { status: true, checkIn: true, checkOut: true },
          },
          timeOffRequests: {
            where: {
              status: "APPROVED",
              startDate: { lte: endOfDay },
              endDate: { gte: startOfDay },
            },
            select: { id: true },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      // Warning counts run in parallel with main query (only for ADMIN)
      ...(isAdmin
        ? [
            prisma.user.count({
              where: {
                OR: [
                  { privateInfo: null },
                  { privateInfo: { accountNumber: null } },
                  { privateInfo: { accountNumber: "" } },
                ],
              },
            }),
            prisma.user.count({ where: { managerId: null } }),
          ]
        : []),
    ]);

    const withStatus = users.map((u) => {
      let todayStatus: "PRESENT" | "ABSENT" | "ON_LEAVE" = "ABSENT";
      if (u.timeOffRequests.length > 0) {
        todayStatus = "ON_LEAVE";
      } else if (u.attendance.length > 0 && u.attendance[0].checkIn) {
        todayStatus = "PRESENT";
      }
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        loginId: u.loginId,
        role: u.role,
        department: u.department,
        profilePhoto: u.profilePhoto,
        empCode: u.empCode,
        managerId: u.managerId,
        hasBankAccount: Boolean(u.privateInfo?.accountNumber),
        phone: u.phone,
        dateOfJoining: u.dateOfJoining,
        createdAt: u.createdAt,
        todayStatus,
      };
    });

    const warningCounts = isAdmin
      ? {
          withoutBankAccount: warningResults[0] as number,
          withoutManager: warningResults[1] as number,
        }
      : null;

    return NextResponse.json({ data: { employees: withStatus, warningCounts } });
  } catch (error) {
    console.error("[EMPLOYEES GET ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const createEmployeeSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  department: z.string().optional(),
  role: z.enum(["EMPLOYEE", "HR_OFFICER", "PAYROLL_OFFICER", "ADMIN"]),
  managerId: z.string().optional(),
  dateOfJoining: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["ADMIN", "HR_OFFICER"].includes(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createEmployeeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, phone, department, role, managerId, dateOfJoining } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    const year = dateOfJoining
      ? new Date(dateOfJoining).getFullYear()
      : new Date().getFullYear();
    const nameParts = name.trim().split(" ");
    const firstName = nameParts[0] || "EM";
    const lastName = nameParts[1] || "PY";
    const serial = await getNextSerialNumber(year);
    const loginId = generateLoginId(firstName, lastName, year, serial);

    const tempPassword = generateRandomPassword();
    const passwordHash = await hashPassword(tempPassword);

    const user = await prisma.user.create({
      data: {
        loginId,
        email,
        name,
        phone: phone || null,
        department: department || null,
        role,
        managerId: managerId || null,
        dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : null,
        passwordHash,
        isFirstLogin: true,
        resume: { create: { skills: [], certifications: [] } },
        privateInfo: { create: {} },
        salaryInfo: { create: {} },
      },
      select: {
        id: true,
        loginId: true,
        email: true,
        name: true,
        role: true,
        department: true,
        phone: true,
        dateOfJoining: true,
        isFirstLogin: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        data: {
          user,
          credentials: {
            loginId,
            temporaryPassword: tempPassword,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[EMPLOYEES POST ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
