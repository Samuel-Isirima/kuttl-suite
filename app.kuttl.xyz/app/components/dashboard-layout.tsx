import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "./sidebar";
import { DashboardHeader } from "./dashboard-header";
import { AuthWrapper } from "./auth-wrapper";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [sidebarOpen]);

  const handleMenuClick = () => {
    console.log("Menu clicked, current state:", sidebarOpen);
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <AuthWrapper>
      <div className="h-screen flex overflow-hidden bg-gray-50">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 overflow-auto">
          <div className="flex-1 space-y-4 p-4 md:p-6 lg:p-8 pt-4 md:pt-6">
            <DashboardHeader onMenuClick={handleMenuClick} />
            {children}
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}