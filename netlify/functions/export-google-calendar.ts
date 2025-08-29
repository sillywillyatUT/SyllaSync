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

// Improved time parsing function
function parseTime(timeStr: string, fallbackPeriod?: string): { hours: number; minutes: number } {
  const cleanTime = timeStr.trim().toLowerCase();
  
  // Extract time and period more carefully
  let time = '';
  let period = '';
  
  // Check for explicit AM/PM in the time string
  if (cleanTime.includes('am')) {
    period = 'AM';
    time = cleanTime.replace(/\s*am\s*/, '');
  } else if (cleanTime.includes('pm')) {
    period = 'PM';
    time = cleanTime.replace(/\s*pm\s*/, '');
  } else {
    // No explicit AM/PM found, use fallback
    time = cleanTime;
    period = fallbackPeriod || '';
  }
  
  // Parse hours and minutes
  const timeParts = time.split(":");
  const hours = parseInt(timeParts[0]);
  const minutes = parseInt(timeParts[1]) || 0;
  
  let hour24 = hours;

  // Convert to 24-hour format
  if (period.toUpperCase() === "PM" && hour24 !== 12) {
    hour24 += 12;
  } else if (period.toUpperCase() === "AM" && hour24 === 12) {
    hour24 = 0;
  }

  return { hours: hour24, minutes };
}

// Function to add minutes to a time string
function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  const { hours, minutes } = parseTime(timeStr);
  const totalMinutes = hours * 60 + minutes + minutesToAdd;
  
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = totalMinutes % 60;
  
  const period = newHours >= 12 ? 'PM' : 'AM';
  const displayHours = newHours === 0 ? 12 : newHours > 12 ? newHours - 12 : newHours;
  
  return `${displayHours}:${newMinutes.toString().padStart(2, '0')} ${period}`;
}

