import { NextRequest, NextResponse } from "next/server";

interface ExtractedDate {
  id: string;
  title: string;
  date: string;
  type: string;
  time?: string;
  recurrence?: string;
  description?: string;
  location?: string;
}

function parseTime(timeStr: string, fallbackPeriod?: string): { hours: number; minutes: number } {
  const parts = timeStr.trim().split(" ");
  const time = parts[0];
  let period = parts[1]; // Could be undefined
  
  // If no period found in this time, use the fallback period
  if (!period && fallbackPeriod) {
    period = fallbackPeriod;
  }
  
  const [hours, minutes] = time.split(":");
  let hour24 = parseInt(hours);

  if (period?.toUpperCase() === "PM" && hour24 !== 12) {
    hour24 += 12;
  } else if (period?.toUpperCase() === "AM" && hour24 === 12) {
    hour24 = 0;
  }

  return { hours: hour24, minutes: parseInt(minutes) || 0 };
}

function formatDateForICS(dateString: string, timeString?: string): string {
  // Parse date components directly to avoid timezone interpretation issues
  const [year, month, day] = dateString.split('-').map(Number);
  
  if (timeString) {
    // Create date in local timezone using direct components
    const date = new Date(year, month - 1, day);
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  } else {
    // All-day event format (YYYYMMDD) - use direct components
    return `${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`;
  }
}

function formatEndDateForICS(dateString: string, timeString?: string): string {
  const date = new Date(dateString);

  if (timeString) {
    // Handle time ranges like "12:00 PM – 1:00 PM" or "12:00 PM - 1:00 PM" or "3:30 - 5:30 pm"
    const timeRangeRegex = /([^–\-]+)[–\-]([^–\-]+)/;
    const timeMatch = timeString.match(timeRangeRegex);
    
    if (timeMatch) {
      // Time range found - extract AM/PM from the entire string first
      const fullTimeString = timeString.toLowerCase();
      const hasAM = fullTimeString.includes('am');
      const hasPM = fullTimeString.includes('pm');
      
      const startTimeStr = timeMatch[1].trim();
      const endTimeStr = timeMatch[2].trim();
      
      // Determine the period for end time
      let endPeriod = '';
      if (endTimeStr.toLowerCase().includes('am')) {
        endPeriod = 'AM';
      } else if (endTimeStr.toLowerCase().includes('pm')) {
        endPeriod = 'PM';
      } else {
        // No explicit period in end time, use context
        if (hasPM && !hasAM) {
          endPeriod = 'PM'; // If only PM is mentioned, both times are likely PM
        } else if (hasAM && !hasPM) {
          endPeriod = 'AM'; // If only AM is mentioned, both times are likely AM
        }
      }
      
      const { hours, minutes } = parseTime(endTimeStr, endPeriod);
      date.setHours(hours, minutes, 0, 0);
    } else {
      // Single time format - add default 1 hour duration
      const { hours, minutes } = parseTime(timeString);
      date.setHours(hours + 1, minutes, 0, 0);
    }
    
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  } else {
    // All-day event - end date should be next day for proper all-day display
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    return nextDay.toISOString().split("T")[0].replace(/-/g, "");
  }
}

function generateRRule(recurrence: string): string {
  if (!recurrence) return "";

  const lower = recurrence.toLowerCase();

  if (lower.includes("every monday, wednesday, and friday")) {
    return "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR";
  }
  if (lower.includes("every tuesday and thursday")) {
    return "RRULE:FREQ=WEEKLY;BYDAY=TU,TH";
  }
  if (lower.includes("every monday")) {
    return "RRULE:FREQ=WEEKLY;BYDAY=MO";
  }
  if (lower.includes("every tuesday")) {
    return "RRULE:FREQ=WEEKLY;BYDAY=TU";
  }
  if (lower.includes("every wednesday")) {
    return "RRULE:FREQ=WEEKLY;BYDAY=WE";
  }
  if (lower.includes("every thursday")) {
    return "RRULE:FREQ=WEEKLY;BYDAY=TH";
  }
  if (lower.includes("every friday")) {
    return "RRULE:FREQ=WEEKLY;BYDAY=FR";
  }
  if (lower.includes("weekly")) {
    return "RRULE:FREQ=WEEKLY";
  }

  return "";
}

