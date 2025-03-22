"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0A1929] text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link 
            href="/" 
            className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-8"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
          
          <h1 className="text-3xl font-bold mb-8">Terms and Agreement</h1>
          
          <div className="prose prose-invert prose-blue max-w-none">
            <h2>1. Introduction</h2>
            <p>
              Welcome to CodeMentor! These Terms of Service ("Terms") govern your use of our platform, 
              including our website, services, and tools for learning Java programming ("Services"). 
              By accessing or using our Services, you agree to be bound by these Terms.
            </p>
            
            <h2>2. Account Registration</h2>
            <p>
              To access certain features of our platform, you may need to register for an account. 
              You agree to provide accurate, current, and complete information during the registration process 
              and to update such information to keep it accurate, current, and complete.
            </p>
            
            <h2>3. User Conduct</h2>
            <p>
              You agree not to:
            </p>
            <ul>
              <li>Use our Services for any illegal purpose or in violation of any laws</li>
              <li>Share your account credentials with others</li>
              <li>Copy or distribute content from our platform without permission</li>
              <li>Upload or transmit viruses, malware, or other malicious code</li>
              <li>Harass, intimidate, or threaten other users</li>
              <li>Attempt to gain unauthorized access to our systems or user accounts</li>
            </ul>
            
            <h2>4. Intellectual Property</h2>
            <p>
              The content, organization, graphics, design, and other matters related to our platform 
              are protected by applicable copyrights, trademarks, and other proprietary rights. 
              Copying, redistribution, use, or publication of any such content or any part of our Services 
              is prohibited without our express permission.
            </p>
            
            <h2>5. Privacy Policy</h2>
            <p>
              Our Privacy Policy, which is incorporated into these Terms by reference, 
              explains how we collect, use, and protect your information.
            </p>
            
            <h2>6. Termination</h2>
            <p>
              We reserve the right to terminate or suspend your account and access to our Services at our 
              discretion, without notice, for conduct that we believe violates these Terms or is harmful 
              to other users, us, or third parties, or for any other reason.
            </p>
            
            <h2>7. Disclaimers and Limitations of Liability</h2>
            <p>
              Our Services are provided "as is" without any warranties, expressed or implied. 
              We do not guarantee that our Services will be error-free or uninterrupted, or that any 
              defects will be corrected.
            </p>
            
            <h2>8. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will provide notice of significant 
              changes by posting a notice on our platform or by sending you an email. Your continued use of 
              our Services after such modifications will constitute your acknowledgment of the modified Terms.
            </p>
            
            <h2>9. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws, without regard 
              to its conflict of law principles.
            </p>
            
            <h2>10. Contact Information</h2>
            <p>
              If you have any questions about these Terms, please contact us at support@codementor.com.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 