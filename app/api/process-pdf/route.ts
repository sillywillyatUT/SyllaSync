import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

let pdfParse: any;
try {
  pdfParse = require('pdf-parse');
} catch (error) {
  console.error('Failed to load pdf-parse:', error);
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (!pdfParse) {
      return NextResponse.json({ error: 'PDF processing library not available' }, { status: 500 });
    }

    const pdfData = await pdfParse(buffer);
    const extractedText = pdfData.text;

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json({ error: 'Could not extract text from PDF' }, { status: 400 });
    }

    const prompt = `
      You are an academic assistant helping students organize their semester. Given the text of a college course or school syllabus, extract all important **academic events** and 
      **recurring class times (example formats: (MWF, meaning every Monday, Wednesday, and Friday), (TTH, meaning every Tuesday, Thursday), etc.) ** and return them as a valid JSON array.

      Each event must include:
      - \`type\`: one of ["Assignment", "Exam", "Midterm", "Final", "Quiz", "Class", "Deadline", "Holiday"]
      - \`title\`: a short title (e.g., "Midterm 1" or "Weekly Lecture")
      - \`date\`: in MM/DD/YYYY or Month Day, Year format (leave blank if using \`recurrence\`)
      - \`time\`: start time and end time in HH:MM AM/PM format (e.g., "12:00 PM – 1:00 PM") or leave blank if not applicable
      - \`location\`: if available (optional)
      - \`recurrence\`: if the event repeats regularly (e.g., "Every Monday, Wednesday, and Friday at 12:00 PM until May 2, 2025")

      Special Rules:
      - If the syllabus describes a recurring class schedule (e.g., "MWF 12:00 PM – 12:50 PM") **and** the first/last day of class are available, generate a recurring "Class" event using the \`recurrence\` field.

      - If the syllabus mentions recurring quizzes, exams, or deadlines without individual dates but includes days of the week (monday, tuesday, wednesday, thursday, friday, saturday, sunday, MWF, TTH, MTWTHF), use the same approach and set appropriate \`recurrence\`. Include the time if applicable.
      - If the first and last day of class are missing, leave \`recurrence\` empty but include a \`description\` saying: "Recurring pattern detected but start/end dates are missing."
      - If the syllabus mentions quizzes, exams, or assignments but does not provide individual dates or any days of the week, do not include them in the output.
      - Do NOT include assignments, quizzes, or events unless they are explicitly mentioned or have a clear recurrence pattern.
      - Do not include events classified as office hours or other non-academic events.
      - Do not inlude any schoolwide events, such as: Last day of official add/drop, Last day to change registration to or from pass/fail basis, or official enrollment count.
      - If the syllabus includes abbreviations like "TBA" (To Be Announced) or "TBD" (To Be Determined), treat them as missing information and do not include those events.
      - If the syllabus mentions a specific date range for classes, use that to determine the start and end dates for recurring events.
      - If the syllabus includes abbreviations like "MWF" (Monday, Wednesday, Friday) or "TTH" (Tuesday, Thursday), use those to determine the recurrence pattern.
      - If the syllabus mentions a specific time for an event, include that time in the \`time\` field.
      - If the syllabus mentions a specific location for an event, include that location in the \`location\` field.
      - If the syllabus mentions a description for an event, include that description in the \`description\` field.
      - If the AI does not find any academic events, return an empty array.
      - If the syllabus is too short or does not contain enough information, return an empty array.
      - If the event includes a time, it should be in HH:MM AM/PM format. Convert any 24-hour times to this format. Convert words like "noon" or "midnight" to "12:00 PM" or "12:00 AM" respectively.
      - If the syllabus mentions a final exam date, include it as a "Final" type event.
      - If the syllabus mentions a midterm exam date, include it as a "Midterm" type event.
      - If the event states that it will happen "every week" or "weekly", set the recurrence to "Weekly" and include the day of the week if specified. If no day is specified, omit the recurrence and omit from the output.
      - If the event states that it will happen during class time, set the time to the class time. For example, if the syllabus states that 'Exam 1 will be held during class time', set the time to the class time specified in the syllabus.

      Syllabus text:
      ${extractedText.substring(0, 1000000)}
    `;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that extracts dates from academic syllabi. Always respond with valid JSON arrays."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0,
      max_completion_tokens: 4000,
      top_p: 1,
      stream: false,
      response_format: { type: "json_object" },
      stop: null,
    });

    const aiResponse = completion.choices[0]?.message?.content;

    if (!aiResponse) {
      return NextResponse.json({ error: 'Failed to process with AI' }, { status: 500 });
    }

    let parsedDates;
    try {
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      parsedDates = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiResponse);
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.error('AI Response:', aiResponse);

      return NextResponse.json({
        error: "AI returned invalid JSON. Please check the file and try again.",
        extractedDates: [],
        rawOutput: aiResponse,
        processedText: extractedText.substring(0, 500) + '...',
      }, { status: 400 });
    }

    const validatedDates = parsedDates.map((item: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      title: item.title,
      date: item.date,
      type: item.type?.toLowerCase() || '',
      time: item.time || '',
      recurrence: item.recurrence || '',
      location: item.location || '',
      description: item.description || ''
    }));

    if (validatedDates.length === 0) {
      return NextResponse.json({
        warning: "No academic dates were extracted. Make sure this is a valid syllabus.",
        extractedDates: [],
        processedText: extractedText.substring(0, 500) + '...',
      }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      extractedDates: validatedDates,
      textLength: extractedText.length,
      processedText: extractedText.substring(0, 500) + '...'
    });

  } catch (error) {
    console.error('Error processing PDF:', error);
    return NextResponse.json({ error: 'Failed to process PDF' }, { status: 500 });
  }
}