function sanitizeFilename(filename: string): string {
  // Remove or replace characters that are invalid in filenames
  return filename
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '_') 
    .trim(); 
}


function extractClassIdForFilename(className: string): string {
  if (!className || className === "Unknown Course") {
    return "calendar";
  }

  // Look for course code pattern (e.g., "MIS 302", "SDS 321", "MATH 2304")
  const courseCodeMatch = className.match(/([A-Z]{2,4}\s*\d{3,4}[A-Z]?)/);
  if (courseCodeMatch) {
    return courseCodeMatch[1].replace(/\s+/g, '_'); // Replace spaces with underscores
  }

  // If no course code pattern found, use the first part of the className
  // This handles cases where className might be a longer title
  const firstPart = className.split(' - ')[0].split(' ').slice(0, 2).join(' ');
  return firstPart || "calendar";
}

export async function POST(request: NextRequest) {
  try {
    const { dates, className }: { dates: ExtractedDate[]; className?: string } = await request.json();

    if (!dates || dates.length === 0) {
      return NextResponse.json({ error: "No dates provided" }, { status: 400 });
    }

    let icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Syllabus Calendar//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];

    // Add calendar name if class name is provided
    if (className) {
      icsContent.push(`X-WR-CALNAME:${className} Schedule`);
      icsContent.push(`X-WR-CALDESC:Academic calendar for ${className}`);
    }

    dates.forEach((dateItem) => {
      if (!dateItem.date && !dateItem.recurrence) return;

      const hasTime = dateItem.time && dateItem.time.trim() !== "";
      const eventStart = dateItem.date
        ? formatDateForICS(dateItem.date, dateItem.time)
        : "";
      const eventEnd = dateItem.date
        ? formatEndDateForICS(dateItem.date, dateItem.time)
        : "";

      icsContent.push(
        "BEGIN:VEVENT",
        `UID:${dateItem.id}@syllabuscalendar.com`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
        `SUMMARY:${dateItem.title}`,
        `DESCRIPTION:${dateItem.description || ""} (Type: ${dateItem.type})`,
      );

      if (dateItem.location) {
        icsContent.push(`LOCATION:${dateItem.location}`);
      }

      // Add TRANSP property to ensure events show as busy time blocks
      if (hasTime) {
        icsContent.push("TRANSP:OPAQUE");
      }

      if (dateItem.recurrence) {
        const rrule = generateRRule(dateItem.recurrence);
        if (rrule) {
          icsContent.push(rrule);
        }

        // For recurring events, use a base date
        const baseDate = new Date();
        baseDate.setDate(baseDate.getDate() + 1); // Start tomorrow
        const recurringStart = formatDateForICS(
          baseDate.toISOString(),
          dateItem.time,
        );
        const recurringEnd = formatEndDateForICS(
          baseDate.toISOString(),
          dateItem.time,
        );

        icsContent.push(`DTSTART:${recurringStart}`, `DTEND:${recurringEnd}`);
      } else if (eventStart && eventEnd) {
        // Use different property names for all-day vs timed events
        if (hasTime) {
          icsContent.push(`DTSTART:${eventStart}`, `DTEND:${eventEnd}`);
        } else {
          // All-day events use VALUE=DATE
          icsContent.push(`DTSTART;VALUE=DATE:${eventStart}`, `DTEND;VALUE=DATE:${eventEnd}`);
        }
      }

      icsContent.push("END:VEVENT");
    });

    icsContent.push("END:VCALENDAR");

    const icsString = icsContent.join("\r\n");

    // Generate filename based on extracted class ID
    let filename = "calendar.ics";
    if (className) {
      const classId = extractClassIdForFilename(className);
      const sanitizedClassId = sanitizeFilename(classId);
      filename = `${sanitizedClassId}.ics`;
    }

    return new NextResponse(icsString, {
      headers: {
        "Content-Type": "text/calendar",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error generating ICS:", error);
    return NextResponse.json(
      { error: "Failed to generate ICS file" },
      { status: 500 },
    );
  }
}