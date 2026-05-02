import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EmPay — Smart HR Management",
  description:
    "EmPay is a modern HRMS platform for managing employees, attendance, payroll, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${jakarta.variable} antialiased bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
