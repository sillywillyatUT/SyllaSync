import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Link
          href="/"
          className="inline-flex items-center text-orange-600 hover:text-orange-700 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Terms of Service
        </h1>
        <p className="text-gray-600 mb-8">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <div className="prose prose-lg max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              1. Acceptance of Terms
            </h2>
            <p className="text-gray-700 mb-4">
              By accessing and using SyllabusSync, you accept and agree to be
              bound by the terms and provision of this agreement. If you do not
              agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              2. Description of Service
            </h2>
            <p className="text-gray-700 mb-4">
              SyllabusSync is a web application that allows users to upload
              academic syllabi and automatically extract important dates and
              events, which can then be exported to various calendar
              applications including Google Calendar.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              3. User Responsibilities
            </h2>
            <p className="text-gray-700 mb-4">
              As a user of SyllabusSync, you agree to:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>
                Provide accurate and complete information when creating your
                account
              </li>
              <li>Only upload documents that you have the right to process</li>
              <li>
                Use the service in compliance with all applicable laws and
                regulations
              </li>
              <li>
                Not attempt to reverse engineer, hack, or compromise the service
              </li>
              <li>
                Not upload malicious content or attempt to disrupt the service
              </li>
              <li>Respect the intellectual property rights of others</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              4. Acceptable Use Policy
            </h2>
            <p className="text-gray-700 mb-4">
              You may not use SyllabusSync to:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Upload copyrighted material without permission</li>
              <li>
                Process documents containing personal information of others
                without consent
              </li>
              <li>Attempt to overwhelm our servers with excessive requests</li>
              <li>Use the service for any illegal or unauthorized purpose</li>
              <li>Interfere with or disrupt the service or servers</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              5. Intellectual Property
            </h2>
            <p className="text-gray-700 mb-4">
              The SyllabusSync service, including its original content,
              features, and functionality, is owned by SyllabusSync and is
              protected by international copyright, trademark, patent, trade
              secret, and other intellectual property laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              6. Privacy and Data Protection
            </h2>
            <p className="text-gray-700 mb-4">
              Your privacy is important to us. Please review our Privacy Policy,
              which also governs your use of the service, to understand our
              practices regarding the collection and use of your information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              7. Service Availability
            </h2>
            <p className="text-gray-700 mb-4">
              We strive to provide reliable service, but we cannot guarantee
              100% uptime. The service may be temporarily unavailable due to
              maintenance, updates, or technical issues. We reserve the right to
              modify or discontinue the service at any time with reasonable
              notice.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              8. Limitation of Liability
            </h2>
            <p className="text-gray-700 mb-4">
              SyllabusSync shall not be liable for any indirect, incidental,
              special, consequential, or punitive damages, including without
              limitation, loss of profits, data, use, goodwill, or other
              intangible losses, resulting from your use of the service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              9. Termination
            </h2>
            <p className="text-gray-700 mb-4">
              We may terminate or suspend your account and access to the service
              immediately, without prior notice or liability, for any reason
              whatsoever, including without limitation if you breach the Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              10. Changes to Terms
            </h2>
            <p className="text-gray-700 mb-4">
              We reserve the right to modify these terms at any time. We will
              notify users of any material changes via email or through the
              service. Your continued use of the service after such
              modifications constitutes acceptance of the updated terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              11. Contact Information
            </h2>
            <p className="text-gray-700">
              If you have any questions about these Terms of Service, please
              contact us at legal@syllabussync.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
