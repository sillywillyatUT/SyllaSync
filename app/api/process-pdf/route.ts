import { NextRequest, NextResponse } from "next/server";
import { Groq } from "groq-sdk";
import { ChatCompletionSystemMessageParam } from "groq-sdk/resources/chat/completions";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// PDF.js serverless extraction function
async function extractTextWithPDFJS(buffer: Buffer): Promise<string> {
  try {
    // Import pdfjs-serverless instead of the legacy build
    const { getDocument } = await import('pdfjs-serverless');
    
    // Load the PDF document
    const loadingTask = getDocument({ data: new Uint8Array(buffer) });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    // Extract text from each page (limit to 50 pages for performance)
    const maxPages = Math.min(pdf.numPages, 50);
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Reconstruct text with proper spacing
      const pageText = textContent.items
        .map((item: any) => {
          // Handle both TextItem and TextMarkedContent
          return 'str' in item ? item.str : '';
        })
        .filter(str => str.trim()) // Remove empty strings
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (pageText.length > 0) {
        fullText += pageText + '\n';
      }
    }
    
    return fullText.trim();
    
  } catch (error) {
    console.error('PDF.js extraction error:', error);
    throw new Error('Failed to extract text using PDF.js');
  }
}

// Time standardization function - converts to 12-hour format for Google Calendar compatibility
function standardizeTime(timeStr: string): string {
  if (!timeStr || timeStr.trim() === '') return '';
  
  let cleaned = timeStr.trim().toLowerCase();
  
  // Convert common words to times
  cleaned = cleaned.replace(/\bnoon\b/g, '12:00 pm');
  cleaned = cleaned.replace(/\bmidnight\b/g, '12:00 am');
  
  // Fix spacing issues
  cleaned = cleaned.replace(/(\d)(am|pm)/g, '$1 $2');
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  // Helper function to convert 24-hour to 12-hour
  function convertTo12Hour(timeStr: string): string {
    // Handle 24-hour format (HH:MM)
    const twentyFourMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (twentyFourMatch) {
      const hours = parseInt(twentyFourMatch[1]);
      const minutes = twentyFourMatch[2];
      
      if (hours === 0) return `12:${minutes} AM`;
      if (hours < 12) return `${hours}:${minutes} AM`;
      if (hours === 12) return `12:${minutes} PM`;
      return `${hours - 12}:${minutes} PM`;
    }
    
    // Handle 12-hour format with AM/PM
    const twelveHourMatch = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/);
    if (twelveHourMatch) {
      const hours = twelveHourMatch[1];
      const minutes = twelveHourMatch[2] || '00';
      const period = twelveHourMatch[3].toUpperCase();
      
      return `${hours}:${minutes} ${period}`;
    }
    
    return '';
  }
  
  // Check for time ranges first
  const rangePatterns = [
    /(\d{1,2}:?\d{0,2}\s*(?:am|pm)?)\s*[-–—to]\s*(\d{1,2}:?\d{0,2}\s*(?:am|pm)?)/,
    /(\d{1,2})\s*[-–—to]\s*(\d{1,2})\s*(am|pm)/,
    /(\d{1,2}):(\d{2})\s*[-–—to]\s*(\d{1,2}):(\d{2})/
  ];
  
  for (const pattern of rangePatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      let startTime = match[1].trim();
      let endTime = match[2].trim();
      
      // Handle cases where only end time has AM/PM (e.g., "3-5 PM")
      if (match[3] && !startTime.includes('am') && !startTime.includes('pm') && !endTime.includes('am') && !endTime.includes('pm')) {
        endTime = endTime + ' ' + match[3];
        
        // Infer start time period
        const startHour = parseInt(startTime.split(':')[0]);
        const endHour = parseInt(endTime.split(':')[0]);
        
        if (match[3] === 'pm') {
          if (startHour <= endHour && startHour >= 1) {
            startTime = startTime + ' pm';
          } else if (startHour > endHour) {
            startTime = startTime + ' am'; // Crossing noon boundary
          } else {
            startTime = startTime + ' pm'; // Default to PM for academic times
          }
        } else { // AM
          startTime = startTime + ' am';
        }
      }
      
      // Handle cases where neither time has AM/PM
      if (!startTime.includes('am') && !startTime.includes('pm') && !endTime.includes('am') && !endTime.includes('pm')) {
        // Check if times look like 24-hour format
        const startHour = parseInt(startTime.split(':')[0]);
        const endHour = parseInt(endTime.split(':')[0]);
        
        if (startHour >= 0 && startHour <= 23 && endHour >= 0 && endHour <= 23) {
          // Convert 24-hour to 12-hour
          if (!startTime.includes(':')) startTime = startTime + ':00';
          if (!endTime.includes(':')) endTime = endTime + ':00';
          
          const start12 = convertTo12Hour(startTime);
          const end12 = convertTo12Hour(endTime);
          
          if (start12 && end12) {
            return `${start12} - ${end12}`;
          }
        } else {
          // Assume PM for academic times
          startTime = startTime + ' pm';
          endTime = endTime + ' pm';
        }
      }
      
      // Standardize both times to 12-hour format
      const start12 = convertTo12Hour(startTime);
      const end12 = convertTo12Hour(endTime);
      
      if (start12 && end12) {
        return `${start12} - ${end12}`;
      }
    }
  }
  
  // Handle single times
  const singleMatch = cleaned.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/);
  if (singleMatch) {
    let timeStr = singleMatch[0];
    
    // Add period if missing (default to PM for academic times)
    if (!timeStr.includes('am') && !timeStr.includes('pm')) {
      const hour = parseInt(singleMatch[1]);
      
      // Check if it's 24-hour format first
      if (hour >= 0 && hour <= 23) {
        const minutes = singleMatch[2] || '00';
        const single12 = convertTo12Hour(`${hour}:${minutes}`);
        if (single12) {
          // Add 1 hour duration
          const endHour = (hour + 1) % 24;
          const end12 = convertTo12Hour(`${endHour}:${minutes}`);
          return `${single12} - ${end12}`;
        }
      }
      
      // Academic heuristics for 12-hour format
      if (hour >= 1 && hour <= 7) {
        timeStr += ' pm';
      } else if (hour === 12) {
        timeStr += ' pm'; // Assume noon
      } else if (hour >= 8 && hour <= 11) {
        timeStr += ' pm'; // Default to PM for college classes
      } else {
        timeStr += ' am';
      }
    }
    
    const single12 = convertTo12Hour(timeStr);
    if (single12) {
      // For single times, add 1 hour duration
      const hourMatch = single12.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/);
      if (hourMatch) {
        let hours = parseInt(hourMatch[1]);
        const minutes = hourMatch[2];
        const period = hourMatch[3];
        
        // Add 1 hour
        if (period === 'AM' && hours === 12) {
          hours = 1;
        } else if (period === 'AM' && hours < 12) {
          hours += 1;
          if (hours === 12) {
            return `${single12} - 12:${minutes} PM`;
          }
        } else if (period === 'PM' && hours === 12) {
          hours = 1;
          return `${single12} - 1:${minutes} PM`;
        } else if (period === 'PM' && hours < 12) {
          hours += 1;
        }
        
        const endPeriod = (period === 'AM' && hours >= 12) ? 'PM' : period;
        const displayHours = hours > 12 ? hours - 12 : hours;
        
        return `${single12} - ${displayHours}:${minutes} ${endPeriod}`;
      }
    }
  }
  
  // If we can't parse it, return empty
  console.warn(`Could not parse time: "${timeStr}"`);
  return '';
}

