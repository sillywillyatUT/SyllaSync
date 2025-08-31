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

// Improved time parsing with better validation and fallbacks
function parseTimeString(timeStr: string): { hours: number; minutes: number; isValid: boolean } {
  if (!timeStr || timeStr.trim() === '') {
    console.warn('Empty time string provided');
    return { hours: 9, minutes: 0, isValid: false }; // Default to 9 AM
  }

  const cleanTime = timeStr.trim().toLowerCase();
  console.log('Parsing individual time:', cleanTime);
  
  // Handle special cases first
  if (cleanTime === 'noon') {
    return { hours: 12, minutes: 0, isValid: true };
  }
  if (cleanTime === 'midnight') {
    return { hours: 0, minutes: 0, isValid: true };
  }
  
  // Extract AM/PM indicator with better regex
  const amPmMatch = cleanTime.match(/\b(am|pm)\b/);
  const period = amPmMatch ? amPmMatch[1].toUpperCase() : '';
  
  // Remove AM/PM from time string
  const timeOnly = cleanTime.replace(/\s*(am|pm)\s*/g, '').trim();
  
  // Parse time components with validation
  const timePattern = /^(\d{1,2})(?::(\d{2}))?$/;
  const timeMatch = timeOnly.match(timePattern);
  
  if (!timeMatch) {
    console.warn('Invalid time format:', timeStr);
    return { hours: 9, minutes: 0, isValid: false }; // Default fallback
  }
  
  let hours = parseInt(timeMatch[1]);
  const minutes = parseInt(timeMatch[2]) || 0;
  
  // Validate components
  if (isNaN(hours) || hours < 1 || hours > 12) {
    console.warn('Invalid hours in time string:', timeStr);
    return { hours: 9, minutes: 0, isValid: false };
  }
  
  if (isNaN(minutes) || minutes < 0 || minutes > 59) {
    console.warn('Invalid minutes in time string:', timeStr);
    return { hours: 9, minutes: 0, isValid: false };
  }
  
  // Convert to 24-hour format
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  } else if (!period) {
    // No explicit AM/PM - use safer defaults
    // If hour is 1-7, it's likely PM for academic schedules
    // If hour is 8-11, it's likely AM
    // 12 stays as is (noon)
    if (hours >= 1 && hours <= 7) {
      hours += 12; // Assume PM
    }
    // 8-12 stay as is (8-11 AM, 12 noon)
  }
  
  // Final validation
  if (hours < 0 || hours > 23) {
    console.warn('Hours out of range after conversion:', hours);
    return { hours: 9, minutes: 0, isValid: false };
  }
  
  console.log(`Parsed time: ${timeStr} -> ${hours}:${minutes.toString().padStart(2, '0')}`);
  return { hours, minutes, isValid: true };
}

