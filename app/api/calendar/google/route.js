import { getServerSession } from 'next-auth';
import { google } from 'googleapis';

// Helper: build OAuth2 client from session token
function getOAuthClient(accessToken) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ access_token: accessToken });
  return auth;
}

// GET /api/calendar/google — list upcoming events
export async function GET(req) {
  const session = await getServerSession();
  if (!session?.accessToken) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const auth = getOAuthClient(session.accessToken);
    const calendar = google.calendar({ version: 'v3', auth });

    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return Response.json(res.data.items || []);
  } catch (err) {
    console.error('Google Calendar GET error:', err);
    return Response.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

// POST /api/calendar/google — create an event from a reminder
export async function POST(req) {
  const session = await getServerSession();
  if (!session?.accessToken) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { medicine, dosage, time, frequency, endDate } = await req.json();

    const auth = getOAuthClient(session.accessToken);
    const calendar = google.calendar({ version: 'v3', auth });

    // Build start datetime for today at the reminder time
    const [hours, minutes] = time.split(':').map(Number);
    const start = new Date();
    start.setHours(hours, minutes, 0, 0);
    const end = new Date(start.getTime() + 30 * 60000); // 30 min duration

    // Build recurrence rule
    let recurrence = [];
    if (frequency === 'daily') {
      recurrence = endDate
        ? [`RRULE:FREQ=DAILY;UNTIL=${endDate.replace(/-/g, '')}T235959Z`]
        : ['RRULE:FREQ=DAILY'];
    } else if (frequency === 'twice-daily') {
      recurrence = endDate
        ? [`RRULE:FREQ=DAILY;UNTIL=${endDate.replace(/-/g, '')}T235959Z`]
        : ['RRULE:FREQ=DAILY'];
    } else if (frequency === 'weekly') {
      recurrence = endDate
        ? [`RRULE:FREQ=WEEKLY;UNTIL=${endDate.replace(/-/g, '')}T235959Z`]
        : ['RRULE:FREQ=WEEKLY'];
    }

    const event = {
      summary: `💊 ${medicine}`,
      description: `Dosage: ${dosage}\nFrequency: ${frequency}`,
      start: {
        dateTime: start.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: end.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      recurrence,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 10 },
          { method: 'email', minutes: 30 },
        ],
      },
    };

    const created = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    return Response.json({ success: true, eventId: created.data.id }, { status: 201 });
  } catch (err) {
    console.error('Google Calendar POST error:', err);
    return Response.json({ error: 'Failed to create event' }, { status: 500 });
  }
}

// DELETE /api/calendar/google?eventId=xxx — remove an event
export async function DELETE(req) {
  const session = await getServerSession();
  if (!session?.accessToken) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');
    if (!eventId) return Response.json({ error: 'eventId required' }, { status: 400 });

    const auth = getOAuthClient(session.accessToken);
    const calendar = google.calendar({ version: 'v3', auth });

    await calendar.events.delete({ calendarId: 'primary', eventId });
    return Response.json({ success: true });
  } catch (err) {
    console.error('Google Calendar DELETE error:', err);
    return Response.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}