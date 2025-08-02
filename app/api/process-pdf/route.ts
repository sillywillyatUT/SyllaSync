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
      You are an academic assistant helping students organize their semester. Given the text of a college course syllabus, extract all important **academic events** and return them as a valid JSON array.

      Each event must include:
      - \`type\`: one of ["Assignment", "Exam", "Midterm", "Final", "Quiz", "Class", "Deadline", "Holiday"]
      - \`title\`: a short title (e.g., "Midterm 1" or "Weekly Lecture")
      - \`date\`: in MM/DD/YYYY or Month Day, Year format (leave blank if using \`recurrence\`)
      - \`time\`: start time (optional)
      - \`location\`: if available (optional)
      - \`recurrence\`: if the event repeats regularly (e.g., "Every Monday, Wednesday, and Friday at 12:00 PM until May 2, 2025")

      Special Rules:
      - If the syllabus describes a recurring class schedule (e.g., "MWF 12:00 PM – 12:50 PM") **and** the first/last day of class are available, generate a recurring "Class" event using the \`recurrence\` field.
      - If the syllabus mentions recurring quizzes, exams, or deadlines without individual dates, use the same approach and set appropriate \`recurrence\`.
      - If the first and last day of class are missing, leave \`recurrence\` empty but include a \`description\` saying: "Recurring pattern detected but start/end dates are missing."
      - Do NOT include assignments, quizzes, or events unless they are explicitly mentioned or have a clear recurrence pattern.
      - Omit any events without dates or patterns entirely.

      Syllabus text:
      ${extractedText.substring(0, 1000000)}
      `;


    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that extracts dates from academic syllabi. Always respond with valid JSON arrays.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama3-8b-8192',
      temperature: 0.1,
      max_tokens: 1000,
    });

    const aiResponse = completion.choices[0]?.message?.content;

    if (!aiResponse) {
      return NextResponse.json({ error: 'Failed to process with AI' }, { status: 500 });
    }

    // Try to parse the JSON response
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

    // Just lightly map for IDs and UI consistency
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
