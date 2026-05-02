import { prisma } from "@/lib/prisma";

export function generateLoginId(
  firstName: string,
  lastName: string,
  joiningYear: number,
  serialNumber: number
): string {
  const first2First = firstName.slice(0, 2).toUpperCase();
  const first2Last = lastName.slice(0, 2).toUpperCase();
  const serial = String(serialNumber).padStart(4, "0");
  return `OI${first2First}${first2Last}${joiningYear}${serial}`;
}

export async function getNextSerialNumber(year: number): Promise<number> {
  const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
  const endOfYear = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  const count = await prisma.user.count({
    where: {
      dateOfJoining: {
        gte: startOfYear,
        lt: endOfYear,
      },
    },
  });

  return count + 1;
}
