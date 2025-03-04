"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Book,
  GraduationCap,
  Home,
  LineChart,
  LogOut,
  Menu,
  Settings,
  X,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: Home },
  { href: "/dashboard/courses", label: "Courses", icon: Book },
  { href: "/dashboard/practice", label: "Practice", icon: GraduationCap },
  { href: "/dashboard/progress", label: "Progress", icon: LineChart },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleLogout = async () => {
    // Simulate logout process
    await new Promise(resolve => setTimeout(resolve, 500));
    router.push("/auth/login");
  };

  return (
    <div className="min-h-screen bg-[#0A1929] text-white">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: isSidebarOpen ? 0 : -300 }}
        transition={{ type: "spring", damping: 20 }}
        className="fixed top-0 left-0 h-screen w-64 bg-white/5 backdrop-blur-sm border-r border-white/10 z-50"
      >
        <div className="p-6">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="text-2xl font-bold">
              CodeMentor
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
          <nav className="mt-8 space-y-2">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}>
                <motion.div
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    pathname === href
                      ? "bg-[#2E5BFF] text-white"
                      : "hover:bg-white/5 text-gray-400 hover:text-white"
                  }`}
                  whileHover={{ x: 5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon className="h-5 w-5" />
                  <span>{label}</span>
                </motion.div>
              </Link>
            ))}
          </nav>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-white/10">
          <div className="space-y-2">
            <Link href="/dashboard/settings">
              <motion.div
                className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                whileHover={{ x: 5 }}
                whileTap={{ scale: 0.95 }}
              >
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </motion.div>
            </Link>
            <div
              onClick={handleLogout}
              className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white/5 backdrop-blur-sm border-b border-white/10 z-40">
        <div className="flex items-center justify-between h-full px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(true)}
            className="text-white"
          >
            <Menu className="h-6 w-6" />
          </Button>
          <Link href="/dashboard" className="text-xl font-bold">
            CodeMentor
          </Link>
          <div className="w-10" /> {/* Spacer for alignment */}
        </div>
      </div>

      {/* Main Content */}
      <main
        className={`transition-all duration-300 ${
          isSidebarOpen ? "md:ml-64" : "md:ml-0"
        } pt-16 md:pt-0`}
      >
        <div className="container mx-auto p-6">{children}</div>
      </main>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
} 