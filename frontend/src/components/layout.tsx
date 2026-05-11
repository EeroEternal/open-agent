"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");

    if (!token) {
      router.push("/login");
      return;
    }

    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  }

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen">
      <nav className="border-b border-gray-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-bold">
            Open Agent
          </Link>

          <div className="flex items-center gap-6">
            <Link href="/agent-templates" className="hover:text-blue-400">
              Templates
            </Link>
            <Link href="/agent-runs" className="hover:text-blue-400">
              My Runs
            </Link>
            <Link href="/secrets" className="hover:text-blue-400">
              Secrets
            </Link>
            <div className="flex items-center gap-3">
              <span className="text-gray-400">{user.name || user.email}</span>
              <button
                onClick={handleLogout}
                className="text-red-400 hover:text-red-300"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8">{children}</main>
    </div>
  );
}
