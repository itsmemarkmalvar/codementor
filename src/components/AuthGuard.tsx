"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth-utils";
import { getCurrentUser } from "@/services/api";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      // Check if user has a token
      if (!isAuthenticated()) {
        router.push("/auth/login");
        return;
      }

      try {
        // Verify token by getting user data
        await getCurrentUser();
        setAuthenticated(true);
      } catch (error) {
        // Token is invalid, redirect to login
        console.error("Authentication error:", error);
        router.push("/auth/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    // Show loading state while checking authentication
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A1929]">
        <div className="w-12 h-12 border-4 border-[#2E5BFF] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Only render children if authenticated
  return authenticated ? <>{children}</> : null;
} 