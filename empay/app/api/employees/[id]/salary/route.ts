import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const salarySchema = z.object({
  monthWage: z.number().min(0),
  workingDaysPerWeek: z.number().int().min(1).max(7),
  breakTime: z.number().min(0),
  wageType: z.string().min(1),
});

function calculateSalary(monthWage: number) {
  const basicSalary = monthWage * 0.5;
  const hra = basicSalary * 0.5;
  const standardAllowance = monthWage * 0.1667;
  const performanceBonus = basicSalary * 0.0833;
  const lta = basicSalary * 0.0833;
  const employeePF = basicSalary * 0.12;
  const employerPF = basicSalary * 0.12;
  const professionalTax = 200;
  const fixedAllowance =
    monthWage -
    (basicSalary + hra + standardAllowance + performanceBonus + lta);

  return {
    yearlyWage: monthWage * 12,
    basicSalary,
    hra,
    standardAllowance,
    performanceBonus,
    lta,
    fixedAllowance,
    employeePF,
    employerPF,
    professionalTax,
  };
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

    if (!["ADMIN", "PAYROLL_OFFICER"].includes(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = salarySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const computed = calculateSalary(parsed.data.monthWage);
    const salaryInfo = await prisma.salaryInfo.upsert({
      where: { userId: params.id },
      create: {
        userId: params.id,
        ...parsed.data,
        ...computed,
      },
      update: {
        ...parsed.data,
        ...computed,
      },
    });

    return NextResponse.json({ data: { salaryInfo } });
  } catch (error) {
    console.error("[SALARY PATCH ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
