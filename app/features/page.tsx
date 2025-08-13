import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  Brain,
  Calendar,
  Download,
  Shield,
  Zap,
  Clock,
  CheckCircle,
} from "lucide-react";

export default function Features() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <Link
          href="/"
          className="inline-flex items-center text-orange-600 hover:text-orange-700 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Product Features
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover all the powerful features that make SyllabusSync the
            ultimate tool for organizing your academic schedule.
          </p>
        </div>

        {/* Core Features */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Core Features
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200">
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mb-4">
                <Upload className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Smart Upload
              </h3>
              <p className="text-gray-700 mb-4">
                Drag and drop your PDF syllabi with instant validation and
                processing. Supports multiple file uploads with progress
                tracking.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• PDF format support</li>
                <li>• Up to 10MB file size</li>
                <li>• Batch processing</li>
                <li>• Real-time progress</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                AI-Powered Extraction
              </h3>
              <p className="text-gray-700 mb-4">
                Advanced AI technology identifies and extracts all important
                academic dates from your syllabus with high accuracy.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Assignment deadlines</li>
                <li>• Exam dates</li>
                <li>• Class schedules</li>
                <li>• Project milestones</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Universal Calendar Export
              </h3>
              <p className="text-gray-700 mb-4">
                Export your extracted events to any calendar application with
                multiple format options and seamless integration.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Google Calendar</li>
                <li>• Apple Calendar</li>
                <li>• .ics file download</li>
                <li>• Outlook compatible</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Advanced Features */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Advanced Capabilities
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-lg">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mr-4">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900">
                  Intelligent Date Recognition
                </h3>
              </div>
              <p className="text-gray-700 mb-4">
                Our AI understands various date formats, recurring patterns, and
                academic terminology to ensure no important date is missed.
              </p>
              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Recognizes multiple date formats
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Handles recurring class schedules
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Understands academic terminology
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Extracts time and location details
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-lg">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center mr-4">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900">
                  Smart Event Categorization
                </h3>
              </div>
              <p className="text-gray-700 mb-4">
                Automatically categorizes events by type with color coding and
                priority levels for better organization and visual clarity.
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center">
                  <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                  Exams & Finals
                </div>
                <div className="flex items-center">
                  <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                  Assignments
                </div>
                <div className="flex items-center">
                  <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                  Class Sessions
                </div>
                <div className="flex items-center">
                  <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                  Quizzes
                </div>
                <div className="flex items-center">
                  <span className="w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
                  Midterms
                </div>
                <div className="flex items-center">
                  <span className="w-3 h-3 bg-orange-500 rounded-full mr-2"></span>
                  Deadlines
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Security & Privacy */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Security & Privacy
          </h2>
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-8 rounded-xl border border-gray-200">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4 text-center">
              Enterprise-Grade Security
            </h3>
            <p className="text-gray-700 text-center mb-8 max-w-3xl mx-auto">
              Your data security and privacy are our top priorities. We
              implement industry-standard security measures to protect your
              information.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  End-to-End Encryption
                </h4>
                <p className="text-sm text-gray-600">
                  All data encrypted in transit and at rest
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Temporary Processing
                </h4>
                <p className="text-sm text-gray-600">
                  Documents processed temporarily, not stored
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  GDPR Compliant
                </h4>
                <p className="text-sm text-gray-600">
                  Full compliance with privacy regulations
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Integration Features */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Seamless Integrations
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Google Calendar
              </h3>
              <p className="text-sm text-gray-600">
                Direct integration with automatic event creation
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Apple Calendar
              </h3>
              <p className="text-sm text-gray-600">
                Native support for macOS and iOS devices
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Outlook</h3>
              <p className="text-sm text-gray-600">
                Compatible with Microsoft Outlook calendar
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Download className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">.ics Export</h3>
              <p className="text-sm text-gray-600">
                Universal calendar file format support
              </p>
            </div>
          </div>
        </section>

        {/* User Experience */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            User Experience
          </h2>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-8 rounded-xl border border-orange-200">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Lightning Fast
                </h3>
                <p className="text-gray-700">
                  Process your syllabus in seconds with our optimized AI engine
                  and cloud infrastructure.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  User-Friendly
                </h3>
                <p className="text-gray-700">
                  Intuitive interface designed for students with clear
                  instructions and helpful tooltips.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Always Accessible
                </h3>
                <p className="text-gray-700">
                  Web-based application accessible from any device with an
                  internet connection, anywhere, anytime.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="text-center">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-8 rounded-xl text-white">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-xl mb-6 opacity-90">
              Transform your syllabus into a smart calendar in just a few
              clicks.
            </p>
            <Link
              href="/upload"
              className="inline-flex items-center px-8 py-4 bg-white text-orange-600 rounded-lg hover:bg-gray-100 transition-colors text-lg font-semibold"
            >
              Upload Your Syllabus Now
              <Upload className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
