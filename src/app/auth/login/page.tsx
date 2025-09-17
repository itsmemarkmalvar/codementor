"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { loginUser } from "@/services/api";
import { toast } from "sonner";
import { setToken } from "@/lib/auth-utils";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setEmailError("");
    setPasswordError("");
    
    try {
      // Clear any existing user data before login
      const clearExistingUserData = () => {
        // Clear all possible user-specific keys
        const keysToRemove = [];
        
        // Clear legacy keys
        keysToRemove.push('preserved_session', 'session_metadata', 'conversation_history');
        
        // Clear user-specific keys for common user IDs
        for (let i = 1; i <= 10; i++) {
          keysToRemove.push(
            `preserved_session_${i}`,
            `session_metadata_${i}`,
            `conversation_history_${i}`
          );
        }
        
        // Clear anonymous keys
        keysToRemove.push(
          'preserved_session_anonymous',
          'session_metadata_anonymous',
          'conversation_history_anonymous'
        );
        
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
        });
        
        console.log('Cleared existing user data before login');
      };
      
      clearExistingUserData();
      
      // Call the login API endpoint
      const response = await loginUser({ email, password });
      
      // Store the token using our auth utility
      setToken(response.token);
      
      // Show success message
      toast.success("Logged in successfully");
      
      // Navigate to dashboard
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Login error:", error);
      // Extract a friendly message from backend/axios response
      const status = error?.response?.status;
      const backendMsg = error?.response?.data?.message;
      const validationErrors = error?.response?.data?.errors;

      if (status === 401) {
        const msg = "Invalid email or password.";
        setError(msg);
        setEmailError(" ");
        setPasswordError(" ");
        toast.error(msg);
      } else if (status === 422 && validationErrors) {
        const emailMsg = Array.isArray(validationErrors.email) ? validationErrors.email[0] : undefined;
        const pwdMsg = Array.isArray(validationErrors.password) ? validationErrors.password[0] : undefined;
        if (emailMsg) setEmailError(emailMsg);
        if (pwdMsg) setPasswordError(pwdMsg);
        const msg = emailMsg || pwdMsg || "Validation error. Please check the form.";
        setError(msg);
        toast.error(msg);
      } else {
        const msg = backendMsg || error.message || "Login failed. Please try again.";
        setError(msg);
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A1929] flex items-center justify-center p-4">
      {/* Background Effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ 
              opacity: [0.1, 0.3, 0.1],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{ 
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="w-full h-full bg-[#2E5BFF] rounded-full blur-[100px] opacity-20"
          />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative"
      >
        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold tracking-tight text-white">
              Welcome back
            </CardTitle>
            <CardDescription className="text-gray-400">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-2 bg-red-500/10 border border-red-500/30 rounded text-red-500 text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`pl-10 bg-white/5 text-white placeholder:text-gray-400 focus:border-[#2E5BFF] focus:ring-[#2E5BFF] ${emailError ? 'border-red-500/60' : 'border-white/10'}`}
                      required
                    />
                    {emailError && (
                      <div className="mt-1 text-xs text-red-400">{emailError}</div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`pl-10 pr-10 bg-white/5 text-white placeholder:text-gray-400 focus:border-[#2E5BFF] focus:ring-[#2E5BFF] ${passwordError ? 'border-red-500/60' : 'border-white/10'}`}
                      required
                    />
                    {passwordError && (
                      <div className="mt-1 text-xs text-red-400">{passwordError}</div>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <Button
                    type="submit"
                    className="w-full bg-[#2E5BFF] hover:bg-blue-600 text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </motion.div>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-gray-400 text-center">
              Don't have an account?{" "}
              <Link 
                href="/auth/register" 
                className="text-[#2E5BFF] hover:text-blue-400 font-semibold"
              >
                Sign up
              </Link>
            </div>
            <Link 
              href="/" 
              className="text-sm text-gray-400 hover:text-white transition-colors text-center"
            >
              Back to home
            </Link>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
} 