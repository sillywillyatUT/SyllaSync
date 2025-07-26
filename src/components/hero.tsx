"use client";

import Link from "next/link";
import { ArrowUpRight, Check, Calendar, FileText, Upload } from "lucide-react";
import { useEffect, useState } from "react";

export default function Hero() {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    setIsVisible(true);

    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="relative overflow-hidden bg-white calendar-bg">
      {/* Background gradient with parallax effect */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-orange-100 opacity-70"
        style={{ transform: `translateY(${scrollY * 0.5}px)` }}
      />

      {/* Floating calendar icons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <Calendar
          className="absolute top-20 left-10 w-8 h-8 text-orange-200 animate-float"
          style={{ animationDelay: "0s" }}
        />
        <FileText
          className="absolute top-40 right-20 w-6 h-6 text-orange-300 animate-float"
          style={{ animationDelay: "1s" }}
        />
        <Upload
          className="absolute bottom-40 left-20 w-7 h-7 text-orange-200 animate-float"
          style={{ animationDelay: "2s" }}
        />
        <Calendar
          className="absolute bottom-20 right-10 w-5 h-5 text-orange-300 animate-float"
          style={{ animationDelay: "0.5s" }}
        />
      </div>
      <div className="relative pt-24 pb-32 sm:pt-32 sm:pb-40">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <h1
              className={`text-5xl sm:text-6xl font-bold text-gray-900 mb-8 tracking-tight transition-all duration-1000 ease-out ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-10"}`}
            >
              Turn Your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600">
                Syllabus
              </span>{" "}
              Into a Smart Calendar
            </h1>

            <p
              className={`text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed transition-all duration-1000 ease-out delay-300 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}
            >
              Upload your course syllabus and instantly extract all important
              dates - assignments, exams, and deadlines - into your favorite
              calendar app.
            </p>

            <div
              className={`flex flex-col sm:flex-row gap-4 justify-center items-center transition-all duration-1000 ease-out delay-500 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}
            >
              <Link
                href="/dashboard"
                className="inline-flex items-center px-8 py-4 text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-all duration-300 text-lg font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-1 hover:scale-105 group"
              >
                Upload Syllabus Now
                <Upload className="ml-2 w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
              </Link>

              <Link
                href="#how-it-works"
                className="inline-flex items-center px-8 py-4 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-300 text-lg font-medium shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
              >
                See How It Works
              </Link>
            </div>

            <div
              className={`mt-16 flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-gray-600 transition-all duration-1000 ease-out delay-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}
            >
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                <span>Free to use</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                <span>AI-powered extraction</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                <span>Export to any calendar</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
