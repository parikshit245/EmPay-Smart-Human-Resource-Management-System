"use client";

interface PayrunForPrint {
  month: number;
  year: number;
  createdAt?: string;
  paidAt?: string | null;
  approvedAt?: string | null;
}

interface PayslipForPrint {
  totalWorkingDays: number;
  attendanceDays: number;
  paidLeaveDays: number;
  basicSalary: number;
  hra: number;
  standardAllowance: number;
  performanceBonus: number;
  lta: number;
  fixedAllowance: number;
  employeePF: number;
  employerPF: number;
  professionalTax: number;
  tdsDeduction: number;
  grossPay: number;
  netPay: number;
  employee: {
    name: string;
    loginId: string;
    department: string | null;
    empCode?: string | null;
    location?: string | null;
    dateOfJoining?: string | null;
    privateInfo?: {
      panNo: string | null;
      uanNo: string | null;
      accountNumber: string | null;
      bankName?: string | null;
      dateOfJoining: string | null;
    } | null;
  };
}

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function amountInWords(value: number) {
  const rounded = Math.round(value || 0);
  if (rounded === 0) return "Zero rupees";
  if (rounded >= 10000000) return `${money(rounded)} only`;

  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const belowHundred = (n: number) => (n < 20 ? ones[n] : `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ""}`);
  const belowThousand = (n: number) => {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    return `${hundred ? `${ones[hundred]} Hundred` : ""}${hundred && rest ? " " : ""}${rest ? belowHundred(rest) : ""}`;
  };
  const parts = [
    [Math.floor(rounded / 100000), "Lakh"],
    [Math.floor((rounded % 100000) / 1000), "Thousand"],
    [rounded % 1000, ""],
  ]
    .filter(([num]) => Number(num) > 0)
    .map(([num, label]) => `${belowThousand(Number(num))}${label ? ` ${label}` : ""}`);

  return `${parts.join(" ")} rupees only`;
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="grid grid-cols-[120px_12px_1fr] gap-2">
      <span>{label}</span>
      <span>:</span>
      <span>{value || "-"}</span>
    </div>
  );
}

function AmountRow({ label, value, negative = false }: { label: string; value: number; negative?: boolean }) {
  return (
    <div className="grid grid-cols-[1fr_120px] items-center py-2">
      <span>{label}</span>
      <span className="text-right">{negative ? `- ${money(value)}` : money(value)}</span>
    </div>
  );
}

