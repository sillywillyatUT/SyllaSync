"use client";

import { useState, useRef, useCallback } from "react";
import { createClient } from "../../supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowUpRight,
  Calendar,
} from "lucide-react";
import { cn } from "../lib/utils";

interface UploadedFile {
  file: File;
  id: string;
  status: "uploading" | "success" | "error";
  progress: number;
}

interface ExtractedDate {
  id: string;
  title: string;
  date: string;
  type:
    | "assignment"
    | "exam"
    | "midterm"
    | "final"
    | "quiz"
    | "class"
    | "deadline"
    | "holiday";
  time?: string;
  recurrence?: string;
  description?: string;
  sectionNumber?: string;
  isRecurring?: boolean;
}

interface RecurringClassOption {
  id: string;
  title: string;
  sectionNumber: string;
  time: string;
  selected: boolean;
}

export default function UploadClient() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedDates, setExtractedDates] = useState<ExtractedDate[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [recurringClassOptions, setRecurringClassOptions] = useState<
    RecurringClassOption[]
  >([]);
  const [showRecurringSelection, setShowRecurringSelection] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const removeExtractedDate = (id: string) => {
    setExtractedDates((prev) => prev.filter((event) => event.id !== id));
  };

  const acceptedFileTypes = [".pdf", "application/pdf"];

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      handleFiles(selectedFiles);
    },
    [],
  );

  const handleFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter((file) => {
      const isValidType = acceptedFileTypes.some((type) =>
        type.startsWith(".")
          ? file.name.toLowerCase().endsWith(type)
          : file.type === type,
      );
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
      return isValidType && isValidSize;
    });

    const uploadedFiles: UploadedFile[] = validFiles.map((file) => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: "uploading",
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...uploadedFiles]);

    // Simulate upload progress
    uploadedFiles.forEach((uploadedFile) => {
      simulateUpload(uploadedFile.id);
    });
  };

  const simulateUpload = (fileId: string) => {
    const interval = setInterval(() => {
      setFiles((prev) =>
        prev.map((file) => {
          if (file.id === fileId) {
            const newProgress = Math.min(
              file.progress + Math.random() * 30,
              100,
            );
            const newStatus = newProgress === 100 ? "success" : "uploading";
            return { ...file, progress: newProgress, status: newStatus };
          }
          return file;
        }),
      );
    }, 200);

    setTimeout(
      () => {
        clearInterval(interval);
        setFiles((prev) =>
          prev.map((file) =>
            file.id === fileId
              ? { ...file, progress: 100, status: "success" }
              : file,
          ),
        );
      },
      2000 + Math.random() * 2000,
    );
  };

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  const processFiles = async () => {
    setIsProcessing(true);

    try {
      const successfulFiles = files.filter((f) => f.status === "success");

      if (successfulFiles.length === 0) {
        throw new Error("No files to process");
      }

      // Process each PDF file
      const allExtractedDates: ExtractedDate[] = [];

      for (const uploadedFile of successfulFiles) {
        if (uploadedFile.file.type === "application/pdf") {
          const formData = new FormData();
          formData.append("file", uploadedFile.file);

          const response = await fetch("/api/process-pdf", {
            method: "POST",
            body: formData,
          });

          const contentType = response.headers.get("content-type") || "";
          if (!response.ok || !contentType.includes("application/json")) {
            const text = await response.text();
            console.error("Unexpected response:", text); // 👈 logs actual HTML or error
            throw new Error(
              `Unexpected response (${response.status}): ${text.slice(0, 200)}`,
            );
          }

          const result = await response.json();

          if (result.success && result.extractedDates) {
            // Filter out dates without specific dates or recurring patterns
            const validDates = result.extractedDates.filter(
              (dateItem: ExtractedDate) => {
                // Include if it has a specific date
                if (
                  dateItem.date &&
                  dateItem.date !== "" &&
                  !dateItem.date.includes("throughout")
                ) {
                  return true;
                }
                // Include if it has recurring pattern like "every Friday"
                if (
                  dateItem.recurrence &&
                  (dateItem.recurrence.includes("every") ||
                    dateItem.recurrence.includes("weekly"))
                ) {
                  return true;
                }
                return false;
              },
            );

            // Check for multiple recurring class times with different sections
            const recurringClasses = validDates.filter(
              (dateItem: ExtractedDate) =>
                dateItem.type === "class" &&
                dateItem.recurrence &&
                dateItem.sectionNumber,
            );

            if (recurringClasses.length > 1) {
              const options = recurringClasses.map(
                (classItem: ExtractedDate) => ({
                  id: classItem.id,
                  title: classItem.title,
                  sectionNumber: classItem.sectionNumber || "Unknown",
                  time: classItem.time || "Unknown",
                  selected: false,
                }),
              );
              setRecurringClassOptions(options);
              setShowRecurringSelection(true);
            }

            allExtractedDates.push(...validDates);
          }
        }
      }

      // Update syllabi count in database
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && successfulFiles.length > 0) {
        const { data: currentProfile } = await supabase
          .from("users")
          .select("syllabi_processed")
          .eq("user_id", user.id)
          .single();

        const currentCount = currentProfile?.syllabi_processed || 0;
        const newCount = currentCount + successfulFiles.length;

        await supabase
          .from("users")
          .update({ syllabi_processed: newCount })
          .eq("user_id", user.id);
      }

      setExtractedDates(allExtractedDates);
      setIsProcessing(false);
      setShowResults(true);
    } catch (error) {
      console.error("Error processing files:", error);
      setIsProcessing(false);

      // Show error to user (you might want to add a toast notification here)
      alert(
        `Error processing files: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (fileName: string, status: string) => {
    return (
      <FileText
        className={cn(
          "w-5 h-5 text-orange-500 transition-all duration-300",
          status === "success" && "file-upload-success",
        )}
      />
    );
  };

  const getDateTypeIcon = (type: string) => {
    // Return empty string to remove emojis
    return "";
  };

  const getDateTypeColor = (type: string) => {
    switch (type) {
      case "assignment":
        return "bg-blue-100 text-blue-800";
      case "exam":
        return "bg-red-100 text-red-800";
      case "midterm":
        return "bg-purple-100 text-purple-800";
      case "final":
        return "bg-red-200 text-red-900";
      case "quiz":
        return "bg-yellow-100 text-yellow-800";
      case "class":
        return "bg-green-100 text-green-800";
      case "deadline":
        return "bg-orange-100 text-orange-800";
      case "holiday":
        return "bg-pink-100 text-pink-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const successfulFiles = files.filter((f) => f.status === "success");
  const canProcess = successfulFiles.length > 0 && !isProcessing;

  const handleRecurringClassSelection = (optionId: string) => {
    setRecurringClassOptions((prev) =>
      prev.map((option) =>
        option.id === optionId
          ? { ...option, selected: !option.selected }
          : option,
      ),
    );
  };

  const confirmRecurringSelection = () => {
    const selectedIds = recurringClassOptions
      .filter((option) => option.selected)
      .map((option) => option.id);

    // Filter extracted dates to only include selected recurring classes
    const filteredDates = extractedDates.filter(
      (dateItem) =>
        dateItem.type !== "class" ||
        !dateItem.sectionNumber ||
        selectedIds.includes(dateItem.id),
    );

    setExtractedDates(filteredDates);
    setShowRecurringSelection(false);
  };

  return (
    <>
      {/* Hero Section */}
      <div className="relative pt-16 pb-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Upload Your <span className="text-orange-500">Syllabus</span>
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Transform your course syllabus into a smart calendar in seconds
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-16">
        {/* Upload Area */}
        <div className="mb-8">
          <div
            className={cn(
              "relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer",
              isDragOver
                ? "border-orange-400 bg-orange-50"
                : "border-orange-300 bg-gradient-to-br from-orange-50 to-orange-100 hover:border-orange-400 hover:bg-orange-100",
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-16 h-16 mx-auto mb-4 bg-orange-200 rounded-full flex items-center justify-center">
              <Upload className="w-8 h-8 text-orange-600" />
            </div>
            <p className="text-orange-800 mb-2 text-lg font-medium">
              Click here to upload your file or drag and drop.
            </p>
            <p className="text-orange-600 text-sm">
              Supported Format: PDF files, up to 10MB each
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={acceptedFileTypes.join(",")}
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>

        {/* Process Files Button */}
        {canProcess && (
          <div className="mb-12 text-center">
            <Button
              onClick={processFiles}
              disabled={!canProcess}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-12 py-4 text-lg font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 border-0"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Process {successfulFiles.length} file
                  {successfulFiles.length !== 1 ? "s" : ""}
                  <ArrowUpRight className="w-6 h-6 ml-3" />
                </>
              )}
            </Button>
          </div>
        )}

        {/* File List */}
        {files.length > 0 && (
          <div className="mb-12">
            <Card className="shadow-lg border-0 border-orange-200">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-xl">
                <CardTitle className="text-xl flex items-center gap-2">
                  <FileText className="w-6 h-6" />
                  Uploaded Files
                </CardTitle>
                <CardDescription className="text-orange-100">
                  {files.length} file{files.length !== 1 ? "s" : ""} uploaded
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 bg-orange-50">
                <div className="space-y-4">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className={cn(
                        "flex items-center justify-between p-4 bg-white rounded-xl border border-orange-200 transition-all duration-300 hover:shadow-md hover:border-orange-300",
                        file.status === "success" && "bounce-in",
                      )}
                    >
                      <div className="flex items-center space-x-4 flex-1">
                        {getFileIcon(file.file.name, file.status)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.file.name}
                          </p>
                          <p className="text-xs text-orange-600">
                            {formatFileSize(file.file.size)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        {file.status === "uploading" && (
                          <div className="flex items-center space-x-3">
                            <div className="w-32 bg-orange-200 rounded-full h-2">
                              <div
                                className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${file.progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-orange-600 w-12">
                              {Math.round(file.progress)}%
                            </span>
                          </div>
                        )}

                        {file.status === "success" && (
                          <div className="flex items-center space-x-2">
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                            <span className="text-sm text-green-600 font-medium">
                              Complete
                            </span>
                          </div>
                        )}

                        {file.status === "error" && (
                          <div className="flex items-center space-x-2">
                            <AlertCircle className="w-5 h-5 text-red-500" />
                            <span className="text-sm text-red-600 font-medium">
                              Error
                            </span>
                          </div>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(file.id)}
                          className="text-gray-400 hover:text-red-500 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recurring Class Selection */}
        {showRecurringSelection && (
          <div className="mb-12">
            <Card className="shadow-lg border-0 border-orange-200">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-xl">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Calendar className="w-6 h-6" />
                  Multiple Class Times Found
                </CardTitle>
                <CardDescription className="text-orange-100">
                  Select which class sections you want to include in your
                  calendar
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 bg-orange-50">
                <div className="space-y-4">
                  {recurringClassOptions.map((option) => (
                    <div
                      key={option.id}
                      className="flex items-center space-x-3 p-4 bg-white rounded-xl border border-orange-200"
                    >
                      <input
                        type="checkbox"
                        id={option.id}
                        checked={option.selected}
                        onChange={() =>
                          handleRecurringClassSelection(option.id)
                        }
                        className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500"
                      />
                      <label
                        htmlFor={option.id}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="font-medium text-gray-900">
                          {option.title}
                        </div>
                        <div className="text-sm text-orange-600">
                          Section {option.sectionNumber} - {option.time}
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
                <div className="mt-6">
                  <Button
                    onClick={confirmRecurringSelection}
                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-3 rounded-xl"
                  >
                    Confirm Selection
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Extracted Dates Results */}
        {showResults &&
          extractedDates.length > 0 &&
          !showRecurringSelection && (
            <div className="mb-12">
              <Card className="shadow-lg border-0 border-orange-200">
                <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-xl">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Calendar className="w-6 h-6" />
                    Extracted Important Dates
                  </CardTitle>
                  <CardDescription className="text-orange-100">
                    {extractedDates.length} important dates found in your
                    syllabus
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 bg-orange-50">
                  <div className="space-y-4">
                    {extractedDates.map((dateItem) => (
                      <div
                        key={dateItem.id}
                        className="flex items-start justify-between p-4 bg-white rounded-xl border border-orange-200 hover:shadow-md hover:border-orange-300 transition-all duration-300"
                      >
                        <div className="flex items-start space-x-4 flex-1">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-gray-900">{dateItem.title}</h4>
                              <span
                                className={cn(
                                  "px-2 py-1 rounded-full text-xs font-medium capitalize",
                                  getDateTypeColor(dateItem.type),
                                )}
                              >
                                {dateItem.type}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-medium text-orange-600">
                                {dateItem.date ? formatDate(dateItem.date) : dateItem.recurrence}
                              </p>
                              {dateItem.time && (
                                <span className="text-sm text-gray-500">
                                  at {dateItem.time}
                                </span>
                              )}
                            </div>
                            {dateItem.recurrence && dateItem.date && (
                              <p className="text-sm text-blue-600 mb-1">{dateItem.recurrence}</p>
                            )}
                            {dateItem.description && (
                              <p className="text-sm text-gray-600">{dateItem.description}</p>
                            )}
                          </div>
                        </div>

                        {/* ❌ Remove Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeExtractedDate(dateItem.id)}
                          className="text-gray-400 hover:text-red-500 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}

                  </div>
                  <div className="mt-6 flex gap-3">
                    <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl">
                      Export to Google Calendar
                    </Button>
                    <Button
                      variant="outline"
                      className="border-orange-500 text-orange-600 hover:bg-orange-50 rounded-xl"
                    >
                      Download .ics File
                    </Button>
                    <Button
                      variant="outline"
                      className="border-orange-500 text-orange-600 hover:bg-orange-50 rounded-xl"
                    >
                      Export to Apple Calendar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

        {/* How It Works & Supported Formats - Side by Side */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* How It Works */}
          <Card className="shadow-lg border-0 border-orange-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <CardHeader className="bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-t-xl">
              <CardTitle className="text-xl flex items-center gap-2">
                <Calendar className="w-6 h-6" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 bg-orange-50">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-orange-200 rounded-full flex items-center justify-center font-bold text-orange-700 text-sm flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">
                      Upload Your Syllabus
                    </h4>
                    <p className="text-sm text-gray-600">
                      Drag and drop your PDF syllabus or click to select it
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-orange-300 rounded-full flex items-center justify-center font-bold text-orange-800 text-sm flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">
                      AI Extracts Dates
                    </h4>
                    <p className="text-sm text-gray-600">
                      Our AI identifies all important dates and deadlines
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center font-bold text-orange-900 text-sm flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">
                      Export to Calendar
                    </h4>
                    <p className="text-sm text-gray-600">
                      Review and export to your favorite calendar app
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Supported Formats */}
          <Card className="shadow-lg border-0 border-orange-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <CardHeader className="bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-t-xl">
              <CardTitle className="text-xl flex items-center gap-2">
                <FileText className="w-6 h-6" />
                Supported Formats
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 bg-orange-50">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-200 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      PDF Documents
                    </h4>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      TXT, Word Documents
                    </h4>
                    <p className="text-sm text-orange-600">Coming soon</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3"></div>
                <div className="mt-4 p-3 bg-orange-100 rounded-lg">
                  <p className="text-xs text-orange-700">
                    <strong>Maximum file size:</strong> 10MB per file
                    <br />
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
