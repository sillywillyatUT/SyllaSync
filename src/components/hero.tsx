"use client";

import Link from "next/link";
import { ArrowUpRight, Check, Calendar, FileText, Upload } from "lucide-react";
import { useEffect, useState } from "react";

export default function Hero() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="relative overflow-hidden bg-white">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-orange-100 opacity-70" />
      <div className="relative pt-24 pb-32 sm:pt-32 sm:pb-40">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <h1
              className={`text-5xl sm:text-6xl font-bold text-gray-900 mb-8 tracking-tight transition-all duration-800 ease-in ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-5"}`}
            >
              Turn Your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600">
                Syllabus
              </span>{" "}
              Into a Smart Calendar
            </h1>

            <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
              Upload your course syllabus and instantly extract all important
              dates - assignments, exams, and deadlines - into your favorite
              calendar app.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center px-8 py-4 text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-all duration-200 text-lg font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Upload Syllabus Now
                <Upload className="ml-2 w-5 h-5" />
              </Link>

              <Link
                href="#how-it-works"
                className="inline-flex items-center px-8 py-4 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200 text-lg font-medium shadow-sm hover:shadow-md"
              >
                See How It Works
              </Link>
            </div>

            <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-gray-600">
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
