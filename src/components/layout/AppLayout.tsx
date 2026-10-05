"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login";

  if (isAuthPage) {
    return <main className="h-screen w-full overflow-y-auto bg-slate-900">{children}</main>;
  }

  return (
    <div className="h-screen w-full overflow-hidden bg-slate-50 flex flex-col text-slate-900">
      <Navbar />
      <div className="flex flex-1 h-[calc(100vh-4rem)] overflow-hidden">
        <Sidebar />
        <main className="flex-1 min-w-0 h-full overflow-y-auto p-4 sm:p-6 lg:p-8 w-full max-w-[1680px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
