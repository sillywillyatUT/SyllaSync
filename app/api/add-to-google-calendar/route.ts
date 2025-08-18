// app/api/add-to-google-calendar/route.ts (or pages/api/add-to-google-calendar.ts)
import { NextRequest, NextResponse } from "next/server";

// app/api/add-to-google-calendar/route.ts

// DUMMY CODE: This is a minimal example that does not connect to Supabase or Google Calendar.
export async function POST(req: NextRequest) {
  try {
    const { events } = await req.json();

    if (!events || events.length === 0) {
      return NextResponse.json({ error: "No events provided" }, { status: 400 });
    }

    // Just echo back for now (no Supabase, no Google API)
    return NextResponse.json({
      success: true,
      message: `${events.length} events received.`,
      events,
    });
  } catch (error) {
    console.error("Error in minimal route:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
// Uncomment the following code when you want to integrate with Supabase and Google Calendar

// import { createClient } from "../../../supabase/server"; // adjust as needed
// import { google } from "googleapis";

// export async function POST(req: NextRequest) {
//   try {
//     const { events } = await req.json();

//     if (!events || events.length === 0) {
//       return NextResponse.json({ error: "No events provided" }, { status: 400 });
//     }

//     const supabase = await createClient();
//     const {
//       data: { session },
//     } = await supabase.auth.getSession();

//     if (!session?.provider_token) {
//       return NextResponse.json({ error: "No Google access token in session" }, { status: 401 });
//     }

//     const auth = new google.auth.OAuth2();
//     auth.setCredentials({ access_token: session.provider_token });
//     const calendar = google.calendar({ version: "v3", auth });

//     const insertedEvents = [];

//     for (const event of events) {
//       // Parse date and time into ISO strings
//       const startDate = parseDateTime(event.date, event.time);
//       const endDate = event.time
//         ? parseDateTime(event.date, event.time.split("–")[1]?.trim() || "")
//         : new Date(new Date(event.date).getTime() + 60 * 60 * 1000);

//       const googleEvent = {
//         summary: event.title,
//         description: event.description || "",
//         location: event.location || "",
//         start: { dateTime: startDate.toISOString(), timeZone: "America/Chicago" },
//         end: { dateTime: endDate.toISOString(), timeZone: "America/Chicago" },
//         recurrence: event.recurrence ? ["RRULE:FREQ=WEEKLY"] : undefined,
//       };

//       const response = await calendar.events.insert({
//         calendarId: "primary",
//         requestBody: googleEvent,
//       });

//       insertedEvents.push(response.data);
//     }

//     return NextResponse.json({
//       success: true,
//       message: `${insertedEvents.length} events added to your Google Calendar.`,
//       insertedEvents,
//     });
//   } catch (error) {
//     console.error("Error adding events to Google Calendar:", error);
//     return NextResponse.json({ error: "Failed to add events" }, { status: 500 });
//   }
// }

// // Helper to parse date + time string into a Date object
// function parseDateTime(dateStr: string, timeStr?: string): Date {
//   if (!timeStr) return new Date(dateStr);

//   // Example: "12:00 PM" or "3:30 AM"
//   const [time, modifier] = timeStr.split(" ");
//   let [hours, minutes] = time.split(":").map(Number);
//   if (modifier === "PM" && hours !== 12) hours += 12;
//   if (modifier === "AM" && hours === 12) hours = 0;

//   const date = new Date(dateStr);
//   date.setHours(hours, minutes || 0, 0, 0);
//   return date;
// }