// Date validation function
function validateDate(dateStr: string): string {
  if (!dateStr || dateStr.trim() === '') return '';
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    
    // Return in YYYY-MM-DD format for consistency
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}

// Enhanced data validation and title formatting
const extractData = (response: string): { className: string; events: any[] } => {
  try {
    const parsed = JSON.parse(response);
    let className = parsed.className || "";
    
    // Clean and validate class name
    if (className) {
      // Remove common prefixes and clean up
      className = className
        .replace(/^(Course|Class):\s*/i, '')
        .replace(/^\d+\.\s*/, '') // Remove leading numbers like "1. "
        .trim()
        .toUpperCase();
      
      // Validate it looks like a course code (DEPT + number)
      const courseCodePattern = /^[A-Z]{2,4}\s*-?\s*\d{3,4}[A-Z]?/;
      if (!courseCodePattern.test(className)) {
        // If it doesn't match expected pattern, try to extract from the beginning
        const match = className.match(/([A-Z]{2,4}\s*-?\s*\d{3,4}[A-Z]?)/);
        if (match) {
          className = match[1].replace(/-/g, ' ').replace(/\s+/g, ' ');
        }
      } else {
        // Standardize format: remove hyphens, normalize spaces
        className = className.replace(/-/g, ' ').replace(/\s+/g, ' ');
      }
    }
    
    // Validate and standardize events
    const validatedEvents = (parsed.events || []).map((event: any) => {
      return {
        ...event,
        time: standardizeTime(event.time || ''), // Apply time standardization here
        date: validateDate(event.date || ''),
        type: event.type || 'event',
        title: event.title || 'Untitled Event'
      };
    }).filter((event: any) => {
      // Only include events with valid dates or recurrence patterns
      return event.date || event.recurrence;
    });
    
    return {
      className: className || "Unknown Course",
      events: validatedEvents
    };
  } catch (parseError) {
    console.error("JSON parsing error:", parseError, "Response:", response);
    return { className: "Unknown Course", events: [] };
  }
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const schoolYearStart = formData.get("schoolYearStart") as string;
    const schoolYearEnd = formData.get("schoolYearEnd") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "File must be a PDF" },
        { status: 400 },
      );
    }

    // Add file size check for serverless limits
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB" },
        { status: 413 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let extractedText = "";
    try {
      // Use pdfjs-serverless instead of legacy pdf.js
      extractedText = await extractTextWithPDFJS(buffer);
    } catch (pdfError) {
      console.error("PDF parsing error:", pdfError);
      return NextResponse.json(
        { 
          error: "Failed to parse PDF. The file may be corrupted, password-protected, or contain only images.",
          details: pdfError instanceof Error ? pdfError.message : "Unknown PDF error"
        },
        { status: 500 }
      );
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        { error: "Could not extract text from PDF. The PDF may contain only images or be empty." },
        { status: 400 },
      );
    }

    const systemMessage: ChatCompletionSystemMessageParam = {
      role: "system",
      content:
        "You are a helpful assistant that extracts important dates and events from academic syllabi. Always respond with valid JSON objects containing both className and events array. Focus on extracting clear class IDs from the first few lines of the syllabus.",
    };

    let schoolYearInfo = "";
    if (schoolYearStart && schoolYearEnd) {
      const startDate = new Date(schoolYearStart).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const endDate = new Date(schoolYearEnd).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      schoolYearInfo = `\n\nIMPORTANT: The school year runs from ${startDate} to ${endDate}. Use these dates to determine when recurring classes should start and end. For recurring events, include "until ${endDate}" in the recurrence field.`;
    }

    const basePrompt = `
      You are an academic assistant helping students organize their semester. Given the text of a college course or school syllabus, extract the class name and all important **academic events** and 
      **recurring class times (example formats: (MWF, meaning every Monday, Wednesday, Friday), (TTH, meaning every Tuesday, Thursday), etc.) ** and return them as a valid JSON object.${schoolYearInfo}

      Your response must be a JSON object with this structure:
      {
        "className": "extracted class name and number (e.g., 'SDS 321', 'MATH 101', 'ENG 304')",
        "events": [array of events]
      }

      **TIME EXTRACTION IS CRITICAL - RETURN IN 12-HOUR FORMAT:**
      - Always extract time information when available
      - Return times in 12-hour format: "2:30 PM - 4:00 PM" (not 24-hour format)
      - For single times, include as single time: "2:30 PM" (duration will be added automatically)
      - Look for time patterns like: "3:00-4:30", "from 2PM to 3PM", "at 11am", "noon", "midnight"
      - Convert 24-hour to 12-hour: "14:30" → "2:30 PM", "09:00" → "9:00 AM"
      - Convert words: "noon" → "12:00 PM", "midnight" → "12:00 AM"
      - If class times are in headers, use them for all class-related events
      - Include time ranges when available (e.g., "2:00 PM - 3:30 PM")
      - Use proper formatting: "H:MM AM/PM" or "HH:MM AM/PM"

      Class Name Extraction Rules (PRIORITY - Extract from first 3 lines):
      - **FIRST PRIORITY**: Look for course codes in the very first line or header (e.g., "MIS 302", "SDS 321", "MATH 2304", "CS 101")
      - **SECOND PRIORITY**: Check the first 2-3 lines for patterns like "Department ### - Course Name" 
      - **THIRD PRIORITY**: Look for course identifiers in format: DEPT + Number (2-4 digits)
      - Common patterns to match:
        * "MIS 302" or "MIS-302" 
        * "SDS 321" or "SDS-321"
        * "MATH 2304" or "MATH-2304"
        * "CS 101" or "CS-101"
        * "BIO 1406" or "BIO-1406"
        * "ENG 304K" or "ENG-304K" (with letter suffix)
      - Clean extraction rules:
        * Remove extra whitespace and standardize format (e.g., "MIS 302")
        * If found with course title, prioritize just the code (e.g., "MIS 302" from "MIS 302 - Introduction to Information Systems")
        * Convert to uppercase department code (e.g., "mis 302" → "MIS 302")
      - Fallback: If no course code found, use the full course title from the header
      - If absolutely nothing clear is found, use "Unknown Course"

      Each event in the events array must include:
      - \`type\`: one of ["Assignment", "Exam", "Midterm", "Final", "Quiz", "Class", "Deadline", "Homework", "Lecture", "Section"]
      - \`title\`: a short title WITHOUT the class name prefix (e.g., "Midterm 1", "Homework 3", "Assignment 2") - the class name will be added automatically
      - \`date\`: in YYYY-MM-DD format (leave blank if using \`recurrence\`)
      - \`time\`: in 12-hour format H:MM AM/PM or H:MM AM/PM - H:MM AM/PM (e.g., "12:00 PM - 1:00 PM" or "2:30 PM")
      - \`location\`: if available (optional)
      - \`recurrence\`: if the event repeats regularly (e.g., "Every Monday, Wednesday, and Friday until May 2, 2025")

      Special Rules:
      - If the syllabus header or top section includes a class time and days of the week (e.g., "MWF 3:00–4:30"), extract it as a recurring class event:
        - Type: "Class"
        - Recurrence: Convert "MWF" to "Every Monday, Wednesday, and Friday", etc.
        - Time: Use exact time from header in 12-hour format (e.g., "3:00 PM - 4:30 PM")
        - Location: Use room name (e.g., "GSB 2.124")
      - Include homework or assignments if they appear in a schedule or table with a due date
      - Do not include events classified as office hours or other non-academic events
      - Do not include any schoolwide events, such as: Last day of official add/drop, Last day to change registration
      - If the syllabus includes abbreviations like "TBA" (To Be Announced) or "TBD" (To Be Determined), treat them as missing information and do not include those events
      - If the syllabus is too short or does not contain enough information, return an empty events array but still try to extract the class name
      - If the AI does not find any academic events, return an empty events array
      - If an event mentions "during class time", use the class meeting time from the header
    `;

    const part1 = extractedText.substring(0, 15000);
    const part2 = extractedText.substring(15000, 30000);

    const runPrompt = async (part: string) => {
      try {
        const completion = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            systemMessage,
            {
              role: "user",
              content: `${basePrompt}\nSyllabus text:\n${part}`,
            },
          ],
          temperature: 0,
          max_completion_tokens: 5000,
          top_p: 1,
          stream: false,
          response_format: { type: "json_object" },
          stop: null,
        });

        return completion.choices[0]?.message?.content || '{"className": "", "events": []}';
      } catch (groqError) {
        console.error("Groq API error:", groqError);
        throw new Error("Failed to process text with AI");
      }
    };

    let response1 = '{"className": "", "events": []}';
    let response2 = '{"className": "", "events": []}';

    try {
      [response1, response2] = await Promise.all([
        runPrompt(part1),
        runPrompt(part2),
      ]);
    } catch (aiError) {
      console.error("AI processing error:", aiError);
      return NextResponse.json(
        { error: "Failed to analyze syllabus content" },
        { status: 500 }
      );
    }

    const data1 = extractData(response1);
    const data2 = extractData(response2);

    // Use the class name from whichever response has it, preferring the first part
    // Also prefer the one that looks more like a course code
    const className1 = data1.className;
    const className2 = data2.className;

    let finalClassName = "Unknown Course";
    if (className1 !== "Unknown Course" && className2 !== "Unknown Course") {
      // Both have class names, prefer the one that looks more like a course code
      const courseCodePattern = /^[A-Z]{2,4}\s+\d{3,4}[A-Z]?$/;
      if (courseCodePattern.test(className1)) {
        finalClassName = className1;
      } else if (courseCodePattern.test(className2)) {
        finalClassName = className2;
      } else {
        finalClassName = className1; // Default to first
      }
    } else {
      finalClassName = className1 !== "Unknown Course" ? className1 : className2;
    }

    const allEvents = [...data1.events, ...data2.events];

    const validatedDates = allEvents.map((item: any) => {
      // Clean the event title to avoid double class names
      let eventTitle = item.title || "Untitled Event";
      
      // Remove class name if it's already in the title to avoid duplication
      if (finalClassName !== "Unknown Course" && eventTitle.includes(finalClassName)) {
        eventTitle = eventTitle.replace(new RegExp(`^${finalClassName}\\s*-?\\s*`, 'i'), '').trim();
      }
      
      // Ensure we don't have empty titles after cleaning
      if (!eventTitle || eventTitle.length === 0) {
        eventTitle = "Untitled Event";
      }
      
      return {
        id: Math.random().toString(36).substr(2, 9),
        title: `${finalClassName} - ${eventTitle}`, // Clean format: "MIS 302 - Homework 1"
        date: item.date || "",
        type: item.type?.toLowerCase() || "event",
        time: standardizeTime(item.time || ""), // Apply time standardization
        recurrence: item.recurrence || "",
        location: item.location || "",
        description: item.description || "",
      };
    });

    // Filter out events with invalid dates (unless they have recurrence)
    const finalEvents = validatedDates.filter(event => 
      event.date || event.recurrence
    );

    if (finalEvents.length === 0) {
      return NextResponse.json(
        {
          warning:
            "No academic dates were extracted. Make sure this is a valid syllabus.",
          extractedDates: [],
          className: finalClassName,
          processedText: extractedText.substring(0, 500) + "...",
        },
        { status: 200 },
      );
    }

    return NextResponse.json({
      success: true,
      extractedDates: finalEvents,
      className: finalClassName,
      textLength: extractedText.length,
      processedText: extractedText.substring(0, 500) + "...",
    });
  } catch (error) {
    console.error("Error processing PDF:", error);
    return NextResponse.json(
      { 
        error: "Failed to process PDF",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 },
    );
  }
}