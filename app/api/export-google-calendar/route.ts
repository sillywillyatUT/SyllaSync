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

function formatDateForGoogle(dateString: string, timeString?: string): string {
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

export async function POST(request: NextRequest) {
  try {
    const { dates }: { dates: ExtractedDate[] } = await request.json();

    if (!dates || dates.length === 0) {
      return NextResponse.json({ error: "No dates provided" }, { status: 400 });
    }

    // Create Google Calendar URLs for each event
    const googleCalendarUrls = dates
      .map((dateItem) => {
        if (!dateItem.date && !dateItem.recurrence) return null;

        const params = new URLSearchParams();
        params.set("action", "TEMPLATE");
        params.set("text", dateItem.title);

        if (dateItem.date) {
          const startDate = formatDateForGoogle(dateItem.date, dateItem.time);
          const endDate = formatDateForGoogle(dateItem.date, dateItem.time);
          params.set("dates", `${startDate}/${endDate}`);
        }

        if (dateItem.description) {
          params.set(
            "details",
            `${dateItem.description} (Type: ${dateItem.type})`,
          );
        }

        if (dateItem.location) {
          params.set("location", dateItem.location);
        }

        if (dateItem.recurrence) {
          const recurrenceText = `Recurring: ${dateItem.recurrence}`;
          const existingDetails = params.get("details") || "";
          params.set("details", existingDetails + "\n" + recurrenceText);
        }

        return `https://calendar.google.com/calendar/render?${params.toString()}`;
      })
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      urls: googleCalendarUrls,
      message: "Google Calendar URLs generated successfully",
    });
  } catch (error) {
    console.error("Error generating Google Calendar URLs:", error);
    return NextResponse.json(
      { error: "Failed to generate Google Calendar URLs" },
      { status: 500 },
    );
  }
}