// Robust time range parsing with comprehensive pattern matching
function parseTimeRange(timeStr: string): { 
  start: { hours: number; minutes: number }, 
  end: { hours: number; minutes: number },
  isValid: boolean 
} {
  if (!timeStr || timeStr.trim() === '') {
    return { 
      start: { hours: 9, minutes: 0 }, 
      end: { hours: 10, minutes: 0 },
      isValid: false
    };
  }

  const cleanTime = timeStr.trim().toLowerCase();
  console.log('Parsing time range:', cleanTime);
  
  // Comprehensive regex patterns for time ranges
  const timeRangePatterns = [
    // Handle "from X to Y" format
    /from\s+([^to]+?)\s+to\s+(.+)/i,
    // Handle various dash types (em dash, en dash, hyphen)
    /([^–\-\u2013\u2014\u2015]+?)\s*[–\-\u2013\u2014\u2015]\s*(.+)/,
    // Handle "X - Y" with spaces
    /([^-]+?)\s*-\s*(.+)/,
  ];
  
  let startStr = '';
  let endStr = '';
  let rangeFound = false;
  
  // Try each pattern
  for (const pattern of timeRangePatterns) {
    const match = cleanTime.match(pattern);
    if (match && match[1] && match[2]) {
      startStr = match[1].trim();
      endStr = match[2].trim();
      rangeFound = true;
      console.log('Range match found:', { startStr, endStr });
      break;
    }
  }
  
  if (!rangeFound) {
    // Single time - parse and add 1 hour duration
    const singleTime = parseTimeString(timeStr);
    const endHours = (singleTime.hours + 1) % 24;
    return {
      start: { hours: singleTime.hours, minutes: singleTime.minutes },
      end: { hours: endHours, minutes: singleTime.minutes },
      isValid: singleTime.isValid
    };
  }
  
  // Smart AM/PM handling for ranges
  let finalStartStr = startStr;
  let finalEndStr = endStr;
  
  // Check if either part has explicit AM/PM
  const startHasAmPm = /\b(am|pm)\b/i.test(startStr);
  const endHasAmPm = /\b(am|pm)\b/i.test(endStr);
  
  if (!startHasAmPm && endHasAmPm) {
    // Only end has AM/PM - infer start period
    const endPeriod = endStr.match(/\b(am|pm)\b/i)?.[1].toLowerCase();
    const startHour = parseInt(startStr.split(':')[0]);
    const endHour = parseInt(endStr.split(':')[0]);
    
    if (endPeriod === 'pm') {
      if (startHour > endHour) {
        // Likely AM to PM transition (e.g., "11:00 - 1:00 PM")
        finalStartStr = startStr + ' am';
      } else {
        // Both PM (e.g., "1:00 - 3:00 PM")
        finalStartStr = startStr + ' pm';
      }
    } else {
      // End is AM
      if (startHour > endHour) {
        // This is unusual but possible (e.g., overnight shift)
        finalStartStr = startStr + ' pm';
      } else {
        // Both AM
        finalStartStr = startStr + ' am';
      }
    }
  } else if (startHasAmPm && !endHasAmPm) {
    // Only start has AM/PM - infer end period
    const startPeriod = startStr.match(/\b(am|pm)\b/i)?.[1].toLowerCase();
    const startHour = parseInt(startStr.split(':')[0]);
    const endHour = parseInt(endStr.split(':')[0]);
    
    if (startPeriod === 'am') {
      if (startHour > endHour) {
        // AM to PM transition
        finalEndStr = endStr + ' pm';
      } else {
        // Both AM
        finalEndStr = endStr + ' am';
      }
    } else {
      // Start is PM
      if (startHour > endHour) {
        // This could be PM to next day AM, but more likely both PM
        finalEndStr = endStr + ' pm';
      } else {
        // Both PM
        finalEndStr = endStr + ' pm';
      }
    }
  } else if (!startHasAmPm && !endHasAmPm) {
    // Neither has AM/PM - use logical defaults
    const startHour = parseInt(startStr.split(':')[0]);
    const endHour = parseInt(endStr.split(':')[0]);
    
    // If start > end, it's likely AM to PM
    if (startHour > endHour && startHour <= 12 && endHour <= 12) {
      finalStartStr = startStr + ' am';
      finalEndStr = endStr + ' pm';
    } else if (startHour >= 1 && startHour <= 7 && endHour >= 1 && endHour <= 7) {
      // Both in typical afternoon class times
      finalStartStr = startStr + ' pm';
      finalEndStr = endStr + ' pm';
    } else if (startHour >= 8 && startHour <= 11 && endHour >= 8 && endHour <= 11) {
      // Both in morning class times
      finalStartStr = startStr + ' am';
      finalEndStr = endStr + ' am';
    } else {
      // Default to PM for academic schedules
      finalStartStr = startStr + ' pm';
      finalEndStr = endStr + ' pm';
    }
  }
  
  // Parse both times
  const startTime = parseTimeString(finalStartStr);
  const endTime = parseTimeString(finalEndStr);
  
  // Validation: ensure end time is after start time
  const startMinutes = startTime.hours * 60 + startTime.minutes;
  const endMinutes = endTime.hours * 60 + endTime.minutes;
  
  if (endMinutes <= startMinutes) {
    console.warn('End time is not after start time, adjusting');
    // Add 1 hour to start time for end time
    const adjustedEndHours = (startTime.hours + 1) % 24;
    return {
      start: { hours: startTime.hours, minutes: startTime.minutes },
      end: { hours: adjustedEndHours, minutes: startTime.minutes },
      isValid: startTime.isValid
    };
  }
  
  console.log(`Parsed range: ${timeStr} -> ${startTime.hours}:${startTime.minutes} to ${endTime.hours}:${endTime.minutes}`);
  
  return {
    start: { hours: startTime.hours, minutes: startTime.minutes },
    end: { hours: endTime.hours, minutes: endTime.minutes },
    isValid: startTime.isValid && endTime.isValid
  };
}

