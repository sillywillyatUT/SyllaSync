"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createClient } from "../../supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle, Calendar, ExternalLink } from 'lucide-react';

import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CalendarIcon,
} from "lucide-react";
import { cn } from "../lib/utils";
import dayjs, { Dayjs } from "dayjs";
import { DatePicker } from "antd";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const googleCalendarColors = [
  { id: "1", name: "Lavender", color: "bg-blue-100 border-blue-300" },
  { id: "2", name: "Sage", color: "bg-green-100 border-green-300" },
  { id: "3", name: "Grape", color: "bg-purple-100 border-purple-300" },
  { id: "4", name: "Flamingo", color: "bg-red-100 border-red-300" },
  { id: "5", name: "Banana", color: "bg-yellow-100 border-yellow-300" },
  { id: "6", name: "Tangerine", color: "bg-orange-100 border-orange-300" },
  { id: "7", name: "Peacock", color: "bg-cyan-100 border-cyan-300" },
  { id: "8", name: "Graphite", color: "bg-gray-100 border-gray-300" },
  { id: "9", name: "Blueberry", color: "bg-blue-200 border-blue-400" },
  { id: "10", name: "Basil", color: "bg-green-200 border-green-400" },
  { id: "11", name: "Tomato", color: "bg-red-200 border-red-400" }
];
  const [showRecurringSelection, setShowRecurringSelection] = useState(false);
  const [isExportingToGoogle, setIsExportingToGoogle] = useState(false);
  const [semesterDateRange, setSemesterDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().month(7).date(15), // August 15th
    dayjs().add(1, "year").month(4).date(15), // May 15th next year
  ]);
  const [extractedClassName, setExtractedClassName] = useState<string>("");
  const [showDatePickers, setShowDatePickers] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exportMessage, setExportMessage] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    text: string;
    action?: {
      text: string;
      url: string;
    };
  } | null>(null);

  const [showColorSelection, setShowColorSelection] = useState(false);
  const [selectedColor, setSelectedColor] = useState("1");
  
  // ColorSelectionModal component
  const ColorSelectionModal = () => {
    if (!showColorSelection) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Choose Calendar Color
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            Select a color for your syllabus events in Google Calendar
          </p>
          <div className="grid grid-cols-4 gap-3 mb-6">
            {googleCalendarColors.map((colorOption) => (
              <button
                key={colorOption.id}
                onClick={() => setSelectedColor(colorOption.id)}
                className={`
                  w-12 h-12 rounded-lg border-2 transition-all duration-200 hover:scale-105
                  ${colorOption.color}
                  ${selectedColor === colorOption.id 
                    ? 'ring-2 ring-orange-500 ring-offset-2' 
                    : 'hover:ring-1 hover:ring-gray-300'
                  }
                `}
                title={colorOption.name}
              />
            ))}
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowColorSelection(false)}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={proceedWithGoogleExport}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              Export to Google Calendar
            </Button>
          </div>
        </div>
      </div>
    );
  };
  
  const removeExtractedDate = (id: string) => {
    setExtractedDates((prev) => prev.filter((event) => event.id !== id));
  };

  const resetUpload = () => {
    setFiles([]);
    setExtractedDates([]);
    setExtractedClassName(""); 
    setShowResults(false);
    setIsProcessing(false);
    setRecurringClassOptions([]);
    setShowRecurringSelection(false);
    setIsExportingToGoogle(false);
    setShowDatePickers(false);
    setSemesterDateRange([
      dayjs().month(7).date(15), // August 15th
      dayjs().add(1, "year").month(4).date(15), // May 15th next year
    ]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    // Check if user returned from Google auth with export intent
    const urlParams = new URLSearchParams(window.location.search);
    const shouldExport = urlParams.get('export');
    
    if (shouldExport === 'google' && extractedDates && extractedDates.length > 0) {
      // Remove the export parameter from URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('export');
      window.history.replaceState({}, '', newUrl.toString());
      
      // Automatically trigger export
      setTimeout(() => {
        exportToGoogleCalendar();
      }, 1000); // Small delay to ensure component is fully loaded
    }
  }, [extractedDates]);

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
      let className = ""; // Store the className from processing

      for (const uploadedFile of successfulFiles) {
        if (uploadedFile.file.type === "application/pdf") {
          const formData = new FormData();
          formData.append("file", uploadedFile.file);

          // Add semester dates if available and checkbox is checked
          if (showDatePickers && semesterDateRange) {
            formData.append(
              "semesterStart",
              semesterDateRange[0].toISOString(),
            );
            formData.append("semesterEnd", semesterDateRange[1].toISOString());
          }

          const response = await fetch("/api/process-pdf", {
            method: "POST",
            body: formData,
          });

          const contentType = response.headers.get("content-type") || "";
          if (!response.ok || !contentType.includes("application/json")) {
            const text = await response.text();
            console.error("Unexpected response:", text);
            throw new Error(
              `Unexpected response (${response.status}): ${text.slice(0, 200)}`,
            );
          }

          const result = await response.json();

          if (result.success && result.extractedDates) {
            // Store the className from the first processed file
            if (!className && result.className) {
              className = result.className;
            }

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

      // Store the className for later use
      setExtractedClassName(className);

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

  const ExportMessageComponent = () => {
    if (!exportMessage) return null;

    return (
      <div className={`p-4 rounded-lg border mb-4 ${
        exportMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' :
        exportMessage.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' :
        exportMessage.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
        'bg-blue-50 border-blue-200 text-blue-700'
      }`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {exportMessage.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
            {exportMessage.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
            {exportMessage.type === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-500" />}
            {exportMessage.type === 'info' && <Calendar className="w-5 h-5 text-blue-500" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{exportMessage.text}</p>
            {exportMessage.action && (
              <a
                href={exportMessage.action.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-sm underline hover:no-underline"
              >
                {exportMessage.action.text}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  const exportToGoogleCalendar = async () => {
    // Show color selection modal first
    setShowColorSelection(true);
  };

  const proceedWithGoogleExport = async () => {
  setShowColorSelection(false);
  setIsExportingToGoogle(true);
  
  try {
    const supabase = createClient();
    
    // Check if user is authenticated
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      setExportMessage({
        type: 'error',
        text: 'Please sign in to export to Google Calendar.'
      });
      setIsExportingToGoogle(false);
      return;
    }

    // Get user's stored tokens from database
    const { data: userData } = await supabase
      .from('users')
      .select('google_access_token, google_refresh_token')
      .eq('user_id', session.user.id)
      .single();

    // Try session token first, then database token
    let accessToken = session.provider_token || userData?.google_access_token;
    let refreshToken = userData?.google_refresh_token;

    if (!accessToken) {
      // No tokens available, need to authenticate
      setExportMessage({
        type: 'info',
        text: 'Connecting to Google Calendar...'
      });

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          scopes: [
            "https://www.googleapis.com/auth/calendar",
            "https://www.googleapis.com/auth/calendar.events", 
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile"
          ].join(" "),
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            include_granted_scopes: 'true'
          },
          redirectTo: `${window.location.origin}/auth/callback?redirect_to=${encodeURIComponent(window.location.pathname + '?export=google')}`,
        },
      });

      if (oauthError) {
        console.error("Error signing in with Google:", oauthError);
        setExportMessage({
          type: 'error',
          text: 'Failed to connect to Google Calendar. Please try again.'
        });
      }
      setIsExportingToGoogle(false);
      return;
    }

    // We have tokens, try to export
    setExportMessage({
      type: 'info',
      text: 'Creating calendar events...'
    });

    const apiEndpoint = '/.netlify/functions/export-google-calendar';


    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dates: extractedDates,
        accessToken: accessToken,
        refreshToken: refreshToken,
        colorId: selectedColor,
      }),
    });

    const result = await response.json();

    // Handle token refresh if new tokens were returned
    if (result.newAccessToken || result.newRefreshToken) {
      const updateData: any = {};
      if (result.newAccessToken) updateData.google_access_token = result.newAccessToken;
      if (result.newRefreshToken) updateData.google_refresh_token = result.newRefreshToken;
      
      await supabase
        .from('users')
        .update(updateData)
        .eq('user_id', session.user.id);
    }

    if (result.authError) {
      // All token refresh attempts failed, need re-authentication
      setExportMessage({
        type: 'info',
        text: 'Google Calendar access expired. Reconnecting...'
      });

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          scopes: [
            "https://www.googleapis.com/auth/calendar",
            "https://www.googleapis.com/auth/calendar.events",
            "https://www.googleapis.com/auth/userinfo.email", 
            "https://www.googleapis.com/auth/userinfo.profile"
          ].join(" "),
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            include_granted_scopes: 'true'
          },
          redirectTo: `${window.location.origin}/auth/callback?redirect_to=${encodeURIComponent(window.location.pathname + '?export=google')}`,
        },
      });

      if (oauthError) {
        console.error("Error re-authenticating with Google:", oauthError);
        setExportMessage({
          type: 'error',
          text: 'Failed to reconnect to Google Calendar. Please try again.'
        });
      }
      setIsExportingToGoogle(false);
      return;
    }

    if (result.success) {
      const successCount = result.createdEvents?.length || 0;
      const errorCount = result.errors?.length || 0;

      if (errorCount > 0) {
        setExportMessage({
          type: 'warning',
          text: `Successfully created ${successCount} events in Google Calendar! ${errorCount} events failed to create.`,
          action: {
            text: 'View Calendar',
            url: 'https://calendar.google.com'
          }
        });
      } else {
        setExportMessage({
          type: 'success',
          text: `Successfully created ${successCount} events in Google Calendar!`,
          action: {
            text: 'View Calendar',
            url: 'https://calendar.google.com'
          }
        });
      }
    } else {
      setExportMessage({
        type: 'error',
        text: result.error || 'Failed to create Google Calendar events.'
      });
    }
  } catch (error) {
    console.error("Error exporting to Google Calendar:", error);
    setExportMessage({
      type: 'error',
      text: 'Error exporting to Google Calendar. Please try again.'
    });
  } finally {
    setIsExportingToGoogle(false);
    setTimeout(() => setExportMessage(null), 8000);
  }
};
  
  const downloadICSFile = async () => {
    try {
      console.log("Downloading ICS with className:", extractedClassName); // Debug log
      
      const response = await fetch("/api/generate-ics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          dates: extractedDates,
          className: extractedClassName 
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        
        // The filename will now be set by the server based on className
        const contentDisposition = response.headers.get('content-disposition');
        const filenameMatch = contentDisposition?.match(/filename="([^"]+)"/);
        const filename = filenameMatch ? filenameMatch[1] : "syllabus-calendar.ics";
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert("Failed to generate ICS file");
      }
    } catch (error) {
      console.error("Error downloading ICS file:", error);
      alert("Error downloading ICS file");
    }
  };

  return (
    <>
      {/* Color Selection Modal */}
      <ColorSelectionModal />
      
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
        {/* Semester Date Pickers */}
        {showDatePickers && (
          <div className="mb-8">
            <Card className="shadow-lg border-0 border-orange-200">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-xl">
                <CardTitle className="text-xl flex items-center gap-2">
                  <CalendarIcon className="w-6 h-6" />
                  Semester Dates
                </CardTitle>
                <CardDescription className="text-orange-100">
                  Select your semester start and end dates to help AI better
                  understand recurring class schedules
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 bg-orange-50">
                <div className="flex flex-col items-center">
                  <div className="flex flex-col gap-2 w-full max-w-md">
                    <label className="text-sm font-medium text-orange-800 text-center">
                      Select Semester Date Range
                    </label>
                    <div className="bg-white border border-orange-300 rounded-lg p-4">
                      <DatePicker.RangePicker
                        value={semesterDateRange}
                        onChange={(dates) => {
                          if (dates && dates[0] && dates[1]) {
                            setSemesterDateRange([dates[0], dates[1]]);
                          }
                        }}
                        disabledDate={(current, { from }) => {
                          if (!from) return false;
                          // Disable dates that are before the start date
                          if (current && current.isBefore(from, "day")) {
                            return true;
                          }
                          // Disable dates that are in the same month as the start date
                          if (current && current.isSame(from, "month")) {
                            return true;
                          }
                          return false;
                        }}
                        format="MMMM DD, YYYY"
                        placeholder={["Start Date", "End Date"]}
                        size="large"
                        style={{
                          width: "100%",
                          borderColor: "#fb923c",
                        }}
                        className="antd-range-picker-orange"
                      />
                    </div>
                    <p className="text-xs text-orange-600 text-center mt-2">
                      The end date cannot be in the same month or before the
                      start date
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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

        {/* Semester Date Pickers Checkbox */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-start space-x-4">
              <div className="flex items-center mt-1">
                <input
                  type="checkbox"
                  id="showDatePickers"
                  checked={showDatePickers}
                  onChange={(e) => setShowDatePickers(e.target.checked)}
                  className="w-5 h-5 text-orange-600 bg-white border-2 border-orange-300 rounded-md focus:ring-orange-500 focus:ring-2 focus:ring-offset-0 transition-all duration-200 cursor-pointer"
                />
              </div>
              <div className="flex-1">
                <label
                  htmlFor="showDatePickers"
                  className="text-base font-semibold text-orange-900 cursor-pointer block mb-1"
                >
                  Set Custom Semester Dates
                </label>
                <p className="text-sm text-orange-700 leading-relaxed">
                  Optional: Help our AI better understand recurring class
                  schedules by specifying your semester start and end dates
                </p>
              </div>
            </div>
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
                </>
              )}
            </Button>
          </div>
        )}

        {/* Processing Loading Bar */}
        {isProcessing && (
          <div className="mb-12">
            <Card className="shadow-lg border-0 border-orange-200">
              <CardContent className="p-6 bg-orange-50">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-4">
                    <Loader2 className="w-8 h-8 mr-3 animate-spin text-orange-600" />
                    <h3 className="text-lg font-semibold text-orange-800">
                      Processing Your Syllabus
                    </h3>
                  </div>
                  <p className="text-orange-600 mb-4">
                    Our AI is extracting important dates and events from your
                    document...
                  </p>
                  <div className="w-full bg-orange-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full animate-pulse"
                      style={{ width: "70%" }}
                    ></div>
                  </div>
                  <p className="text-sm text-orange-500 mt-2">
                    This usually takes 10-30 seconds
                  </p>
                </div>
              </CardContent>
            </Card>
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
                  <CalendarIcon className="w-6 h-6" />
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
                    <CalendarIcon className="w-6 h-6" />
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
                              <h4 className="font-semibold text-gray-900">
                                {dateItem.title}
                              </h4>
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
                                {dateItem.date
                                  ? formatDate(dateItem.date)
                                  : dateItem.recurrence}
                              </p>
                              {dateItem.time && (
                                <span className="text-sm text-gray-500">
                                  at {dateItem.time}
                                </span>
                              )}
                            </div>
                            {dateItem.recurrence && dateItem.date && (
                              <p className="text-sm text-blue-600 mb-1">
                                {dateItem.recurrence}
                              </p>
                            )}
                            {dateItem.description && (
                              <p className="text-sm text-gray-600">
                                {dateItem.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Remove Button */}
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
                  
                  {/* Export Message Component - Place it here before export buttons */}
                  <ExportMessageComponent />
                  
                    <div className="mt-6 flex gap-3">
                      <Button
                        onClick={exportToGoogleCalendar}
                        disabled={isExportingToGoogle}
                        className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl flex items-center gap-2"
                      >
                        {isExportingToGoogle ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Exporting...
                          </>
                        ) : (
                          <>
                            <Calendar className="w-4 h-4" />
                            Export to Google Calendar
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={downloadICSFile}
                        className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl"
                      >
                        Download .ics File
                      </Button>
                      <Button
                        onClick={resetUpload}
                        variant="outline"
                        className="border-orange-500 text-orange-600 hover:bg-orange-50 rounded-xl"
                      >
                        Upload New Syllabus
                      </Button>
                    </div>
                </CardContent>
              </Card>
            </div>
          )}

        {/* How It Works & Supported Formats - Side by Side */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* How It Works */}
          <Card className="shadow-lg border-0 border-orange-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <CardHeader className="bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-t-xl">
              <CardTitle className="text-xl flex items-center gap-2">
                <CalendarIcon className="w-6 h-6" />
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
                <div className="mt-4 p-3 bg-orange-100 rounded-lg">
                  <p className="text-xs text-orange-700">
                    <strong>Maximum file size:</strong> 10MB per file
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ICS File Import Instructions */}
        <Card className="shadow-lg border-0 border-orange-200 hover:shadow-xl transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-t-xl">
            <CardTitle className="text-xl flex items-center gap-2">
              <CalendarIcon className="w-6 h-6" />
              How to Import Your Calendar
            </CardTitle>
            <CardDescription className="text-orange-100">
              Follow these steps to add your syllabus events to your calendar
              app
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 bg-orange-50">
            <div className="mb-6">
              <p className="text-gray-700 leading-relaxed">
                The downloaded .ics file is a standard calendar format that
                works with all major calendar applications. This file contains
                all your syllabus events and can be easily imported into your
                preferred calendar service.
              </p>
            </div>

            <Tabs defaultValue="google" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-orange-100">
                <TabsTrigger
                  value="google"
                  className="data-[state=active]:bg-white data-[state=active]:text-orange-600"
                >
                  Google Calendar
                </TabsTrigger>
                <TabsTrigger
                  value="outlook"
                  className="data-[state=active]:bg-white data-[state=active]:text-orange-600"
                >
                  Outlook
                </TabsTrigger>
              </TabsList>

              <TabsContent value="google" className="mt-4">
                <div className="bg-white rounded-lg p-4 border border-orange-200">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Import to Google Calendar
                  </h4>
                  <ol className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start space-x-2">
                      <span className="bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        1
                      </span>
                      <span>
                        Open{" "}
                        <a
                          href="https://calendar.google.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-600 hover:underline"
                        >
                          Google Calendar
                        </a>{" "}
                        in your web browser
                      </span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        2
                      </span>
                      <span>
                        Click the <strong>&quot;+&quot;</strong> button next to
                        &quot;Other calendars&quot; in the left sidebar
                      </span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        3
                      </span>
                      <span>
                        Select <strong>&quot;Import&quot;</strong> from the
                        dropdown menu
                      </span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        4
                      </span>
                      <span>
                        Click{" "}
                        <strong>
                          &quot;Select file from your computer&quot;
                        </strong>{" "}
                        and choose your downloaded .ics file
                      </span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        5
                      </span>
                      <span>
                        Choose which calendar to add the events to (or create a
                        new one)
                      </span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        6
                      </span>
                      <span>
                        Click <strong>&quot;Import&quot;</strong> to add all
                        your syllabus events
                      </span>
                    </li>
                  </ol>
                </div>
              </TabsContent>

              <TabsContent value="outlook" className="mt-4">
                <div className="bg-white rounded-lg p-4 border border-orange-200">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Import to Outlook
                  </h4>
                  <ol className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start space-x-2">
                      <span className="bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        1
                      </span>
                      <span>
                        Open{" "}
                        <a
                          href="https://outlook.live.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-600 hover:underline"
                        >
                          Outlook.com
                        </a>{" "}
                        or the Outlook desktop app
                      </span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        2
                      </span>
                      <span>Go to your Calendar view</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        3
                      </span>
                      <span>
                        Click <strong>&quot;Add calendar&quot;</strong> in the
                        left sidebar
                      </span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        4
                      </span>
                      <span>
                        Select <strong>&quot;Upload from file&quot;</strong>
                      </span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        5
                      </span>
                      <span>
                        Click <strong>&quot;Browse&quot;</strong> and select
                        your downloaded .ics file
                      </span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        6
                      </span>
                      <span>
                        Give your calendar a name (e.g., &quot;Course
                        Syllabus&quot;) and click{" "}
                        <strong>&quot;Import&quot;</strong>
                      </span>
                    </li>
                  </ol>
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-700">
                      <strong>Desktop App:</strong> In Outlook desktop, go to
                      File → Open & Export → Import/Export → Import an iCalendar
                      (.ics) file
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </>
  );
}