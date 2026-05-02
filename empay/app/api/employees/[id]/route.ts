import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const updateEmployeeSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  managerId: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  profilePhoto: z.string().nullable().optional(),
  empCode: z.string().nullable().optional(),
  dateOfJoining: z.string().nullable().optional(),
  resume: z
    .object({
      about: z.string().nullable().optional(),
      loveAboutJob: z.string().nullable().optional(),
      interests: z.string().nullable().optional(),
      skills: z.array(z.string()).optional(),
      certifications: z.array(z.string()).optional(),
    })
    .optional(),
  privateInfo: z
    .object({
      dob: z.string().nullable().optional(),
      address: z.string().nullable().optional(),
      nationality: z.string().nullable().optional(),
      personalEmail: z.string().nullable().optional(),
      gender: z.string().nullable().optional(),
      maritalStatus: z.string().nullable().optional(),
      accountNumber: z.string().nullable().optional(),
      bankName: z.string().nullable().optional(),
      ifscCode: z.string().nullable().optional(),
      panNo: z.string().nullable().optional(),
      uanNo: z.string().nullable().optional(),
      dateOfJoining: z.string().nullable().optional(),
    })
    .optional(),
});

function canViewSensitiveProfile(
  targetId: string,
  currentUser: { id: string; role: string }
) {
  return (
    targetId === currentUser.id ||
    ["ADMIN", "HR_OFFICER", "PAYROLL_OFFICER"].includes(currentUser.role)
  );
}

function canEditProfile(targetId: string, currentUser: { id: string; role: string }) {
  return (
    targetId === currentUser.id ||
    currentUser.role === "ADMIN" ||
    currentUser.role === "HR_OFFICER"
  );
}

function canAssignManager(currentUser: { role: string }) {
  return currentUser.role === "ADMIN" || currentUser.role === "HR_OFFICER";
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canViewSensitive = canViewSensitiveProfile(params.id, currentUser);

    const employee = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        loginId: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        profilePhoto: true,
        department: true,
        managerId: true,
        manager: { select: { id: true, name: true } },
        location: true,
        empCode: true,
        dateOfJoining: true,
        isFirstLogin: true,
        createdAt: true,
        resume: true,
        privateInfo: canViewSensitive,
        salaryInfo: currentUser.role === "ADMIN" || currentUser.role === "PAYROLL_OFFICER",
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json({ data: { employee } });
  } catch (error) {
    console.error("[EMPLOYEE GET ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canEditProfile(params.id, currentUser)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateEmployeeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { resume, privateInfo, dateOfJoining, managerId, ...userData } = parsed.data;

    if (managerId !== undefined && !canAssignManager(currentUser)) {
      return NextResponse.json(
        { error: "Only Admin or HR Officer can assign reporting managers" },
        { status: 403 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: {
        ...userData,
        managerId: managerId !== undefined ? managerId : undefined,
        dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : dateOfJoining,
        resume: resume
          ? {
              upsert: {
                create: {
                  about: resume.about ?? null,
                  loveAboutJob: resume.loveAboutJob ?? null,
                  interests: resume.interests ?? null,
                  skills: resume.skills ?? [],
                  certifications: resume.certifications ?? [],
                },
                update: resume,
              },
            }
          : undefined,
        privateInfo: privateInfo
          ? {
              upsert: {
                create: {
                  ...privateInfo,
                  dob: privateInfo.dob ? new Date(privateInfo.dob) : null,
                  dateOfJoining: privateInfo.dateOfJoining
                    ? new Date(privateInfo.dateOfJoining)
                    : null,
                },
                update: {
                  ...privateInfo,
                  dob: privateInfo.dob ? new Date(privateInfo.dob) : privateInfo.dob,
                  dateOfJoining: privateInfo.dateOfJoining
                    ? new Date(privateInfo.dateOfJoining)
                    : privateInfo.dateOfJoining,
                },
              },
            }
          : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        loginId: true,
        role: true,
        phone: true,
        profilePhoto: true,
        department: true,
        managerId: true,
        manager: { select: { id: true, name: true } },
        location: true,
        empCode: true,
        dateOfJoining: true,
        resume: true,
        privateInfo: true,
      },
    });

    return NextResponse.json({ data: { employee: updated } });
  } catch (error) {
    console.error("[EMPLOYEE PATCH ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
