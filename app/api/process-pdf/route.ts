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
    
    return {
      className: className || "Unknown Course",
      events: Array.isArray(parsed.events) ? parsed.events : []
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

            **TIME EXTRACTION IS CRITICAL - HIGHEST PRIORITY:**
      - Always look for and include time information when available
      - Convert ALL times to HH:MM AM/PM format (e.g., "2:30 PM", "11:00 AM", "9:00 AM")
      - Look for time patterns like: "3:00-4:30", "from 2PM to 3PM", "at 11am", "noon", "midnight"
      - Convert 24-hour format to 12-hour (e.g., "14:30" → "2:30 PM")
      - Convert words: "noon" → "12:00 PM", "midnight" → "12:00 AM"
      - If class times are in headers, use them for all class-related events
      - Include time ranges when available (e.g., "2:00 PM - 3:30 PM")

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
        * Include times if mentioned (e.g., "MWF 3:00-4:30 PM")
        * If found with course title, prioritize just the code (e.g., "MIS 302" from "MIS 302 - Introduction to Information Systems")
        * Convert to uppercase department code (e.g., "mis 302" → "MIS 302")
      - Fallback: If no course code found, use the full course title from the header
      - If absolutely nothing clear is found, use "Unknown Course"
      

      Each event in the events array must include:
      - \`type\`: one of ["Assignment", "Exam", "Midterm", "Final", "Quiz", "Class", "Deadline", "Homework", "Lecture", "Section"]
      - \`title\`: a short title WITHOUT the class name prefix (e.g., "Midterm 1", "Homework 3", "Assignment 2") - the class name will be added automatically
      - \`date\`: in MM/DD/YYYY or Month Day, Year format (leave blank if using \`recurrence\`)
      - \`time\`: start time and end time in HH:MM AM/PM format (e.g., "12:00 PM – 1:00 PM") or leave blank if not applicable
      - \`location\`: if available (optional)
      - \`recurrence\`: if the event repeats regularly (e.g., "Every Monday, Wednesday, and Friday at 12:00 PM until May 2, 2025")

      Special Rules:
      - If the syllabus header or top section includes a class time and days of the week (e.g., "MWF 3:00–4:30"), extract it as a recurring class event:
        - Type: "Class"
        - Recurrence: Convert "MW" to "Every Monday and Wednesday", etc.
        - Time: Use the time from the header
        - Location: Use room name (e.g., "GSB 2.124")
      - If the syllabus does not contain class times, look through the text for any reccurring patterns (MWF, TTH) or mentions of class times and generate a "Class" event with the \`recurrence\` field.
      - If the syllabus mentions recurring quizzes, exams, or deadlines without individual dates but includes days of the week (monday, tuesday, wednesday, thursday, friday, saturday, sunday, MWF, TTH, MTWTHF), use the same approach and set appropriate \`recurrence\`. Include the time if applicable.
      - If the syllabus header or top section includes a class time and days of the week (e.g., "MWF 3:00–4:30"), treat that as a recurring class event from the first to last listed date (if available). If dates are missing, leave them blank and note that in the description.
      - If the first and last day of class are missing, leave \`recurrence\` empty but include a \`description\` saying: "Recurring pattern detected but start/end dates are missing."
      - If the syllabus mentions quizzes, exams, or assignments but does not provide individual dates or any days of the week, do not include them in the output.
      - Include homework or assignments if they appear in a schedule or table with a due date, even if titles are generic (e.g., "Homework 1"). Use the date from the schedule as the event date and infer the type as "Homework".
      - Do not include events classified as office hours or other non-academic events.
      - If the event is called "Section", "Class", "Lecture", or "Session", treat it as a recurring class event and include the time and recurrence if specified.
      - Do not inlude any schoolwide events, such as: Last day of official add/drop, Last day to change registration to or from pass/fail basis, or official enrollment count.
      - If the syllabus includes abbreviations like "TBA" (To Be Announced) or "TBD" (To Be Determined), treat them as missing information and do not include those events.
      - If the syllabus mentions a specific date range for classes, use that to determine the start and end dates for recurring events.
      - If the syllabus includes abbreviations like "MWF" (Monday, Wednesday, Friday) or "TTH" (Tuesday, Thursday), use those to determine the recurrence pattern.
      - If the syllabus mentions a specific time for an event, include that time in the \`time\` field.
      - If the syllabus mentions a specific location for an event, include that location in the \`location\` field.
      - If the syllabus mentions a description for an event, include that description in the \`description\` field.
      - If the syllabus is too short or does not contain enough information, return an empty events array but still try to extract the class name.
      - If the event includes a time, it should be in HH:MM AM/PM format. Convert any 24-hour times to this format. Convert words like "noon" or "midnight" to "12:00 PM" or "12:00 AM" respectively.
      - If the syllabus mentions a final exam date, include it as a "Final" type event.
      - If the syllabus mentions a midterm exam date, include it as a "Midterm" type event.
      - If the event states that it will happen "every week" or "weekly", set the recurrence to "Weekly" and include the day of the week if specified. If no day is specified, omit the recurrence and omit from the output.
      - If the event states that it will happen during class time, set the time to the class time. For example, if the syllabus states that 'Exam 1 will be held during class time', set the time to the class time specified in the syllabus.
      - If the AI does not find any academic events, return an empty events array.
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
        time: item.time || "",
        recurrence: item.recurrence || "",
        location: item.location || "",
        description: item.description || "",
      };
    });

    if (validatedDates.length === 0) {
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
      extractedDates: validatedDates,
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