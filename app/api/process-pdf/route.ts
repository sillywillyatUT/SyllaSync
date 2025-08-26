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
        "You are a helpful assistant that extracts important dates and events from academic syllabi. Always respond with valid JSON arrays.",
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
      You are an academic assistant helping students organize their semester. Given the text of a college course or school syllabus, extract all important **academic events** and 
      **recurring class times (example formats: (MWF, meaning every Monday, Wednesday, and Friday), (TTH, meaning every Tuesday, Thursday), etc.) ** and return them as a valid JSON array.${schoolYearInfo}

      Each event must include:
      - \`type\`: one of ["Assignment", "Exam", "Midterm", "Final", "Quiz", "Class", "Deadline", "Homework", "Lecture", "Section"]
      - \`title\`: a short title (e.g., "Midterm 1" or "Section ____")
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
      - If the syllabus is too short or does not contain enough information, return an empty array.
      - If the event includes a time, it should be in HH:MM AM/PM format. Convert any 24-hour times to this format. Convert words like "noon" or "midnight" to "12:00 PM" or "12:00 AM" respectively.
      - If the syllabus mentions a final exam date, include it as a "Final" type event.
      - If the syllabus mentions a midterm exam date, include it as a "Midterm" type event.
      - If the event states that it will happen "every week" or "weekly", set the recurrence to "Weekly" and include the day of the week if specified. If no day is specified, omit the recurrence and omit from the output.
      - If the event states that it will happen during class time, set the time to the class time. For example, if the syllabus states that 'Exam 1 will be held during class time', set the time to the class time specified in the syllabus.
      - If the AI does not find any academic events, return an empty array.
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

        return completion.choices[0]?.message?.content || "[]";
      } catch (groqError) {
        console.error("Groq API error:", groqError);
        throw new Error("Failed to process text with AI");
      }
    };

    let response1 = "[]";
    let response2 = "[]";

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

    const extractArray = (response: string): any[] => {
      try {
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(response);
      } catch (parseError) {
        console.error("JSON parsing error:", parseError, "Response:", response);
        return [];
      }
    };

    const allDates = [...extractArray(response1), ...extractArray(response2)];

    const validatedDates = allDates.map((item: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      title: item.title || "Untitled Event",
      date: item.date || "",
      type: item.type?.toLowerCase() || "event",
      time: item.time || "",
      recurrence: item.recurrence || "",
      location: item.location || "",
      description: item.description || "",
    }));

    if (validatedDates.length === 0) {
      return NextResponse.json(
        {
          warning:
            "No academic dates were extracted. Make sure this is a valid syllabus.",
          extractedDates: [],
          processedText: extractedText.substring(0, 500) + "...",
        },
        { status: 200 },
      );
    }

    return NextResponse.json({
      success: true,
      extractedDates: validatedDates,
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