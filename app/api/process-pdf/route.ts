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
    - \`recurrence\`: if the event repeats (e.g., "weekly starting January 26, 2025") (optional)

    Also include:
    - The first and last day of class
    - University academic deadlines (e.g., add/drop, pass/fail, enrollment count)

    Ignore references to events without specific dates.

    Return the results as a JSON list of events with the format:

    [
      {
        "type": "Exam",
        "title": "Midterm 1",
        "date": "October 13, 2025",
        "time": "12:00 PM"
      },
      ...
    ]

    Syllabus text:
    ${extractedText.substring(0, 8000)} // Limit to first 8000 chars to stay within token limits
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
      model: 'llama3-8b-8192', // Using Llama 3.1 8B for cost-effectiveness
      temperature: 0.1, // Low temperature for consistent results
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
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        extractedDates = JSON.parse(jsonMatch[0]);
      } else {
        // If no JSON array found, try to parse the entire response
        extractedDates = JSON.parse(aiResponse);
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.error('AI Response:', aiResponse);
      
      // Return a fallback response
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
    const validatedDates = extractedDates
      .filter((item: any) => 
        item && 
        item.title && 
        item.date && 
        item.type && 
        ['Assignment', 'Exam', 'Midterm', 'Final', 'Quiz', 'Class', 'Deadline', 'Holiday'].includes(item.type)
      )
      .map((item: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        title: item.title,
        date: item.date,
        type: item.type.toLowerCase(), // Convert to lowercase for consistency with UI
        time: item.time || '',
        recurrence: item.recurrence || '',
        description: item.description || ''
      }));

    return NextResponse.json({
      success: true,
      extractedDates: validatedDates,
      textLength: extractedText.length,
      processedText: extractedText.substring(0, 500) + '...' // Return first 500 chars for debugging
    });

  } catch (error) {
    console.error('Error processing PDF:', error);
    return NextResponse.json(
      { error: 'Failed to process PDF' },
      { status: 500 }
    );
  }
} 