// Function to add minutes to a time string
function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  const range = parseTimeRange(timeStr);
  const totalMinutes = range.start.hours * 60 + range.start.minutes + minutesToAdd;
  
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

// Enhanced date validation
function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

// Improved datetime formatting with better error handling
function formatDateTimeForGoogle(dateString: string, timeString?: string): { 
  datetime: string, 
  isValid: boolean, 
  error?: string 
} {
  console.log('Formatting datetime:', { dateString, timeString });
  
  if (!isValidDate(dateString)) {
    const error = `Invalid date: ${dateString}`;
    console.error(error);
    return { datetime: '', isValid: false, error };
  }
  
  const datePart = new Date(dateString).toISOString().split('T')[0];

  if (timeString && timeString.trim()) {
    const timeRange = parseTimeRange(timeString);
    
    if (!timeRange.isValid) {
      console.warn('Invalid time parsed, using default 9:00 AM');
    }
    
    const { hours, minutes } = timeRange.start;
    
    // Validate parsed time (should be valid from parseTimeRange but double-check)
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      const error = `Invalid time values after parsing: ${hours}:${minutes}`;
      console.error(error);
      // Return a fallback time instead of failing
      const fallbackTime = `${datePart}T09:00:00`;
      console.log('Using fallback datetime:', fallbackTime);
      return { datetime: fallbackTime, isValid: false, error };
    }
    
    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
    const result = `${datePart}T${formattedTime}`;
    console.log('Formatted start datetime:', result);
    return { datetime: result, isValid: timeRange.isValid };
  } else {
    // All-day event
    console.log('All-day event date:', datePart);
    return { datetime: datePart, isValid: true };
  }
}

