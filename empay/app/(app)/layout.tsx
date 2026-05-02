import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import { UserProvider, CurrentUser } from "@/lib/UserContext";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";

async function getServerUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("empay_token")?.value;
  if (!token) return null;

  const payload = verifyToken(token);
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
    },
  });

  return user;
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <UserProvider initialUser={user}>
      <div className="min-h-screen bg-slate-950">
        <Sidebar />
        <div className="pl-64">
          <TopBar />
          <main className="pt-16 min-h-screen">
            <div className="p-6">{children}</div>
          </main>
        </div>
      </div>
    </UserProvider>
  );
}
