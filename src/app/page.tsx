"use client";

import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { Menu, X, Code2, BookOpen, Laptop, Brain, Target, Award, BookCheck, Users, Rocket, Coffee, LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FeatureCard = ({ icon: Icon, title, description }: FeatureCardProps) => {
  return (
    <motion.div
      className="bg-white/5 rounded-xl p-6 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 cursor-pointer"
      whileHover={{ scale: 1.05, y: -5 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Icon className="w-12 h-12 text-blue-400 mb-4" />
      </motion.div>
      <h3 className="text-xl font-semibold mb-4">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </motion.div>
  );
};

interface ScrollLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

const ScrollLink = ({ href, children, className = "" }: ScrollLinkProps) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - 80; // Adjust for header
      window.scrollTo({
        top: targetPosition,
        behavior: "smooth"
      });
    }
  };

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
};

export default function LandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const heroRef = useRef(null);
  const { scrollY } = useScroll();
  
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0.5]);
  const heroScale = useTransform(scrollY, [0, 300], [1, 0.95]);
  const bgY = useTransform(scrollY, [0, 500], [0, 150]);

  // Intersection Observer for active section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-50% 0px -50% 0px" // Only consider middle 50% of viewport
      }
    );

    const sections = document.querySelectorAll("section[id]");
    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  const navLinks = [
    { href: "#features", text: "Features" },
    { href: "#resources", text: "Resources" },
    { href: "#about", text: "About" },
  ];

  return (
    <div className="min-h-screen bg-[#0A1929] text-white overflow-hidden">
      {/* Navigation */}
      <motion.nav 
        className="fixed w-full z-50 bg-opacity-90 bg-[#0A1929] backdrop-blur-sm"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <ScrollLink href="#top" className="text-2xl font-bold">
                CodeMentor
              </ScrollLink>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              {navLinks.map(({ href, text }) => (
                <div key={href} className="relative">
                  <ScrollLink
                    href={href}
                    className={`hover:text-blue-400 transition-colors ${
                      activeSection === href.slice(1) ? "text-blue-400" : ""
                    }`}
                  >
                    {text}
                  </ScrollLink>
                  {activeSection === href.slice(1) && (
                    <motion.div
                      layoutId="activeSection"
                      className="absolute -bottom-1 left-0 right-0 h-0.5 bg-blue-400"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <Link href="/auth/login">
                <Button variant="ghost" className="text-white hover:text-blue-400">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button className="bg-[#2E5BFF] hover:bg-blue-600">
                  Get Started
                </Button>
              </Link>
            </div>
            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                className="text-white"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden"
          >
            <div className="px-2 pt-2 pb-3 space-y-1 bg-[#0A1929] shadow-lg">
              {navLinks.map(({ href, text }) => (
                <ScrollLink
                  key={href}
                  href={href}
                  className={`block px-3 py-2 text-base hover:text-blue-400 transition-colors ${
                    activeSection === href.slice(1) ? "text-blue-400" : ""
                  }`}
                >
                  {text}
                </ScrollLink>
              ))}
              <div className="px-3 py-2 space-y-2">
                <Link href="/auth/login" className="block">
                  <Button variant="ghost" className="w-full text-white hover:text-blue-400">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/register" className="block">
                  <Button className="w-full bg-[#2E5BFF] hover:bg-blue-600">
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </motion.nav>

      {/* Hero Section with enhanced animations */}
      <motion.div 
        ref={heroRef}
        className="relative"
        style={{ opacity: heroOpacity, scale: heroScale }}
      >
        {/* Animated Background Effect */}
        <motion.div 
          className="absolute inset-0 overflow-hidden"
          style={{ y: bgY }}
        >
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
        </motion.div>

        {/* Content */}
        <div className="relative pt-32 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <motion.h1 
              className="text-5xl md:text-7xl font-bold mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Master Java Programming
            </motion.h1>
            <motion.p 
              className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Your AI-Powered Journey from Beginner to Developer. No prior coding experience needed.
            </motion.p>
            <motion.div 
              className="flex justify-center space-x-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button className="bg-[#2E5BFF] hover:bg-blue-600 text-lg px-8 py-6">
                  Get Started
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Features Section with enhanced cards */}
      <section id="features" className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">Platform Features</h2>
            <p className="text-xl text-gray-300">Everything you need to master Java programming</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={Brain}
              title="AI-Powered Learning"
              description="Get personalized guidance and real-time assistance from our advanced AI mentor"
            />
            <FeatureCard
              icon={Target}
              title="Step-by-Step Progress"
              description="Follow a structured learning path designed to build your skills systematically"
            />
            <FeatureCard
              icon={Laptop}
              title="Interactive Coding"
              description="Practice with real-time code execution and instant feedback"
            />
          </div>
        </div>
      </section>

      {/* Resources Section with interactive cards */}
      <section id="resources" className="py-20 relative bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">Learning Resources</h2>
            <p className="text-xl text-gray-300">Comprehensive materials to support your journey</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={BookOpen}
              title="Interactive Tutorials"
              description="Step-by-step guides with practical examples and exercises"
            />
            <FeatureCard
              icon={Code2}
              title="Practice Problems"
              description="Curated collection of coding challenges with varying difficulty levels"
            />
            <FeatureCard
              icon={BookCheck}
              title="Documentation"
              description="Comprehensive Java documentation and best practices"
            />
          </div>
        </div>
      </section>

      {/* About Section with enhanced animations */}
      <section id="about" className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">About CodeMentor</h2>
            <p className="text-xl text-gray-300">Our mission is to make Java programming accessible to everyone</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center"
          >
            <div className="space-y-6">
              <motion.div 
                className="flex items-start space-x-4"
                whileHover={{ x: 10 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Rocket className="w-8 h-8 text-blue-400 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Our Vision</h3>
                  <p className="text-gray-400">
                    To create a world where anyone can learn programming, regardless of their background
                  </p>
                </div>
              </motion.div>
              <motion.div 
                className="flex items-start space-x-4"
                whileHover={{ x: 10 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Users className="w-8 h-8 text-blue-400 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Who We Are</h3>
                  <p className="text-gray-400">
                    A team of passionate developers and educators dedicated to helping others learn
                  </p>
                </div>
              </motion.div>
              <motion.div 
                className="flex items-start space-x-4"
                whileHover={{ x: 10 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Coffee className="w-8 h-8 text-blue-400 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Our Approach</h3>
                  <p className="text-gray-400">
                    Combining AI technology with proven teaching methods for effective learning
                  </p>
                </div>
              </motion.div>
            </div>
            <motion.div 
              className="bg-white/5 rounded-xl p-8 backdrop-blur-sm"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <h3 className="text-2xl font-bold mb-4">Start Your Journey Today</h3>
              <p className="text-gray-400 mb-6">
                Join thousands of learners who have successfully started their programming career with CodeMentor
              </p>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button className="w-full bg-[#2E5BFF] hover:bg-blue-600 text-lg py-6">
                  Begin Learning
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Scroll to Top Button */}
      <motion.button
        className="fixed bottom-8 right-8 bg-[#2E5BFF] p-3 rounded-full shadow-lg z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: scrollY.get() > 200 ? 1 : 0 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <motion.svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          animate={{ y: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </motion.svg>
      </motion.button>

      {/* Footer with enhanced quick links */}
      <footer className="bg-[#061320] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">CodeMentor</h3>
              <p className="text-gray-400">
                Your AI-powered Java programming learning platform
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                {navLinks.map(({ href, text }) => (
                  <li key={href}>
                    <ScrollLink
                      href={href}
                      className="text-gray-400 hover:text-blue-400 transition-colors relative group"
                    >
                      <span>{text}</span>
                      <motion.span
                        className="absolute left-0 right-0 bottom-0 h-px bg-blue-400 opacity-0 transform scale-x-0 origin-left transition-all duration-300"
                        whileHover={{ opacity: 1, scaleX: 1 }}
                      />
                    </ScrollLink>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Resources</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="#" className="text-gray-400 hover:text-blue-400">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-blue-400">
                    Tutorials
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-blue-400">
                    Practice
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact</h4>
              <ul className="space-y-2">
                <li className="text-gray-400">Email: support@codementor.com</li>
                <li className="text-gray-400">Phone: (123) 456-7890</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-800 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} CodeMentor. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
