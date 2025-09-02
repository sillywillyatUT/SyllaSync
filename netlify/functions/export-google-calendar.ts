import { Handler } from '@netlify/functions';
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

// Token validation function (no changes needed)
async function validateAndRefreshToken(accessToken: string, refreshToken?: string) {
  try {
    const testResponse = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`);
    if (testResponse.ok) {
      return { valid: true, token: accessToken };
    }
    if (refreshToken) {
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        return { valid: true, token: data.access_token, newRefreshToken: data.refresh_token };
      }
    }
    return { valid: false };
  } catch (error) {
    return { valid: false };
  }
}

// Time parsing and adjustment functions (no changes needed)
function parseTime(timeStr: string, fallbackPeriod?: string): { hours: number; minutes: number } {
  const cleanTime = timeStr.trim().toLowerCase();
  let time = '';
  let period = '';
  if (cleanTime.includes('am')) {
    period = 'AM';
    time = cleanTime.replace(/\s*am\s*/, '');
  } else if (cleanTime.includes('pm')) {
    period = 'PM';
    time = cleanTime.replace(/\s*pm\s*/, '');
  } else {
    time = cleanTime;
    period = fallbackPeriod || '';
  }
  const timeParts = time.split(":");
  const hours = parseInt(timeParts[0]);
  const minutes = parseInt(timeParts[1]) || 0;
  let hour24 = hours;
  if (period.toUpperCase() === "PM" && hour24 !== 12) {
    hour24 += 12;
  } else if (period.toUpperCase() === "AM" && hour24 === 12) {
    hour24 = 0;
  }
  return { hours: hour24, minutes };
}

function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  const { hours, minutes } = parseTime(timeStr);
  const totalMinutes = hours * 60 + minutes + minutesToAdd;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = totalMinutes % 60;
  const period = newHours >= 12 ? 'PM' : 'AM';
  const displayHours = newHours === 0 ? 12 : newHours > 12 ? newHours - 12 : newHours;
  return `${displayHours}:${newMinutes.toString().padStart(2, '0')} ${period}`;
}

function adjustOverlappingTimes(dates: ExtractedDate[]): ExtractedDate[] {
  const timeMap = new Map<string, ExtractedDate[]>();
  dates.forEach(event => {
    if (event.date && event.time) {
      const key = `${event.date}-${event.time}`;
      if (!timeMap.has(key)) {
        timeMap.set(key, []);
      }
      timeMap.get(key)!.push(event);
    }
  });
  timeMap.forEach((events, key) => {
    if (events.length > 1) {
      events.sort((a, b) => {
        const aIsHomework = a.type.toLowerCase().includes('homework') || a.type.toLowerCase().includes('assignment');
        const bIsHomework = b.type.toLowerCase().includes('homework') || b.type.toLowerCase().includes('assignment');
        if (aIsHomework && !bIsHomework) return -1;
        if (!aIsHomework && bIsHomework) return 1;
        return 0;
      });
      let homeworkCount = 0;
      events.forEach((event) => {
        const isHomework = event.type.toLowerCase().includes('homework') || 
                          event.type.toLowerCase().includes('assignment') ||
                          event.type.toLowerCase().includes('deadline');
        if (isHomework) {
          if (homeworkCount > 0) {
            const [, timePart] = key.split('-');
            event.time = addMinutesToTime(timePart, 30 * homeworkCount);
          }
          homeworkCount++;
        }
      });
    }
  });
  return dates;
}

// ---- START OF CHANGES ----

/**
 * FIX: This function now returns a timezone-naive ISO-like string (YYYY-MM-DDTHH:mm:ss).
 * It NO LONGER converts to UTC. The timezone is handled separately.
 */
function formatDateTimeForGoogle(dateString: string, timeString?: string): string {
  // Use a regex that can handle hyphens or en-dashes
  const datePart = new Date(dateString).toISOString().split('T')[0];

  if (timeString) {
    const timeRangeRegex = /([^–\-]+)[–\-]([^–\-]+)/;
    const timeMatch = timeString.match(timeRangeRegex);
    let startTimeStr = timeString;

    if (timeMatch) {
      startTimeStr = timeMatch[1].trim();
    }
    
    // Fallback logic for AM/PM simplified, relying on explicit markers when possible
    let fallbackPeriod = '';
    const fullTimeString = timeString.toLowerCase();
    if (fullTimeString.includes('pm') && !fullTimeString.includes('am')) {
        fallbackPeriod = 'PM';
    } else if (fullTimeString.includes('am') && !fullTimeString.includes('pm')) {
        fallbackPeriod = 'AM';
    }

    const { hours, minutes } = parseTime(startTimeStr, fallbackPeriod);
    const timePart = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

    return `${datePart}T${timePart}`;
  }
  
  // For all-day events, just return the date string
  return datePart;
}

/**
 * FIX: This function also returns a timezone-naive string.
 * It now correctly calculates the end time for both single times and time ranges.
 */
function formatEndTimeForGoogle(dateString: string, timeString?: string): string {
    const datePart = new Date(dateString).toISOString().split('T')[0];

    if (timeString) {
        const timeRangeRegex = /([^–\-]+)[–\-]([^–\-]+)/;
        const timeMatch = timeString.match(timeRangeRegex);

        let hours, minutes;

        if (timeMatch) {
            // It's a time range, parse the end time
            const endTimeStr = timeMatch[2].trim();
            let fallbackPeriod = '';
            if (timeString.toLowerCase().includes('pm')) {
                fallbackPeriod = 'PM';
            } else if (timeString.toLowerCase().includes('am')) {
                fallbackPeriod = 'AM';
            }
            ({ hours, minutes } = parseTime(endTimeStr, fallbackPeriod));
        } else {
            // It's a single time, add 1 hour for the default duration
            ({ hours, minutes } = parseTime(timeString));
            hours += 1;
        }

        const timePart = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
        return `${datePart}T${timePart}`;
    }

    // For all-day events, the end date should be the day after the start date
    const nextDay = new Date(dateString);
    nextDay.setDate(nextDay.getDate() + 1);
    return nextDay.toISOString().split('T')[0];
}


// Recurrence function (no changes needed)
function convertRecurrenceToGoogle(recurrence: string): string[] | undefined {
  if (!recurrence) return undefined;
  const lower = recurrence.toLowerCase();
  const rruleArray: string[] = [];
  if (lower.includes("every monday, wednesday, and friday")) {
    rruleArray.push("RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR");
  } else if (lower.includes("every tuesday and thursday")) {
    rruleArray.push("RRULE:FREQ=WEEKLY;BYDAY=TU,TH");
  } else if (lower.includes("every monday and wednesday")) {
    rruleArray.push("RRULE:FREQ=WEEKLY;BYDAY=MO,WE");
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
  const untilMatch = recurrence.match(/until\s+(.*)/i);
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

// Conflict checking functions (no changes needed)
async function fetchExistingEvents(calendar: any, startDate: Date, endDate: Date) {
  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });
    return response.data.items || [];
  } catch (error) {
    console.error('Error fetching existing events:', error);
    return [];
  }
}

function checkForExistingConflicts(newDates: ExtractedDate[], existingEvents: any[]): ExtractedDate[] {
  const conflictMap = new Map<string, number>();
  existingEvents.forEach(event => {
    if (event.summary && event.start) {
      const isHomework = event.summary.toLowerCase().includes('homework') || 
                        event.summary.toLowerCase().includes('assignment') ||
                        event.summary.toLowerCase().includes('deadline');
      if (isHomework) {
        let eventDate: string;
        let eventTime: string | null = null;
        if (event.start.dateTime) {
          const startDateTime = new Date(event.start.dateTime);
          eventDate = startDateTime.toISOString().split('T')[0];
          eventTime = startDateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        } else if (event.start.date) {
          eventDate = event.start.date;
          eventTime = '12:00 AM';
        } else { return; }
        const key = `${eventDate}-${eventTime}`;
        conflictMap.set(key, (conflictMap.get(key) || 0) + 1);
      }
    }
  });
  return newDates.map(newEvent => {
    const isHomework = newEvent.type.toLowerCase().includes('homework') || 
                      newEvent.type.toLowerCase().includes('assignment') ||
                      newEvent.type.toLowerCase().includes('deadline');
    if (isHomework && newEvent.date) {
      const eventTime = newEvent.time || '12:00 AM';
      const key = `${newEvent.date}-${eventTime}`;
      if (conflictMap.has(key)) {
        const conflictCount = conflictMap.get(key)!;
        newEvent.time = addMinutesToTime(eventTime, 30 * conflictCount);
        conflictMap.set(key, conflictCount + 1);
      }
    }
    return newEvent;
  });
}

// Main handler function
async function handleRequest(body: string) {
  try {
    const { dates, accessToken, refreshToken, colorId, timezone }: { 
      dates: ExtractedDate[]; 
      accessToken: string; 
      refreshToken?: string;
      colorId?: string;
      timezone?: string; // FIX: Ensure timezone is always expected
    } = JSON.parse(body);

    if (!dates || dates.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: "No dates provided" }) };
    }
    if (!accessToken) {
      return { statusCode: 401, body: JSON.stringify({ error: "No access token provided", authError: true }) };
    }
    // FIX: Add a check for the timezone
    if (!timezone) {
      return { statusCode: 400, body: JSON.stringify({ error: "No timezone provided" }) };
    }

    const tokenResult = await validateAndRefreshToken(accessToken, refreshToken);
    if (!tokenResult.valid) {
      return { statusCode: 401, body: JSON.stringify({ error: "Invalid or expired access token", authError: true }) };
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: tokenResult.token });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const now = new Date();
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(now.getMonth() + 6);
    const existingEvents = await fetchExistingEvents(calendar, now, sixMonthsFromNow);
    
    let adjustedDates = checkForExistingConflicts(dates, existingEvents);
    adjustedDates = adjustOverlappingTimes(adjustedDates);

    const createdEvents: any[] = [];
    const errors: any[] = [];

    for (const dateItem of adjustedDates) {
      try {
        if (!dateItem.date && !dateItem.recurrence) {
          errors.push({ event: dateItem.title, error: "No date or recurrence pattern found" });
          continue;
        }

        const hasTime = dateItem.time && dateItem.time.trim() !== "";

        let eventData: any = {
          summary: dateItem.title,
          description: `${dateItem.description || ""}\nType: ${dateItem.type}`.trim(),
        };

        if (colorId) eventData.colorId = colorId;
        if (dateItem.location) eventData.location = dateItem.location;

        if (dateItem.recurrence) {
          const recurrenceRules = convertRecurrenceToGoogle(dateItem.recurrence);
          if (recurrenceRules) {
            eventData.recurrence = recurrenceRules;
          }
          
          // For recurring events, we need a valid start date to anchor the recurrence.
          // This logic can be improved to find the actual first day of class from the syllabus dates.
          const baseDate = new Date(); 
          baseDate.setDate(baseDate.getDate() + (7 - baseDate.getDay())); // Start from next week.

          if (hasTime) {
            eventData.start = {
              dateTime: formatDateTimeForGoogle(baseDate.toISOString().split('T')[0], dateItem.time),
              timeZone: timezone, // FIX: Apply the user's timezone
            };
            eventData.end = {
              dateTime: formatEndTimeForGoogle(baseDate.toISOString().split('T')[0], dateItem.time),
              timeZone: timezone, // FIX: Apply the user's timezone
            };
          }
          // Note: Recurring all-day events are less common for classes, so not handled here.

        } else if (dateItem.date) {
          if (hasTime) {
            // TIMED EVENT
            eventData.start = {
              dateTime: formatDateTimeForGoogle(dateItem.date, dateItem.time),
              timeZone: timezone, // FIX: Apply the user's timezone
            };
            eventData.end = {
              dateTime: formatEndTimeForGoogle(dateItem.date, dateItem.time),
              timeZone: timezone, // FIX: Apply the user's timezone
            };
          } else {
            // ALL-DAY EVENT
            eventData.start = {
              date: formatDateTimeForGoogle(dateItem.date), // Returns YYYY-MM-DD
            };
            eventData.end = {
              date: formatEndTimeForGoogle(dateItem.date), // Returns YYYY-MM-DD
            };
          }
        }
        
        const response = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: eventData,
        });

        createdEvents.push({
          title: dateItem.title,
          googleEventId: response.data.id,
          htmlLink: response.data.htmlLink,
          originalTime: dates.find(d => d.id === dateItem.id)?.time,
          adjustedTime: dateItem.time !== dates.find(d => d.id === dateItem.id)?.time ? dateItem.time : undefined,
        });

      } catch (eventError) {
        errors.push({
          event: dateItem.title,
          error: eventError instanceof Error ? eventError.message : "Unknown error",
        });
      }
    }

    const finalResult = {
      success: true,
      createdEvents,
      errors,
      newAccessToken: tokenResult.token !== accessToken ? tokenResult.token : undefined,
      newRefreshToken: tokenResult.newRefreshToken,
      adjustmentsMade: adjustedDates.some(d => d.time !== dates.find(orig => orig.id === d.id)?.time),
      summary: {
        totalEvents: dates.length,
        successful: createdEvents.length,
        failed: errors.length,
      },
    };

    return { statusCode: 200, body: JSON.stringify(finalResult) };

  } catch (error) {
    console.error("Google Calendar export error:", error);
    if (error instanceof Error && error.message.includes('invalid_grant')) {
      return { statusCode: 401, body: JSON.stringify({ error: "Authentication expired. Please sign in again.", authError: true }) };
    }
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to export to Google Calendar", details: error instanceof Error ? error.message : "Unknown error" }) };
  }
}
// ---- END OF CHANGES ----


// Netlify function handler (no changes needed)
export const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }
  const result = await handleRequest(event.body || '');
  return {
    ...result,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST'
    }
  };
};