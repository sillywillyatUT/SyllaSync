import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
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
          Privacy Policy
        </h1>
        <p className="text-gray-600 mb-8">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <div className="prose prose-lg max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              1. Information We Collect
            </h2>
            <p className="text-gray-700 mb-4">
              When you use SyllabusSync, we collect the following types of
              information:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>
                <strong>Account Information:</strong> When you sign up with
                Google, we collect your name, email address, and profile
                information.
              </li>
              <li>
                <strong>Document Content:</strong> We temporarily process the
                content of syllabi you upload to extract calendar events.
              </li>
              <li>
                <strong>Usage Data:</strong> We collect information about how
                you use our service, including the number of syllabi processed.
              </li>
              <li>
                <strong>Calendar Access:</strong> With your permission, we
                access your Google Calendar to create events.
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              2. How We Use Your Information
            </h2>
            <p className="text-gray-700 mb-4">We use your information to:</p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Process your uploaded syllabi and extract important dates</li>
              <li>
                Create calendar events in your Google Calendar (with your
                permission)
              </li>
              <li>Provide customer support and respond to your inquiries</li>
              <li>Improve our service and develop new features</li>
              <li>Send you important updates about our service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              3. Data Storage and Security
            </h2>
            <p className="text-gray-700 mb-4">
              We take data security seriously and implement appropriate measures
              to protect your information:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>All data is encrypted in transit and at rest</li>
              <li>We use secure cloud infrastructure provided by Supabase</li>
              <li>
                Uploaded documents are processed temporarily and not permanently
                stored
              </li>
              <li>
                Access to your data is limited to authorized personnel only
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              4. Third-Party Services
            </h2>
            <p className="text-gray-700 mb-4">
              We integrate with the following third-party services:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>
                <strong>Google:</strong> For authentication and calendar
                integration
              </li>
              <li>
                <strong>Supabase:</strong> For database and authentication
                services
              </li>
              <li>
                <strong>Groq:</strong> For AI-powered text extraction from
                documents
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              5. Your Rights
            </h2>
            <p className="text-gray-700 mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your account and associated data</li>
              <li>Withdraw consent for data processing at any time</li>
              <li>Export your data in a portable format</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              6. Data Retention
            </h2>
            <p className="text-gray-700 mb-4">
              We retain your personal information only as long as necessary to
              provide our services. Uploaded documents are processed immediately
              and not stored permanently. Account information is retained until
              you delete your account.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              7. Contact Us
            </h2>
            <p className="text-gray-700">
              If you have any questions about this Privacy Policy or our data
              practices, please contact us at privacy@syllabussync.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