export function PayslipPrint({ payslip, payrun }: { payslip: PayslipForPrint; payrun: PayrunForPrint }) {
  const monthName = monthNames[payrun.month - 1] || "";
  const periodStart = new Date(payrun.year, payrun.month - 1, 1);
  const periodEnd = new Date(payrun.year, payrun.month, 0);
  const joinDate = payslip.employee.privateInfo?.dateOfJoining || payslip.employee.dateOfJoining;
  const totalDays = payslip.attendanceDays + payslip.paidLeaveDays;
  const totalDeductions = payslip.employeePF + payslip.employerPF + payslip.professionalTax + payslip.tdsDeduction;
  const payDate = payrun.paidAt || payrun.approvedAt || payrun.createdAt;

  return (
    <div className="payslip-print-root bg-white text-[#1a1c24]">
      <div className="payslip-print-page">
        <div className="mb-7 border-b border-primary/70 pb-5 text-sm text-[#374151]">[Company Logo]</div>

        <h1 className="mb-5 text-xl font-semibold text-[#017e84]">
          Salary slip for month of {monthName} {payrun.year}
        </h1>

        <section className="rounded-2xl border border-primary p-5 text-sm leading-8 text-primary">
          <div className="grid grid-cols-2 gap-10">
            <div>
              <InfoRow label="Employee name" value={payslip.employee.name} />
              <InfoRow label="Employee Code" value={payslip.employee.empCode || payslip.employee.loginId} />
              <InfoRow label="Department" value={payslip.employee.department} />
              <InfoRow label="Location" value={payslip.employee.location} />
              <InfoRow label="Date of Joining" value={formatDate(joinDate)} />
            </div>
            <div>
              <InfoRow label="PAN" value={payslip.employee.privateInfo?.panNo} />
              <InfoRow label="UAN" value={payslip.employee.privateInfo?.uanNo} />
              <InfoRow label="Bank A/c NO." value={payslip.employee.privateInfo?.accountNumber} />
              <InfoRow label="Pay period" value={`${formatDate(periodStart)} to ${formatDate(periodEnd)}`} />
              <InfoRow label="Pay date" value={formatDate(payDate)} />
            </div>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-primary text-sm">
          <div className="grid grid-cols-[1fr_180px] bg-primary px-5 py-3 text-base font-semibold text-white">
            <span>Worked Days</span>
            <span className="text-center">Number of Days</span>
          </div>
          <div className="grid grid-cols-[1fr_180px] px-5 py-2 text-primary">
            <span>Attendance</span>
            <span className="text-center">{payslip.attendanceDays.toFixed(2)} Days</span>
          </div>
          <div className="grid grid-cols-[1fr_180px] border-t border-primary/40 px-5 py-2 text-primary">
            <span>Total</span>
            <span className="text-center">{totalDays.toFixed(2)} Days</span>
          </div>
        </section>

        <section className="mt-4 overflow-hidden rounded-2xl border border-primary text-sm">
          <div className="grid grid-cols-[1fr_130px_1fr_130px] bg-primary px-5 py-3 text-base font-semibold text-white">
            <span>Earnings</span>
            <span>Amounts</span>
            <span>Deductions</span>
            <span>Amounts</span>
          </div>

          <div className="grid grid-cols-2 gap-12 px-5 py-4">
            <div>
              <AmountRow label="Basic Salary" value={payslip.basicSalary} />
              <AmountRow label="House Rent Allowance" value={payslip.hra} />
              <AmountRow label="Standard Allowance" value={payslip.standardAllowance} />
              <AmountRow label="Performance Bonus" value={payslip.performanceBonus} />
              <AmountRow label="Leave Travel Allowance" value={payslip.lta} />
              <AmountRow label="Fixed Allowance" value={payslip.fixedAllowance} />
              <AmountRow label="Gross" value={payslip.grossPay} />
            </div>
            <div>
              <AmountRow label="PF Employee" value={payslip.employeePF} negative />
              <AmountRow label="PF Employer" value={payslip.employerPF} negative />
              <AmountRow label="Professional Tax" value={payslip.professionalTax} negative />
              <AmountRow label="TDS Deduction" value={payslip.tdsDeduction} negative />
              <div className="mt-4 border-t border-primary/40 pt-2">
                <AmountRow label="Total Deductions" value={totalDeductions} negative />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_220px] overflow-hidden border-t border-primary/50">
            <div className="bg-primary px-5 py-4 text-2xl font-bold text-white">
              Total Net Payable <span className="text-sm font-semibold">(Gross Earning - Total deductions)</span>
            </div>
            <div className="bg-[#017e84] px-5 py-3 text-center text-white">
              <div className="text-xl font-bold">{money(payslip.netPay)}</div>
              <div className="mt-1 text-xs">{amountInWords(payslip.netPay)}</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export function PayslipPrintStyles() {
  return (
    <style jsx global>{`
      .payslip-print-root {
        display: none;
      }

      .payslip-print-page {
        width: 190mm;
        min-height: 270mm;
        padding: 10mm;
        border: 1px solid #0f172a;
        font-family: "Comic Sans MS", "Trebuchet MS", Arial, sans-serif;
      }

      @page {
        size: A4;
        margin: 10mm;
      }

      @media print {
        html,
        body {
          background: white !important;
        }

        body * {
          visibility: hidden !important;
        }

        .payslip-print-root,
        .payslip-print-root * {
          visibility: visible !important;
        }

        .payslip-print-root {
          display: block !important;
          position: absolute !important;
          inset: 0 auto auto 0 !important;
          width: 190mm !important;
          background: white !important;
        }

        .payslip-print-page {
          width: 190mm !important;
          min-height: 270mm !important;
          padding: 10mm !important;
          border: 1px solid #0f172a !important;
          break-after: page;
          color-adjust: exact !important;
          print-color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
        }
      }
    `}</style>
  );
}
