import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

// Import pdf-parse with error handling
let pdfParse: any;
try {
  pdfParse = require('pdf-parse');
} catch (error) {
  console.error('Failed to load pdf-parse:', error);
}

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check if it's a PDF file
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Check if pdf-parse is available
    if (!pdfParse) {
      return NextResponse.json(
        { error: 'PDF processing library not available' },
        { status: 500 }
      );
    }

    // Extract text from PDF using pdf-parse
    const pdfData = await pdfParse(buffer);
    const extractedText = pdfData.text;

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Could not extract text from PDF' },
        { status: 400 }
      );
    }

    // Use Groq to extract dates and important information
    const prompt = `
      You are an academic assistant helping students organize their semester. Given the text of a college course syllabus, extract all important **academic dates**. Include:

      - \`type\`: one of ["Assignment", "Exam", "Midterm", "Final", "Quiz", "Class", "Deadline", "Holiday"]
      - \`title\`: a short description (e.g., "Midterm 1" or "Assignment 3 due")
      - \`date\`: in MM/DD/YYYY or Month Day, Year format
      - \`time\`: if available (optional)
      - \`location\`: if available (optional)
      - \`recurrence\`: if the event repeats. Use this format:
        - "Every [Day(s)] until [End Date]", e.g., "Every Monday and Wednesday until May 3, 2025"

      Special Instructions:
      - If the syllabus includes a weekly class schedule (e.g., "MWF 12:00 PM – 1:00 PM"), and also includes the first and last day of class, include the class as a recurring event using the \`recurrence\` field.
      - If the syllabus describes recurring classes but does **not** provide start or end dates, set \`recurrence\` to an empty string and leave a note in the description.

      Only include events with specific, extractable dates. Return the result as a valid JSON array.
      Syllabus text:
    ${extractedText.substring(0, 8000)}
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
      return NextResponse.json(
        { error: 'Failed to process with AI' },
        { status: 500 }
      );
    }

    // Parse the AI response
    let extractedDates;
    try {
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        extractedDates = JSON.parse(jsonMatch[0]);
      } else {
        extractedDates = JSON.parse(aiResponse);
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.error('AI Response:', aiResponse);

      extractedDates = [
        {
          title: "Syllabus Processing Complete",
          date: new Date().toISOString().split('T')[0],
          type: "deadline",
          description: "Please review the extracted dates manually as AI parsing encountered an issue."
        }
      ];
    }

    // Validate and clean the extracted dates
    const allowedTypes = [
      "Assignment", "Exam", "Midterm", "Final", "Quiz", "Class", "Deadline", "Holiday"
    ];

    const validatedDates = extractedDates
      .filter((item: any) =>
        item &&
        item.title &&
        item.date &&
        item.type &&
        allowedTypes.includes(item.type)
      )
      .map((item: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        title: item.title,
        date: item.date,
        type: item.type.toLowerCase(),
        time: item.time || '',
        recurrence: item.recurrence || '',
        description: item.description || ''
      }));

    // If no valid academic events were found
    if (validatedDates.length === 0) {
      return NextResponse.json(
        {
          error: "This file does not appear to be a syllabus. No academic dates (assignments, exams, deadlines) were found.",
          extractedDates: [],
          processedText: extractedText.substring(0, 500) + '...'
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      extractedDates: validatedDates,
      textLength: extractedText.length,
      processedText: extractedText.substring(0, 500) + '...'
    });

  } catch (error) {
    console.error('Error processing PDF:', error);
    return NextResponse.json(
      { error: 'Failed to process PDF' },
      { status: 500 }
    );
  }
}
