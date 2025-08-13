import Link from "next/link";
import { ArrowLeft, Cookie } from "lucide-react";

export default function CookiePolicy() {
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

        <h1 className="text-4xl font-bold text-gray-900 mb-8 flex items-center">
          <Cookie className="w-8 h-8 mr-3 text-orange-600" />
          Cookie Policy
        </h1>
        <p className="text-gray-600 mb-8">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <div className="prose prose-lg max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              What Are Cookies?
            </h2>
            <p className="text-gray-700 mb-4">
              Cookies are small text files that are stored on your device when
              you visit a website. They help websites remember information about
              your visit, which can make it easier to visit the site again and
              make the site more useful to you.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              How We Use Cookies
            </h2>
            <p className="text-gray-700 mb-4">
              SyllabusSync uses cookies to enhance your experience and provide
              essential functionality. We use cookies for the following
              purposes:
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Types of Cookies We Use
            </h2>

            <div className="space-y-6">
              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                  <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                  Essential Cookies (Always Active)
                </h3>
                <p className="text-gray-700 mb-3">
                  These cookies are necessary for the website to function
                  properly and cannot be disabled.
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-1 text-sm">
                  <li>
                    <strong>Authentication:</strong> Keep you logged in during
                    your session
                  </li>
                  <li>
                    <strong>Security:</strong> Protect against cross-site
                    request forgery attacks
                  </li>
                  <li>
                    <strong>Session Management:</strong> Maintain your session
                    state across pages
                  </li>
                  <li>
                    <strong>Load Balancing:</strong> Ensure proper distribution
                    of server load
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                  <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                  Functional Cookies
                </h3>
                <p className="text-gray-700 mb-3">
                  These cookies enable enhanced functionality and
                  personalization.
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-1 text-sm">
                  <li>
                    <strong>Preferences:</strong> Remember your settings and
                    preferences
                  </li>
                  <li>
                    <strong>Language:</strong> Store your preferred language
                    settings
                  </li>
                  <li>
                    <strong>Theme:</strong> Remember your light/dark mode
                    preference
                  </li>
                  <li>
                    <strong>Upload History:</strong> Track your recent uploads
                    for better UX
                  </li>
                </ul>
              </div>

              <div className="bg-yellow-50 p-6 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                  <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                  Analytics Cookies
                </h3>
                <p className="text-gray-700 mb-3">
                  These cookies help us understand how visitors interact with
                  our website.
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-1 text-sm">
                  <li>
                    <strong>Usage Analytics:</strong> Track page views and user
                    interactions
                  </li>
                  <li>
                    <strong>Performance:</strong> Monitor site performance and
                    loading times
                  </li>
                  <li>
                    <strong>Error Tracking:</strong> Identify and fix technical
                    issues
                  </li>
                  <li>
                    <strong>Feature Usage:</strong> Understand which features
                    are most popular
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Third-Party Cookies
            </h2>
            <p className="text-gray-700 mb-4">
              We may use third-party services that set their own cookies:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>
                <strong>Google OAuth:</strong> For secure authentication and
                login
              </li>
              <li>
                <strong>Google Calendar API:</strong> For calendar integration
                functionality
              </li>
              <li>
                <strong>Supabase:</strong> For database and authentication
                services
              </li>
            </ul>
            <p className="text-gray-700 mt-4">
              These third parties have their own privacy policies and cookie
              practices. We recommend reviewing their policies for more
              information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Cookie Duration
            </h2>
            <div className="bg-gray-50 p-6 rounded-lg">
              <p className="text-gray-700 mb-4">
                Cookies have different lifespans:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  <strong>Session Cookies:</strong> Deleted when you close your
                  browser
                </li>
                <li>
                  <strong>Persistent Cookies:</strong> Remain on your device for
                  a set period (typically 30 days to 1 year)
                </li>
                <li>
                  <strong>Authentication Cookies:</strong> Expire based on your
                  login session (usually 24 hours)
                </li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Managing Your Cookie Preferences
            </h2>
            <p className="text-gray-700 mb-4">
              You have several options for managing cookies:
            </p>

            <div className="space-y-4">
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Browser Settings
                </h3>
                <p className="text-gray-700 text-sm">
                  Most browsers allow you to control cookies through their
                  settings. You can typically block all cookies, accept only
                  first-party cookies, or delete existing cookies.
                </p>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Account Settings
                </h3>
                <p className="text-gray-700 text-sm">
                  When logged in, you can manage some cookie preferences through
                  your account settings, including analytics and functional
                  cookies.
                </p>
              </div>
            </div>

            <div className="bg-yellow-100 p-4 rounded-lg mt-4">
              <p className="text-gray-700 text-sm">
                <strong>Note:</strong> Disabling essential cookies may affect
                the functionality of SyllabusSync and prevent you from using
                certain features.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Browser-Specific Instructions
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Chrome</h3>
                <p className="text-gray-700 text-sm">
                  Settings → Privacy and Security → Cookies and other site data
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Firefox</h3>
                <p className="text-gray-700 text-sm">
                  Settings → Privacy & Security → Cookies and Site Data
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Safari</h3>
                <p className="text-gray-700 text-sm">
                  Preferences → Privacy → Manage Website Data
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Edge</h3>
                <p className="text-gray-700 text-sm">
                  Settings → Cookies and site permissions → Cookies and site
                  data
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Updates to This Policy
            </h2>
            <p className="text-gray-700 mb-4">
              We may update this Cookie Policy from time to time to reflect
              changes in our practices or for other operational, legal, or
              regulatory reasons. We will notify you of any material changes by
              posting the updated policy on our website.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Contact Us
            </h2>
            <p className="text-gray-700">
              If you have any questions about our use of cookies or this Cookie
              Policy, please contact us at cookies@syllabussync.com or through
              our general contact email at support@syllabussync.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
