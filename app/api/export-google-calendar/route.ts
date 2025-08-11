import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "../../../supabase/server";

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

function formatDateForGoogle(
  dateString: string,
  timeString?: string,
): { start: string; end: string } {
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

    // Create end time (1 hour later for events with time)
    const endDate = new Date(date);
    endDate.setHours(endDate.getHours() + 1);

    return {
      start: date.toISOString(),
      end: endDate.toISOString(),
    };
  } else {
    // All-day event
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    return {
      start: startDate.toISOString().split("T")[0],
      end: endDate.toISOString().split("T")[0],
    };
  }
}

function generateRecurrenceRule(recurrence: string): string[] | undefined {
  if (!recurrence) return undefined;

  const lower = recurrence.toLowerCase();

  if (lower.includes("every monday, wednesday, and friday")) {
    return ["RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR"];
  }
  if (lower.includes("every tuesday and thursday")) {
    return ["RRULE:FREQ=WEEKLY;BYDAY=TU,TH"];
  }
  if (lower.includes("every monday")) {
    return ["RRULE:FREQ=WEEKLY;BYDAY=MO"];
  }
  if (lower.includes("every tuesday")) {
    return ["RRULE:FREQ=WEEKLY;BYDAY=TU"];
  }
  if (lower.includes("every wednesday")) {
    return ["RRULE:FREQ=WEEKLY;BYDAY=WE"];
  }
  if (lower.includes("every thursday")) {
    return ["RRULE:FREQ=WEEKLY;BYDAY=TH"];
  }
  if (lower.includes("every friday")) {
    return ["RRULE:FREQ=WEEKLY;BYDAY=FR"];
  }
  if (lower.includes("weekly")) {
    return ["RRULE:FREQ=WEEKLY"];
  }

  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const {
      dates,
      accessToken,
    }: { dates: ExtractedDate[]; accessToken: string } = await request.json();

    if (!dates || dates.length === 0) {
      return NextResponse.json({ error: "No dates provided" }, { status: 400 });
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: "No access token provided" },
        { status: 400 },
      );
    }

    // Initialize Google Calendar API
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: "v3", auth });

    const createdEvents = [];
    const errors = [];

    // Create events in Google Calendar
    for (const dateItem of dates) {
      try {
        if (!dateItem.date && !dateItem.recurrence) continue;

        let eventData: any = {
          summary: dateItem.title,
          description: `${dateItem.description || ""} (Type: ${dateItem.type})`,
        };

        if (dateItem.location) {
          eventData.location = dateItem.location;
        }

        if (dateItem.date) {
          const { start, end } = formatDateForGoogle(
            dateItem.date,
            dateItem.time,
          );

          if (dateItem.time) {
            eventData.start = { dateTime: start };
            eventData.end = { dateTime: end };
          } else {
            eventData.start = { date: start };
            eventData.end = { date: end };
          }
        } else if (dateItem.recurrence) {
          // For recurring events without specific date, start from next Monday
          const nextMonday = new Date();
          nextMonday.setDate(
            nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7),
          );

          const { start, end } = formatDateForGoogle(
            nextMonday.toISOString(),
            dateItem.time,
          );

          if (dateItem.time) {
            eventData.start = { dateTime: start };
            eventData.end = { dateTime: end };
          } else {
            eventData.start = { date: start };
            eventData.end = { date: end };
          }
        }

        if (dateItem.recurrence) {
          const recurrenceRule = generateRecurrenceRule(dateItem.recurrence);
          if (recurrenceRule) {
            eventData.recurrence = recurrenceRule;
          }
        }

        const response = await calendar.events.insert({
          calendarId: "primary",
          requestBody: eventData,
        });

        createdEvents.push({
          id: dateItem.id,
          title: dateItem.title,
          googleEventId: response.data.id,
          htmlLink: response.data.htmlLink,
        });
      } catch (eventError) {
        console.error(`Error creating event ${dateItem.title}:`, eventError);
        errors.push({
          id: dateItem.id,
          title: dateItem.title,
          error:
            eventError instanceof Error ? eventError.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      createdEvents,
      errors,
      message: `Successfully created ${createdEvents.length} events in Google Calendar${errors.length > 0 ? ` (${errors.length} failed)` : ""}`,
    });
  } catch (error) {
    console.error("Error creating Google Calendar events:", error);
    return NextResponse.json(
      { error: "Failed to create Google Calendar events" },
      { status: 500 },
    );
  }
}
