import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

export default function AboutPage() {
  return (
    <div className="bg-white min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            About SyllabusSync
          </h1>

          <div className="prose prose-lg max-w-none">
            <p className="text-xl text-gray-600 mb-8">
              SyllabusSync makes calendar management effortless for students by
              automatically extracting important dates from syllabi and
              seamlessly integrating them into your preferred calendar app.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Our Mission
            </h2>
            <p className="text-gray-700 mb-6">
              We believe that students should spend their time learning, not
              manually transferring dates from syllabi to their calendars. Our
              AI-powered platform automates this tedious process, helping
              students stay organized and never miss important academic
              deadlines.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              How It Works
            </h2>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-orange-50 p-6 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">1. Upload</h3>
                <p className="text-gray-700">
                  Simply drag and drop your syllabus PDF or upload it through
                  our secure interface.
                </p>
              </div>
              <div className="bg-orange-50 p-6 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">2. Process</h3>
                <p className="text-gray-700">
                  Our AI extracts all important dates, assignments, and
                  recurring class schedules.
                </p>
              </div>
              <div className="bg-orange-50 p-6 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">3. Export</h3>
                <p className="text-gray-700">
                  Export to Google Calendar, Apple Calendar, or download as an
                  .ics file.
                </p>
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Why Choose SyllabusSync?
            </h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-6">
              <li>
                100% free for all students - no hidden costs or premium tiers
              </li>
              <li>
                AI-powered accuracy in date extraction and event categorization
              </li>
              <li>Support for multiple calendar platforms and formats</li>
              <li>
                Secure document processing with automatic deletion after
                processing
              </li>
              <li>
                User-friendly interface designed specifically for students
              </li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Privacy & Security
            </h2>
            <p className="text-gray-700 mb-6">
              Your privacy is our priority. We process your syllabi securely and
              delete all uploaded documents immediately after processing. We
              never store your academic information or share it with third
              parties.
            </p>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">
                Ready to get started?
              </h3>
              <p className="text-gray-700 mb-4">
                Join thousands of students who have simplified their academic
                calendar management with SyllabusSync.
              </p>
              <a
                href="/upload"
                className="inline-block bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors"
              >
                Upload Your First Syllabus
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
