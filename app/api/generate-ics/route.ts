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
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim(); // Remove leading/trailing whitespace
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

    dates.forEach((dateItem) => {
      if (!dateItem.date && !dateItem.recurrence) return;

      const eventStart = dateItem.date
        ? formatDateForICS(dateItem.date, dateItem.time)
        : "";
      const eventEnd = dateItem.date
        ? formatDateForICS(dateItem.date, dateItem.time)
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
        const recurringEnd = formatDateForICS(
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

    // Generate filename based on class name or use default
    let filename = "calendar-file.ics";
    if (className) {
      const sanitizedClassName = sanitizeFilename(className);
      filename = `${sanitizedClassName}.ics`;
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