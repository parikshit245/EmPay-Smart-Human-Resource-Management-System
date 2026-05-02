import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const createPayrunSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

function canUsePayroll(role: string) {
  return role === "ADMIN" || role === "PAYROLL_OFFICER";
}

function toPayslipData(user: {
  id: string;
  salaryInfo: {
    basicSalary: number;
    hra: number;
    standardAllowance: number;
    performanceBonus: number;
    lta: number;
    fixedAllowance: number;
    employeePF: number;
    employerPF: number;
    professionalTax: number;
  } | null;
}) {
  if (!user.salaryInfo) return null;

  const grossPay =
    user.salaryInfo.basicSalary +
    user.salaryInfo.hra +
    user.salaryInfo.standardAllowance +
    user.salaryInfo.performanceBonus +
    user.salaryInfo.lta +
    user.salaryInfo.fixedAllowance;
  const netPay = grossPay - user.salaryInfo.employeePF - user.salaryInfo.professionalTax;

  return {
    userId: user.id,
    basicSalary: user.salaryInfo.basicSalary,
    hra: user.salaryInfo.hra,
    standardAllowance: user.salaryInfo.standardAllowance,
    performanceBonus: user.salaryInfo.performanceBonus,
    lta: user.salaryInfo.lta,
    fixedAllowance: user.salaryInfo.fixedAllowance,
    employeePF: user.salaryInfo.employeePF,
    employerPF: user.salaryInfo.employerPF,
    professionalTax: user.salaryInfo.professionalTax,
    grossPay,
    netPay,
  };
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canUsePayroll(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [payruns, users] = await Promise.all([
      prisma.payrun.findMany({
        include: { _count: { select: { payslips: true } } },
        orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
      }),
      prisma.user.findMany({
        where: { salaryInfo: { isNot: null } },
        select: {
          id: true,
          name: true,
          loginId: true,
          department: true,
          salaryInfo: true,
        },
        orderBy: { name: "asc" },
      }),
    ]);

    const previewEmployees = users
      .map((user) => {
        const payslip = toPayslipData(user);
        if (!payslip) return null;
        return {
          id: user.id,
          name: user.name,
          loginId: user.loginId,
          department: user.department,
          basicSalary: payslip.basicSalary,
          deductions: payslip.employeePF + payslip.professionalTax,
          netPay: payslip.netPay,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ data: { payruns, previewEmployees } });
  } catch (error) {
    console.error("[PAYRUNS GET ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canUsePayroll(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createPayrunSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const users = await prisma.user.findMany({
      where: { salaryInfo: { isNot: null } },
      select: { id: true, salaryInfo: true },
    });

    const payslips = users
      .map((user) => toPayslipData(user))
      .filter((payslip): payslip is NonNullable<typeof payslip> => Boolean(payslip));

    if (payslips.length === 0) {
      return NextResponse.json(
        { error: "No employees with salary info found" },
        { status: 400 }
      );
    }

    const payrun = await prisma.payrun.create({
      data: {
        month: parsed.data.month,
        year: parsed.data.year,
        payslips: {
          create: payslips,
        },
      },
      include: {
        _count: { select: { payslips: true } },
      },
    });

    return NextResponse.json({ data: { payrun } }, { status: 201 });
  } catch (error) {
    console.error("[PAYRUNS POST ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
