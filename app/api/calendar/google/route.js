import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { google } from 'googleapis';

function getOAuthClient(accessToken) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ access_token: accessToken });
  return auth;
}

// GET /api/calendar/google
export async function GET(req) {
  const session = await getServerSession(authOptions);
  console.log('GET session:', JSON.stringify(session, null, 2));

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

// POST /api/calendar/google
export async function POST(req) {
  const session = await getServerSession(authOptions);
  console.log('POST session:', JSON.stringify(session, null, 2));
  console.log('POST accessToken:', session?.accessToken);

  if (!session?.accessToken) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { medicine, dosage, time, frequency, endDate } = await req.json();

    const auth = getOAuthClient(session.accessToken);
    const calendar = google.calendar({ version: 'v3', auth });

    // Parse time — handle both "HH:MM" and "H:MM AM/PM" formats
    let hours, minutes;
    const ampmMatch = String(time).match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (ampmMatch) {
      hours = parseInt(ampmMatch[1]);
      minutes = parseInt(ampmMatch[2]);
      const ampm = ampmMatch[3].toUpperCase();
      if (ampm === 'PM' && hours !== 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
    } else {
      [hours, minutes] = String(time).split(':').map(Number);
    }

    const start = new Date();
    start.setHours(hours, minutes, 0, 0);
    const end = new Date(start.getTime() + 30 * 60000);

    let recurrence = [];
    if (frequency === 'daily' || frequency === 'twice-daily') {
      recurrence = endDate
        ? [`RRULE:FREQ=DAILY;UNTIL=${endDate.replace(/-/g, '')}T235959Z`]
        : ['RRULE:FREQ=DAILY'];
    } else if (frequency === 'weekly') {
      recurrence = endDate
        ? [`RRULE:FREQ=WEEKLY;UNTIL=${endDate.replace(/-/g, '')}T235959Z`]
        : ['RRULE:FREQ=WEEKLY'];
    }

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const event = {
      summary: `💊 ${medicine}`,
      description: `Dosage: ${dosage}\nFrequency: ${frequency}\nManaged by PillPal`,
      start: { dateTime: start.toISOString(), timeZone },
      end:   { dateTime: end.toISOString(),   timeZone },
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

// DELETE /api/calendar/google?eventId=xxx
export async function DELETE(req) {
  const session = await getServerSession(authOptions);
  console.log('DELETE session:', JSON.stringify(session, null, 2));

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