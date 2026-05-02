import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { generateLoginId, getNextSerialNumber } from "@/lib/generateLoginId";
import { Resend } from "resend";
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

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        loginId: true,
        role: true,
        department: true,
        profilePhoto: true,
        empCode: true,
        phone: true,
        dateOfJoining: true,
        createdAt: true,
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
    });

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
        phone: u.phone,
        dateOfJoining: u.dateOfJoining,
        createdAt: u.createdAt,
        todayStatus,
      };
    });

    return NextResponse.json({ data: { employees: withStatus } });
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

    // Send welcome email
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "EmPay <noreply@empay.app>",
          to: email,
          subject: "Welcome to EmPay – Your Login Credentials",
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2 style="color: #6366f1;">Welcome to EmPay, ${name}!</h2>
              <p>Your account has been created. Here are your login credentials:</p>
              <div style="background: #f4f4f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p><strong>Login ID:</strong> ${loginId}</p>
                <p><strong>Temporary Password:</strong> ${tempPassword}</p>
              </div>
              <p>Please log in and change your password immediately.</p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/sign-in" style="display: inline-block; padding: 10px 20px; background: #6366f1; color: white; border-radius: 6px; text-decoration: none;">Login to EmPay</a>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("[EMAIL ERROR]", emailError);
      }
    }

    return NextResponse.json({ data: { user } }, { status: 201 });
  } catch (error) {
    console.error("[EMPLOYEES POST ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
