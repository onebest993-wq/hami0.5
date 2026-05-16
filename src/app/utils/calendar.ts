/**
 * THE EXTERNAL SENSES PROTOCOL: CALENDAR SYNC
 * This utility bridges the gap between the Web App and the Native Device Calendar.
 * It uses the 'Universal ICS' standard which works on iOS, Android, macOS, and Windows.
 */

export interface CalendarEvent {
    title: string;
    description?: string;
    startDate: Date;
    endDate?: Date;
    location?: string;
    allDay?: boolean;
}

/**
 * Adds an event to the user's native calendar (via ICS file download or Intent).
 * This is the Web-compatible version of "Native Device Calendar Sync".
 */
export const addToCalendar = (event: CalendarEvent) => {
    // 1. Format Dates for ICS (YYYYMMDDTHHMMSSZ)
    const formatDate = (date: Date) => {
        return date.toISOString().replace(/-|:|\.\d\d\d/g, "");
    };

    const start = formatDate(event.startDate);
    const end = event.endDate ? formatDate(event.endDate) : formatDate(new Date(event.startDate.getTime() + 60 * 60 * 1000)); // Default 1 hour
    
    // 2. Build ICS Content
    const icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Hami Legal App//Iraqi Lawyer System//AR",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        `SUMMARY:${event.title}`,
        `UID:${Date.now()}@hami.app`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `DESCRIPTION:${event.description || "موعد قانوني من تطبيق حامي"}`,
        `LOCATION:${event.location || "المحكمة المختصة"}`,
        "STATUS:CONFIRMED",
        "END:VEVENT",
        "END:VCALENDAR"
    ].join("\r\n");

    // 3. Create Blob and Link
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    
    // 4. Trigger Download (Mobile devices will open this in Calendar App)
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${event.title}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 5. Fallback/Alternative: Google Calendar Web Intent (for Desktop convenience)
    // We could offer this, but ICS is more "Native". 
    // Let's rely on ICS as it covers Outlook, Apple Calendar, and Google Calendar (mobile).
};
