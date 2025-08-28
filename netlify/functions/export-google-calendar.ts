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

// Token validation function
async function validateAndRefreshToken(accessToken: string, refreshToken?: string) {
  try {
    // Test current token
    const testResponse = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`);
    
    if (testResponse.ok) {
      return { valid: true, token: accessToken };
    }
    
    // Token expired, try to refresh if we have refresh token
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
        return { 
          valid: true, 
          token: data.access_token,
          newRefreshToken: data.refresh_token 
        };
      }
    }
    
    return { valid: false };
  } catch (error) {
    return { valid: false };
  }
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
      const { hours, minutes } = parseTime(timeString);
      date.setHours(hours + 1, minutes, 0, 0);
    }
    
    return date.toISOString();
  } else {
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

// Main handler function
async function handleRequest(body: string) {
  try {
    const { dates, accessToken, refreshToken, colorId }: { 
      dates: ExtractedDate[]; 
      accessToken: string; 
      refreshToken?: string;
      colorId?: string;
    } = JSON.parse(body);

    if (!dates || dates.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No dates provided" })
      };
    }

    if (!accessToken) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "No access token provided", authError: true })
      };
    }

    // Validate and potentially refresh the token
    const tokenResult = await validateAndRefreshToken(accessToken, refreshToken);
    
    if (!tokenResult.valid) {
      return {
        statusCode: 401,
        body: JSON.stringify({ 
          error: "Invalid or expired access token", 
          authError: true 
        })
      };
    }

    // Initialize Google Calendar API
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: tokenResult.token });

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

        if (colorId) {
          eventData.colorId = colorId;
        }

        if (dateItem.location) {
          eventData.location = dateItem.location;
        }

        if (dateItem.recurrence) {
          const recurrenceRules = convertRecurrenceToGoogle(dateItem.recurrence);
          if (recurrenceRules) {
            eventData.recurrence = recurrenceRules;
          }

          const baseDate = new Date();
          baseDate.setDate(baseDate.getDate() + 7);
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
            eventData.start = {
              date: formatDateTimeForGoogle(dateItem.date),
            };
            eventData.end = {
              date: formatEndTimeForGoogle(dateItem.date),
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
        });

      } catch (eventError) {
        console.error(`Error creating event "${dateItem.title}":`, eventError);
        errors.push({
          event: dateItem.title,
          error: eventError instanceof Error ? eventError.message : "Unknown error",
        });
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        createdEvents,
        errors,
        newAccessToken: tokenResult.token !== accessToken ? tokenResult.token : undefined,
        newRefreshToken: tokenResult.newRefreshToken,
        summary: {
          totalEvents: dates.length,
          successful: createdEvents.length,
          failed: errors.length,
        },
      })
    };

  } catch (error) {
    console.error("Google Calendar export error:", error);
    
    if (error instanceof Error && error.message.includes('invalid_grant')) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: "Authentication expired. Please sign in again.",
          authError: true,
        })
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to export to Google Calendar",
        details: error instanceof Error ? error.message : "Unknown error",
      })
    };
  }
}

// Netlify function handler
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

