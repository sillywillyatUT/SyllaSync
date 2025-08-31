import { NextRequest, NextResponse } from "next/server";
import { google } from 'googleapis';

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
  let period = parts[1];
  
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

function formatDateTimeForGoogle(dateString: string, timeString?: string): string {
  const date = new Date(dateString);

  if (timeString) {
    const timeRangeRegex = /([^–\-]+)[–\-]([^–\-]+)/;
    const timeMatch = timeString.match(timeRangeRegex);
    
    if (timeMatch) {
      const fullTimeString = timeString.toLowerCase();
      const hasAM = fullTimeString.includes('am');
      const hasPM = fullTimeString.includes('pm');
      
      const startTimeStr = timeMatch[1].trim();
      
      let startPeriod = '';
      if (startTimeStr.toLowerCase().includes('am')) {
        startPeriod = 'AM';
      } else if (startTimeStr.toLowerCase().includes('pm')) {
        startPeriod = 'PM';
      } else {
        if (hasPM && !hasAM) {
          startPeriod = 'PM';
        } else if (hasAM && !hasPM) {
          startPeriod = 'AM';
        }
      }
      
      const { hours, minutes } = parseTime(startTimeStr, startPeriod);
      date.setHours(hours, minutes, 0, 0);
    } else {
      const { hours, minutes } = parseTime(timeString);
      date.setHours(hours, minutes, 0, 0);
    }
    
    return date.toISOString();
  } else {
    // All-day event
    date.setHours(0, 0, 0, 0);
    return date.toISOString().split('T')[0];
  }
}

function formatEndTimeForGoogle(dateString: string, timeString?: string): string {
  const date = new Date(dateString);

  if (timeString) {
    const timeRangeRegex = /([^–\-]+)[–\-]([^–\-]+)/;
    const timeMatch = timeString.match(timeRangeRegex);
    
    if (timeMatch) {
      const fullTimeString = timeString.toLowerCase();
      const hasAM = fullTimeString.includes('am');
      const hasPM = fullTimeString.includes('pm');
      
      const endTimeStr = timeMatch[2].trim();
      
      let endPeriod = '';
      if (endTimeStr.toLowerCase().includes('am')) {
        endPeriod = 'AM';
      } else if (endTimeStr.toLowerCase().includes('pm')) {
        endPeriod = 'PM';
      } else {
        if (hasPM && !hasAM) {
          endPeriod = 'PM';
        } else if (hasAM && !hasPM) {
          endPeriod = 'AM';
        }
      }
      
      const { hours, minutes } = parseTime(endTimeStr, endPeriod);
      date.setHours(hours, minutes, 0, 0);
    } else {
      // Single time - add 1 hour
      const { hours, minutes } = parseTime(timeString);
      date.setHours(hours + 1, minutes, 0, 0);
    }
    
    return date.toISOString();
  } else {
    // All-day event - end next day
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(0, 0, 0, 0);
    return nextDay.toISOString().split('T')[0];
  }
}

function convertRecurrenceToGoogle(recurrence: string): string[] | undefined {
  if (!recurrence) return undefined;

  const lower = recurrence.toLowerCase();
  const rruleArray: string[] = [];

  if (lower.includes("every monday, wednesday, and friday")) {
    rruleArray.push("RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR");
  } else if (lower.includes("every tuesday and thursday")) {
    rruleArray.push("RRULE:FREQ=WEEKLY;BYDAY=TU,TH");
  } else if (lower.includes("every monday")) {
    rruleArray.push("RRULE:FREQ=WEEKLY;BYDAY=MO");
  } else if (lower.includes("every tuesday")) {
    rruleArray.push("RRULE:FREQ=WEEKLY;BYDAY=TU");
  } else if (lower.includes("every wednesday")) {
    rruleArray.push("RRULE:FREQ=WEEKLY;BYDAY=WE");
  } else if (lower.includes("every thursday")) {
    rruleArray.push("RRULE:FREQ=WEEKLY;BYDAY=TH");
  } else if (lower.includes("every friday")) {
    rruleArray.push("RRULE:FREQ=WEEKLY;BYDAY=FR");
  } else if (lower.includes("weekly")) {
    rruleArray.push("RRULE:FREQ=WEEKLY");
  }

  // Look for "until" date in recurrence
  const untilMatch = recurrence.match(/until\s+([^,]+)/i);
  if (untilMatch && rruleArray.length > 0) {
    try {
      const untilDate = new Date(untilMatch[1].trim());
      const untilFormatted = untilDate.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      rruleArray[0] = rruleArray[0] + `;UNTIL=${untilFormatted}`;
    } catch (e) {
      console.warn("Could not parse until date:", untilMatch[1]);
    }
  }

  return rruleArray.length > 0 ? rruleArray : undefined;
}

