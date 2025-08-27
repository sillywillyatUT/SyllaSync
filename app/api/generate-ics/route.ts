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

function formatDateForICS(dateString: string, timeString?: string): string {
  const date = new Date(dateString);

  if (timeString) {
    // Handle time ranges like "12:00 PM – 1:00 PM" or "12:00 PM - 1:00 PM"
    if (timeString.includes("–") || timeString.includes("-")) {
      const [startTimeStr] = timeString.split(/[–-]/);
      const startTime = startTimeStr.trim();
      const [time, period] = startTime.split(" ");
      const [hours, minutes] = time.split(":");
      let hour24 = parseInt(hours);

      if (period === "PM" && hour24 !== 12) {
        hour24 += 12;
      } else if (period === "AM" && hour24 === 12) {
        hour24 = 0;
      }

      date.setHours(hour24, parseInt(minutes) || 0, 0, 0);
    } else {
      // Single time format
      const [time, period] = timeString.split(" ");
      const [hours, minutes] = time.split(":");
      let hour24 = parseInt(hours);

      if (period === "PM" && hour24 !== 12) {
        hour24 += 12;
      } else if (period === "AM" && hour24 === 12) {
        hour24 = 0;
      }

      date.setHours(hour24, parseInt(minutes) || 0, 0, 0);
    }
  }

  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function formatEndDateForICS(dateString: string, timeString?: string): string {
  const date = new Date(dateString);

  if (timeString) {
    // Handle time ranges like "12:00 PM – 1:00 PM" or "12:00 PM - 1:00 PM"
    if (timeString.includes("–") || timeString.includes("-")) {
      const [, endTimeStr] = timeString.split(/[–-]/);
      const endTime = endTimeStr.trim();
      const [time, period] = endTime.split(" ");
      const [hours, minutes] = time.split(":");
      let hour24 = parseInt(hours);

      if (period === "PM" && hour24 !== 12) {
        hour24 += 12;
      } else if (period === "AM" && hour24 === 12) {
        hour24 = 0;
      }

      date.setHours(hour24, parseInt(minutes) || 0, 0, 0);
    } else {
      // Single time format - add 1 hour duration by default
      const [time, period] = timeString.split(" ");
      const [hours, minutes] = time.split(":");
      let hour24 = parseInt(hours);

      if (period === "PM" && hour24 !== 12) {
        hour24 += 12;
      } else if (period === "AM" && hour24 === 12) {
        hour24 = 0;
      }

      date.setHours(hour24 + 1, parseInt(minutes) || 0, 0, 0); // Add 1 hour
    }
  }

  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
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
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
    .replace(/\s+/g, '_') // Replace spaces with underscores for cleaner filenames
    .trim(); // Remove leading/trailing whitespace
}

// Extract clean class ID from className for filename
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
        icsContent.push(`DTSTART:${eventStart}`, `DTEND:${eventEnd}`);
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