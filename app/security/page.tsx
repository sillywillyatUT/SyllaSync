import Link from "next/link";
import {
  ArrowLeft,
  Shield,
  Lock,
  Eye,
  Server,
  Key,
  AlertTriangle,
} from "lucide-react";

export default function Security() {
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

        <h1 className="text-4xl font-bold text-gray-900 mb-8">Security</h1>
        <p className="text-gray-600 mb-8">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <div className="prose prose-lg max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
              <Shield className="w-6 h-6 mr-2 text-orange-600" />
              Our Commitment to Security
            </h2>
            <p className="text-gray-700 mb-4">
              At SyllabusSync, we take the security of your data seriously. We
              implement industry-standard security measures to protect your
              personal information and ensure the confidentiality, integrity,
              and availability of our service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
              <Lock className="w-6 h-6 mr-2 text-orange-600" />
              Data Encryption
            </h2>
            <div className="bg-orange-50 p-6 rounded-lg mb-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                Encryption in Transit
              </h3>
              <p className="text-gray-700 mb-4">
                All data transmitted between your device and our servers is
                encrypted using TLS 1.3, the latest and most secure transport
                layer security protocol.
              </p>
              <h3 className="font-semibold text-gray-900 mb-2">
                Encryption at Rest
              </h3>
              <p className="text-gray-700">
                All data stored in our databases is encrypted using AES-256
                encryption, ensuring your information remains secure even if
                physical storage is compromised.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
              <Key className="w-6 h-6 mr-2 text-orange-600" />
              Authentication & Access Control
            </h2>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>
                <strong>OAuth 2.0:</strong> We use Google OAuth 2.0 for secure
                authentication
              </li>
              <li>
                <strong>Multi-Factor Authentication:</strong> Supported through
                Google's security features
              </li>
              <li>
                <strong>Session Management:</strong> Secure session tokens with
                automatic expiration
              </li>
              <li>
                <strong>Access Controls:</strong> Role-based access control for
                internal systems
              </li>
              <li>
                <strong>API Security:</strong> Rate limiting and request
                validation on all endpoints
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
              <Server className="w-6 h-6 mr-2 text-orange-600" />
              Infrastructure Security
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Cloud Infrastructure
                </h3>
                <p className="text-gray-700 text-sm">
                  Our services are hosted on Supabase, which provides
                  enterprise-grade security with SOC 2 Type II compliance and
                  regular security audits.
                </p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Network Security
                </h3>
                <p className="text-gray-700 text-sm">
                  All network traffic is protected by firewalls, DDoS
                  protection, and intrusion detection systems.
                </p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Data Centers
                </h3>
                <p className="text-gray-700 text-sm">
                  Our data is stored in secure, certified data centers with 24/7
                  physical security and environmental controls.
                </p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Backup & Recovery
                </h3>
                <p className="text-gray-700 text-sm">
                  Regular automated backups with point-in-time recovery
                  capabilities ensure data availability and disaster recovery.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
              <Eye className="w-6 h-6 mr-2 text-orange-600" />
              Data Processing & Privacy
            </h2>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>
                <strong>Minimal Data Collection:</strong> We only collect data
                necessary for service functionality
              </li>
              <li>
                <strong>Temporary Processing:</strong> Uploaded documents are
                processed temporarily and not permanently stored
              </li>
              <li>
                <strong>Data Anonymization:</strong> Personal identifiers are
                removed from analytics data
              </li>
              <li>
                <strong>Third-Party Integrations:</strong> All integrations
                follow strict security protocols
              </li>
              <li>
                <strong>Data Retention:</strong> Clear policies on how long
                different types of data are retained
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Security Monitoring
            </h2>
            <p className="text-gray-700 mb-4">
              We continuously monitor our systems for security threats and
              vulnerabilities:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>24/7 automated security monitoring and alerting</li>
              <li>Regular security assessments and penetration testing</li>
              <li>Vulnerability scanning and patch management</li>
              <li>Security incident response procedures</li>
              <li>Employee security training and background checks</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Compliance & Certifications
            </h2>
            <div className="bg-blue-50 p-6 rounded-lg">
              <p className="text-gray-700 mb-4">
                We adhere to industry standards and regulations:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  <strong>GDPR:</strong> General Data Protection Regulation
                  compliance
                </li>
                <li>
                  <strong>CCPA:</strong> California Consumer Privacy Act
                  compliance
                </li>
                <li>
                  <strong>SOC 2:</strong> Service Organization Control 2 Type II
                  (through Supabase)
                </li>
                <li>
                  <strong>ISO 27001:</strong> Information Security Management
                  System standards
                </li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="w-6 h-6 mr-2 text-orange-600" />
              Reporting Security Issues
            </h2>
            <div className="bg-red-50 p-6 rounded-lg">
              <p className="text-gray-700 mb-4">
                If you discover a security vulnerability or have security
                concerns, please report them immediately:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  <strong>Email:</strong> security@syllabussync.com
                </li>
                <li>
                  <strong>Response Time:</strong> We aim to respond within 24
                  hours
                </li>
                <li>
                  <strong>Responsible Disclosure:</strong> We follow responsible
                  disclosure practices
                </li>
                <li>
                  <strong>Bug Bounty:</strong> We may offer rewards for valid
                  security reports
                </li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Your Security Responsibilities
            </h2>
            <p className="text-gray-700 mb-4">
              While we implement strong security measures, you also play a role
              in keeping your account secure:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Use a strong, unique password for your Google account</li>
              <li>Enable two-factor authentication on your Google account</li>
              <li>Keep your devices and browsers updated</li>
              <li>Log out of shared or public computers</li>
              <li>Report any suspicious activity immediately</li>
              <li>Only upload documents you have permission to process</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Contact Us
            </h2>
            <p className="text-gray-700">
              For any security-related questions or concerns, please contact our
              security team at security@syllabussync.com. For general inquiries,
              reach out to support@syllabussync.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
