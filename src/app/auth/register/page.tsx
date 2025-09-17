"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { registerUser } from "@/services/api";
import { setToken } from "@/lib/auth-utils";
import JavaCodeRain from "@/components/visuals/JavaCodeRain";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agreedToTerms) {
      setError("You must agree to the Terms and Agreement to create an account.");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      // Call the register API endpoint
      const registerResponse = await registerUser({
        name,
        email,
        password,
        password_confirmation: confirmPassword
      });
      
      // Registration successful, let's automatically log the user in
      try {
        // Store the token from registration response
        setToken(registerResponse.token);
        
        // Show success message
        toast.success("Account created successfully! Welcome to CodeMentor.");
        
        // Navigate directly to dashboard
        router.push("/dashboard");
      } catch (loginError) {
        console.error("Auto-login error after registration:", loginError);
        // If auto-login fails, redirect to login page as fallback
        toast.info("Please log in with your new account");
        router.push("/auth/login?registered=true");
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      setError(error.message || "Registration failed. Please try again.");
      toast.error(error.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A1929] flex items-center justify-center p-4">
      {/* Background Effect */}
      <div className="absolute inset-0 overflow-hidden">
        <JavaCodeRain className="inset-0" opacity={0.14} fontSize={14} />
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
              Create an account
            </CardTitle>
            <CardDescription className="text-gray-400">
              Join CodeMentor and start your learning journey
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
                    <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Full Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-[#2E5BFF] focus:ring-[#2E5BFF]"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-[#2E5BFF] focus:ring-[#2E5BFF]"
                      required
                    />
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
                      className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-[#2E5BFF] focus:ring-[#2E5BFF]"
                      required
                    />
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
                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-[#2E5BFF] focus:ring-[#2E5BFF]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Terms and Agreement Checkbox */}
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="terms" 
                    checked={agreedToTerms} 
                    onCheckedChange={(checked) => setAgreedToTerms(checked === true)} 
                  />
                  <label 
                    htmlFor="terms"
                    className="text-sm font-medium leading-none text-gray-400 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I agree to the{" "}
                    <Dialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
                      <DialogTrigger asChild>
                        <button 
                          type="button" 
                          className="text-[#2E5BFF] hover:text-blue-400 hover:underline"
                          onClick={() => setShowTermsDialog(true)}
                        >
                          Terms and Agreement
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[90vh] overflow-auto">
                        <DialogHeader>
                          <DialogTitle>Terms and Agreement</DialogTitle>
                          <DialogDescription>
                            Please read our terms and agreement carefully.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="mt-4 text-sm text-gray-200 space-y-4">
                          <h3 className="text-lg font-semibold">1. Introduction</h3>
                          <p>
                            Welcome to CodeMentor! These Terms of Service ("Terms") govern your use of our platform, 
                            including our website, services, and tools for learning Java programming ("Services"). 
                            By accessing or using our Services, you agree to be bound by these Terms.
                          </p>
                          
                          <h3 className="text-lg font-semibold">2. Account Registration</h3>
                          <p>
                            To access certain features of our platform, you may need to register for an account. 
                            You agree to provide accurate, current, and complete information during the registration process 
                            and to update such information to keep it accurate, current, and complete.
                          </p>
                          
                          <h3 className="text-lg font-semibold">3. User Conduct</h3>
                          <p>
                            You agree not to:
                          </p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Use our Services for any illegal purpose or in violation of any laws</li>
                            <li>Share your account credentials with others</li>
                            <li>Copy or distribute content from our platform without permission</li>
                            <li>Upload or transmit viruses, malware, or other malicious code</li>
                            <li>Harass, intimidate, or threaten other users</li>
                          </ul>
                          
                          <Link 
                            href="/terms" 
                            className="text-[#2E5BFF] hover:text-blue-400 inline-block mt-4"
                            target="_blank"
                          >
                            View Full Terms
                          </Link>
                          
                          <div className="pt-4 flex justify-end">
                            <Button 
                              onClick={() => {
                                setAgreedToTerms(true);
                                setShowTermsDialog(false);
                              }}
                              className="bg-[#2E5BFF] hover:bg-blue-600"
                            >
                              I Agree
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </label>
                </div>
                
                <motion.div
                  whileHover={{ scale: agreedToTerms ? 1.01 : 1 }}
                  whileTap={{ scale: agreedToTerms ? 0.99 : 1 }}
                >
                  <Button
                    type="submit"
                    className={`w-full ${agreedToTerms ? 'bg-[#2E5BFF] hover:bg-blue-600' : 'bg-[#2E5BFF]/50 cursor-not-allowed'} text-white`}
                    disabled={isLoading || !agreedToTerms}
                  >
                    {isLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : (
                      "Sign Up"
                    )}
                  </Button>
                </motion.div>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-gray-400 text-center">
              Already have an account?{" "}
              <Link 
                href="/auth/login" 
                className="text-[#2E5BFF] hover:text-blue-400 font-semibold"
              >
                Sign in
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