// Improved end time formatting with better error handling
function formatEndTimeForGoogle(dateString: string, timeString?: string): { 
  datetime: string, 
  isValid: boolean, 
  error?: string 
} {
  console.log('Formatting end time:', { dateString, timeString });
  
  if (!isValidDate(dateString)) {
    const error = `Invalid date: ${dateString}`;
    console.error(error);
    return { datetime: '', isValid: false, error };
  }
  
  const datePart = new Date(dateString).toISOString().split('T')[0];

  if (timeString && timeString.trim()) {
    const timeRange = parseTimeRange(timeString);
    
    if (!timeRange.isValid) {
      console.warn('Invalid time parsed for end time, using default duration');
    }
    
    const { hours, minutes } = timeRange.end;
    
    // Validate parsed time
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      const error = `Invalid end time values: ${hours}:${minutes}`;
      console.error(error);
      // Return fallback: start time + 1 hour
      const startResult = formatDateTimeForGoogle(dateString, timeString);
      if (startResult.isValid && startResult.datetime.includes('T')) {
        const startTime = new Date(startResult.datetime);
        startTime.setHours(startTime.getHours() + 1);
        const fallbackEnd = startTime.toISOString().split('.')[0];
        console.log('Using fallback end datetime:', fallbackEnd);
        return { datetime: fallbackEnd, isValid: false, error };
      }
      return { datetime: '', isValid: false, error };
    }
    
    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
    const result = `${datePart}T${formattedTime}`;
    console.log('Formatted end datetime:', result);
    return { datetime: result, isValid: timeRange.isValid };
  } else {
    // All-day event - end date is next day
    const nextDay = new Date(dateString);
    nextDay.setDate(nextDay.getDate() + 1);
    const result = nextDay.toISOString().split('T')[0];
    console.log('All-day event end date:', result);
    return { datetime: result, isValid: true };
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
    const { dates, accessToken, refreshToken, colorId }: { 
      dates: ExtractedDate[]; 
      accessToken: string; 
      refreshToken?: string;
      colorId?: string;
    } = JSON.parse(body);
    
    console.log('Received dates for export:', dates);
    
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
    const warnings: any[] = [];

    for (const dateItem of adjustedDates) {
      try {
        console.log('Processing event:', dateItem);
        
        if (!dateItem.date && !dateItem.recurrence) {
          errors.push({ 
            event: dateItem.title, 
            error: "No date or recurrence pattern found" 
          });
          continue;
        }

        const hasTime = dateItem.time && dateItem.time.trim() !== "";
        console.log('Event has time:', hasTime, 'Time value:', dateItem.time);

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
          const baseDateString = baseDate.toISOString().split('T')[0];

          if (hasTime) {
            const startResult = formatDateTimeForGoogle(baseDateString, dateItem.time);
            const endResult = formatEndTimeForGoogle(baseDateString, dateItem.time);
            
            if (!startResult.isValid || !endResult.isValid) {
              warnings.push({
                event: dateItem.title,
                warning: `Time parsing issues detected. Using fallback times.`
              });
            }
            
            if (startResult.error || endResult.error) {
              errors.push({ 
                event: dateItem.title, 
                error: `Time formatting error: ${startResult.error || endResult.error}` 
              });
              continue;
            }
            
            eventData.start = { dateTime: startResult.datetime };
            eventData.end = { dateTime: endResult.datetime };
          } else {
            const startResult = formatDateTimeForGoogle(baseDateString);
            const endResult = formatEndTimeForGoogle(baseDateString);
            
            eventData.start = { date: startResult.datetime };
            eventData.end = { date: endResult.datetime };
          }
        } else if (dateItem.date) {
          if (hasTime) {
            const startResult = formatDateTimeForGoogle(dateItem.date, dateItem.time);
            const endResult = formatEndTimeForGoogle(dateItem.date, dateItem.time);
            
            if (!startResult.isValid || !endResult.isValid) {
              warnings.push({
                event: dateItem.title,
                warning: `Time parsing issues detected. Event created with best-guess times.`
              });
            }
            
            if (startResult.error || endResult.error) {
              errors.push({ 
                event: dateItem.title, 
                error: `Time formatting error: ${startResult.error || endResult.error}` 
              });
              continue;
            }
            
            eventData.start = { dateTime: startResult.datetime };
            eventData.end = { dateTime: endResult.datetime };
          } else {
            const startResult = formatDateTimeForGoogle(dateItem.date);
            const endResult = formatEndTimeForGoogle(dateItem.date);
            
            eventData.start = { date: startResult.datetime };
            eventData.end = { date: endResult.datetime };
          }
        }

        console.log('Event data to be sent to Google Calendar:', JSON.stringify(eventData, null, 2));

        const response = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: eventData,
        });

        console.log('Google Calendar response:', {
          id: response.data.id,
          htmlLink: response.data.htmlLink,
          status: response.status,
          summary: response.data.summary,
          start: response.data.start,
          end: response.data.end
        });

        createdEvents.push({
          title: dateItem.title,
          googleEventId: response.data.id,
          htmlLink: response.data.htmlLink,
          originalTime: dates.find(d => d.id === dateItem.id)?.time,
          adjustedTime: dateItem.time !== dates.find(d => d.id === dateItem.id)?.time ? dateItem.time : undefined,
        });

      } catch (eventError) {
        console.error('Error creating calendar event:', eventError);
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
      warnings,
      newAccessToken: tokenResult.token !== accessToken ? tokenResult.token : undefined,
      newRefreshToken: tokenResult.newRefreshToken,
      adjustmentsMade: adjustedDates.some(d => d.time !== dates.find(orig => orig.id === d.id)?.time),
      summary: {
        totalEvents: dates.length,
        successful: createdEvents.length,
        failed: errors.length,
        warnings: warnings.length,
      },
    };

    console.log('Final export result:', finalResult);
    return {
      statusCode: 200,
      body: JSON.stringify(finalResult)
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