// Function to adjust overlapping homework times
function adjustOverlappingTimes(dates: ExtractedDate[]): ExtractedDate[] {
  const timeMap = new Map<string, ExtractedDate[]>();
  
  // Group events by date and time
  dates.forEach(event => {
    if (event.date && event.time) {
      const key = `${event.date}-${event.time}`;
      if (!timeMap.has(key)) {
        timeMap.set(key, []);
      }
      timeMap.get(key)!.push(event);
    }
  });
  
  // Adjust overlapping homework times
  timeMap.forEach((events, key) => {
    if (events.length > 1) {
      // Sort so homework assignments come first for adjustment
      events.sort((a, b) => {
        const aIsHomework = a.type.toLowerCase().includes('homework') || a.type.toLowerCase().includes('assignment');
        const bIsHomework = b.type.toLowerCase().includes('homework') || b.type.toLowerCase().includes('assignment');
        if (aIsHomework && !bIsHomework) return -1;
        if (!aIsHomework && bIsHomework) return 1;
        return 0;
      });
      
      // Adjust times for duplicate homework/assignments
      let homeworkCount = 0;
      events.forEach((event) => {
        const isHomework = event.type.toLowerCase().includes('homework') || 
                          event.type.toLowerCase().includes('assignment') ||
                          event.type.toLowerCase().includes('deadline');
        
        if (isHomework) {
          if (homeworkCount > 0) {
            // Add 30 minutes for each subsequent homework at the same time
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

function formatDateTimeForGoogle(dateString: string, timeString?: string, userTimezone?: string): string {
  const date = new Date(dateString);

  if (timeString) {
    const timeRangeRegex = /([^–\-]+)[–\-]([^–\-]+)/;
    const timeMatch = timeString.match(timeRangeRegex);
    
    if (timeMatch) {
      // Handle time ranges
      const startTimeStr = timeMatch[1].trim();
      const endTimeStr = timeMatch[2].trim();
      const fullTimeString = timeString.toLowerCase();
      
      // Better logic for determining AM/PM for start time
      let startPeriod = '';
      if (startTimeStr.toLowerCase().includes('am')) {
        startPeriod = 'AM';
      } else if (startTimeStr.toLowerCase().includes('pm')) {
        startPeriod = 'PM';
      } else {
        // If end time has PM and no AM anywhere, assume start is PM too
        // If end time has AM and no PM anywhere, assume start is AM too  
        // Otherwise, be more careful about assumptions
        if (endTimeStr.toLowerCase().includes('pm') && !fullTimeString.includes('am')) {
          // If it's a range like "10:30-3:30 PM", we need to be smart
          const startHour = parseInt(startTimeStr.split(':')[0]);
          const endHour = parseInt(endTimeStr.split(':')[0]);
          
          // If start hour > end hour, likely crossing AM/PM boundary
          if (startHour > endHour) {
            startPeriod = 'AM';
          } else {
            startPeriod = 'PM';
          }
        } else if (endTimeStr.toLowerCase().includes('am') && !fullTimeString.includes('pm')) {
          startPeriod = 'AM';
        }
      }
      
      const { hours, minutes } = parseTime(startTimeStr, startPeriod);
      date.setHours(hours, minutes, 0, 0);
    } else {
      // Single time
      const { hours, minutes } = parseTime(timeString);
      date.setHours(hours, minutes, 0, 0);
    }
    
    return date.toISOString();
  } else {
    date.setHours(0, 0, 0, 0);
    return date.toISOString().split('T')[0];
  }
}

function formatEndTimeForGoogle(dateString: string, timeString?: string, userTimezone?: string): string {
  const date = new Date(dateString);

  if (timeString) {
    const timeRangeRegex = /([^–\-]+)[–\-]([^–\-]+)/;
    const timeMatch = timeString.match(timeRangeRegex);
    
    if (timeMatch) {
      // Handle time ranges
      const endTimeStr = timeMatch[2].trim();
      const fullTimeString = timeString.toLowerCase();
      
      // Determine end time period
      let endPeriod = '';
      if (endTimeStr.toLowerCase().includes('am')) {
        endPeriod = 'AM';
      } else if (endTimeStr.toLowerCase().includes('pm')) {
        endPeriod = 'PM';
      } else {
        // If the full string has PM somewhere, likely the end time is PM
        if (fullTimeString.includes('pm')) {
          endPeriod = 'PM';
        } else if (fullTimeString.includes('am')) {
          endPeriod = 'AM';
        }
      }
      
      const { hours, minutes } = parseTime(endTimeStr, endPeriod);
      date.setHours(hours, minutes, 0, 0);
    } else {
      // Single time - add 1 hour as default duration
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

  // Handle various recurrence patterns
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

  // Handle "until" dates in recurrence
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

// Function to fetch existing calendar events
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

// Function to check for conflicts with existing calendar events
function checkForExistingConflicts(newDates: ExtractedDate[], existingEvents: any[]): ExtractedDate[] {
  const conflictMap = new Map<string, number>();
  
  // Build a map of existing homework/assignment times
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
          eventTime = startDateTime.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
          });
        } else if (event.start.date) {
          eventDate = event.start.date;
          eventTime = '12:00 AM'; // Default time for all-day homework
        } else {
          return;
        }
        
        const key = `${eventDate}-${eventTime}`;
        conflictMap.set(key, (conflictMap.get(key) || 0) + 1);
      }
    }
  });
  
  // Adjust new events that conflict with existing ones
  return newDates.map(newEvent => {
    const isHomework = newEvent.type.toLowerCase().includes('homework') || 
                      newEvent.type.toLowerCase().includes('assignment') ||
                      newEvent.type.toLowerCase().includes('deadline');
    
    if (isHomework && newEvent.date) {
      const eventTime = newEvent.time || '12:00 AM';
      const key = `${newEvent.date}-${eventTime}`;
      
      if (conflictMap.has(key)) {
        const conflictCount = conflictMap.get(key)!;
        // Adjust time by 30 minutes * number of existing conflicts
        newEvent.time = addMinutesToTime(eventTime, 30 * conflictCount);
        // Update the conflict count for future events in this batch
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
      timezone?: string;
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

    // Fetch existing events to check for conflicts
    const now = new Date();
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(now.getMonth() + 6);
    
    const existingEvents = await fetchExistingEvents(calendar, now, sixMonthsFromNow);
    
    // Check for conflicts with existing events and adjust
    let adjustedDates = checkForExistingConflicts(dates, existingEvents);
    
    // Then adjust for conflicts within this batch
    adjustedDates = adjustOverlappingTimes(adjustedDates);

    const createdEvents: any[] = [];
    const errors: any[] = [];
    const userTimezone = timezone || 'America/Chicago'; // Default to Central Time

    for (const dateItem of adjustedDates) {
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

          // For recurring events, start from next week
          const baseDate = new Date();
          baseDate.setDate(baseDate.getDate() + 7);
          baseDate.setHours(0, 0, 0, 0);

          if (hasTime) {
            eventData.start = {
              dateTime: formatDateTimeForGoogle(baseDate.toISOString(), dateItem.time, userTimezone),
              timeZone: userTimezone,
            };
            eventData.end = {
              dateTime: formatEndTimeForGoogle(baseDate.toISOString(), dateItem.time, userTimezone),
              timeZone: userTimezone,
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
              dateTime: formatDateTimeForGoogle(dateItem.date, dateItem.time, userTimezone),
              timeZone: userTimezone,
            };
            eventData.end = {
              dateTime: formatEndTimeForGoogle(dateItem.date, dateItem.time, userTimezone),
              timeZone: userTimezone,
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
          originalTime: dates.find(d => d.id === dateItem.id)?.time,
          adjustedTime: dateItem.time !== dates.find(d => d.id === dateItem.id)?.time ? dateItem.time : undefined,
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
        adjustmentsMade: adjustedDates.some(d => d.time !== dates.find(orig => orig.id === d.id)?.time),
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