import Footer from "@/components/footer";
import Hero from "@/components/hero";
import Navbar from "@/components/navbar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowUpRight,
  Calendar,
  FileText,
  Upload,
  CheckCircle2,
  Smartphone,
  Download,
  Mail,
  Phone,
} from "lucide-react";
import { createClient } from "../../supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Navbar />
      <Hero />

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Transform your syllabus into a smart calendar in just three simple
              steps.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Upload className="w-8 h-8" />,
                title: "Upload Your Syllabus",
                description:
                  "Drag and drop your PDF syllabus or browse to select it. We support PDFs and other document formats.",
                step: "1",
              },
              {
                icon: <FileText className="w-8 h-8" />,
                title: "AI Extracts Dates",
                description:
                  "Our AI automatically identifies and extracts all important dates - assignments, exams, and deadlines.",
                step: "2",
              },
              {
                icon: <Calendar className="w-8 h-8" />,
                title: "Export to Calendar",
                description:
                  "Review the extracted dates and export them to Google Calendar, Apple Calendar, or download as .ics file.",
                step: "3",
              },
            ].map((step, index) => (
              <div
                key={index}
                className="relative p-8 bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-orange-200 group"
              >
                <div className="absolute -top-4 -left-4 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-sm group-hover:bg-orange-600 transition-colors">
                  {step.step}
                </div>
                <div className="text-orange-500 mb-4 group-hover:text-orange-600 transition-colors">
                  {step.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-gray-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              Why Students Love SyllabusSync
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Never miss another deadline with our intelligent syllabus
              processing.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <CheckCircle2 className="w-6 h-6" />,
                title: "AI-Powered Accuracy",
                description:
                  "Advanced AI ensures no important dates are missed",
              },
              {
                icon: <Smartphone className="w-6 h-6" />,
                title: "Works Everywhere",
                description: "Access your calendar on any device, anywhere",
              },
              {
                icon: <Download className="w-6 h-6" />,
                title: "Multiple Export Options",
                description:
                  "Google Calendar, Apple Calendar, or .ics download",
              },
              {
                icon: <Upload className="w-6 h-6" />,
                title: "Easy Upload",
                description:
                  "Simple drag-and-drop interface with file validation",
              },
              {
                icon: <FileText className="w-6 h-6" />,
                title: "Review Before Export",
                description:
                  "Verify and edit extracted dates before adding to calendar",
              },
              {
                icon: <Calendar className="w-6 h-6" />,
                title: "Organized Schedule",
                description: "All your academic deadlines in one place",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="p-6 bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-50 hover:border-orange-100 group"
              >
                <div className="text-orange-500 mb-4 group-hover:text-orange-600 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">10,000+</div>
              <div className="text-orange-100">Syllabi Processed</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">5,000+</div>
              <div className="text-orange-100">Happy Students</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">99.5%</div>
              <div className="text-orange-100">Accuracy Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Get answers to common questions about SyllabusSync.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-left">
                  What file formats are supported?
                </AccordionTrigger>
                <AccordionContent>
                  We support PDF files, Word documents (.docx), and plain text
                  files (.txt). PDF is the most commonly used format for syllabi
                  and works best with our AI extraction technology.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger className="text-left">
                  How accurate is the date extraction?
                </AccordionTrigger>
                <AccordionContent>
                  Our AI has a 99.5% accuracy rate in identifying and extracting
                  important dates from syllabi. You can always review and edit
                  the extracted dates before exporting to your calendar.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="text-left">
                  Can I export to multiple calendar apps?
                </AccordionTrigger>
                <AccordionContent>
                  Yes! You can export your extracted dates to Google Calendar,
                  Apple Calendar, or download them as a standard .ics file that
                  works with most calendar applications.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger className="text-left">
                  Is my syllabus data secure?
                </AccordionTrigger>
                <AccordionContent>
                  Absolutely. We use enterprise-grade security to protect your
                  data. Your syllabi are processed securely and are not stored
                  permanently on our servers after processing.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger className="text-left">
                  Is SyllabusSync free to use?
                </AccordionTrigger>
                <AccordionContent>
                  Yes, SyllabusSync is completely free for students. We believe
                  in helping students stay organized without any financial
                  barriers.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6">
                <AccordionTrigger className="text-left">
                  What if the AI misses some dates?
                </AccordionTrigger>
                <AccordionContent>
                  You can review all extracted dates in our verification screen
                  before exporting. You can edit, add, or remove dates as needed
                  to ensure everything is accurate.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Get in Touch</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Have questions or need support? We're here to help!
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Contact Information */}
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-semibold mb-6">
                  Contact Information
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Mail className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-gray-600">
                        syllabussyncsup2025@gmail.com
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Phone className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium">Phone</p>
                      <p className="text-gray-600">+1 (469) 756-0708</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-2xl font-semibold mb-6">Send us a Message</h3>
              <form
                action={async (formData) => {
                  "use server";
                  // This is a placeholder - in a real app you'd handle the form submission
                  console.log("Contact form submitted:", {
                    name: formData.get("name"),
                    email: formData.get("email"),
                    subject: formData.get("subject"),
                    message: formData.get("message"),
                  });
                }}
                className="space-y-6"
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Name *
                    </label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      required
                      placeholder="Your full name"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Email *
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder="your.email@example.com"
                      className="w-full"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="subject"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Subject *
                  </label>
                  <Input
                    id="subject"
                    name="subject"
                    type="text"
                    required
                    placeholder="What's this about?"
                    className="w-full"
                  />
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Message *
                  </label>
                  <Textarea
                    id="message"
                    name="message"
                    required
                    placeholder="Tell us how we can help you..."
                    className="w-full min-h-[120px]"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 text-lg font-medium"
                >
                  Send Message
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Never Miss a Deadline?
          </h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Join thousands of students who stay organized with SyllabusSync.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center px-8 py-4 text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-all duration-200 text-lg font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Upload Your First Syllabus
            <Upload className="ml-2 w-5 h-5" />
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