export async function POST(request: NextRequest) {
  try {
    const { dates, accessToken }: { dates: ExtractedDate[]; accessToken: string } = await request.json();

    if (!dates || dates.length === 0) {
      return NextResponse.json({ error: "No dates provided" }, { status: 400 });
    }

    if (!accessToken) {
      return NextResponse.json({ error: "No access token provided" }, { status: 401 });
    }

    // Initialize Google Calendar API
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const createdEvents: any[] = [];
    const errors: any[] = [];

    for (const dateItem of dates) {
      try {
        if (!dateItem.date && !dateItem.recurrence) {
          errors.push({ 
            event: dateItem.title, 
            error: "No date or recurrence pattern found" 
          });
          continue;
        }

        const hasTime = dateItem.time && dateItem.time.trim() !== "";

        let eventData: any = {
          summary: dateItem.title,
          description: `${dateItem.description || ""}\nType: ${dateItem.type}`.trim(),
        };

        if (dateItem.location) {
          eventData.location = dateItem.location;
        }

        if (dateItem.recurrence) {
          // Handle recurring events
          const recurrenceRules = convertRecurrenceToGoogle(dateItem.recurrence);
          if (recurrenceRules) {
            eventData.recurrence = recurrenceRules;
          }

          // For recurring events, use a base date (start from next week)
          const baseDate = new Date();
          baseDate.setDate(baseDate.getDate() + 7); // Start next week
          baseDate.setHours(0, 0, 0, 0);

          if (hasTime) {
            eventData.start = {
              dateTime: formatDateTimeForGoogle(baseDate.toISOString(), dateItem.time),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            };
            eventData.end = {
              dateTime: formatEndTimeForGoogle(baseDate.toISOString(), dateItem.time),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            };
          } else {
            eventData.start = {
              date: formatDateTimeForGoogle(baseDate.toISOString()),
            };
            eventData.end = {
              date: formatEndTimeForGoogle(baseDate.toISOString()),
            };
          }
        } else if (dateItem.date) {
          // Handle one-time events
          if (hasTime) {
            eventData.start = {
              dateTime: formatDateTimeForGoogle(dateItem.date, dateItem.time),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            };
            eventData.end = {
              dateTime: formatEndTimeForGoogle(dateItem.date, dateItem.time),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            };
          } else {
            // All-day event
            eventData.start = {
              date: formatDateTimeForGoogle(dateItem.date),
            };
            eventData.end = {
              date: formatEndTimeForGoogle(dateItem.date),
            };
          }
        }

        // Create the event in Google Calendar
        const response = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: eventData,
        });

        createdEvents.push({
          title: dateItem.title,
          googleEventId: response.data.id,
          htmlLink: response.data.htmlLink,
        });

      } catch (eventError) {
        console.error(`Error creating event "${dateItem.title}":`, eventError);
        errors.push({
          event: dateItem.title,
          error: eventError instanceof Error ? eventError.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      createdEvents,
      errors,
      summary: {
        totalEvents: dates.length,
        successful: createdEvents.length,
        failed: errors.length,
      },
    });

  } catch (error) {
    console.error("Google Calendar export error:", error);
    
    // Handle specific OAuth errors
    if (error instanceof Error && error.message.includes('invalid_grant')) {
      return NextResponse.json({
        error: "Authentication expired. Please sign in again.",
        authError: true,
      }, { status: 401 });
    }

    return NextResponse.json({
      error: "Failed to export to Google Calendar",
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}