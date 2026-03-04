import { google } from 'googleapis';

function getOAuthClient(accessToken, refreshToken = null) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  auth.setCredentials({ 
    access_token: accessToken,
    refresh_token: refreshToken
  });
  return auth;
}

// POST /api/calendar/google — create OR update
export async function POST(req) {
  try {
    const body = await req.json();
    const { medicine, dosage, time, frequency, endDate, date, eventId, accessToken, refreshToken } = body;

    if (!accessToken) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const auth = getOAuthClient(accessToken, refreshToken);
    const calendar = google.calendar({ version: 'v3', auth });

    // Parse time — supports "8:00 AM" or "08:00"
    const timeMatch = time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!timeMatch) return Response.json({ error: 'Invalid time' }, { status: 400 });

    let hours = parseInt(timeMatch[1]);
    let minutes = parseInt(timeMatch[2]);
    const ampm = timeMatch[3]?.toUpperCase();
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    const [year, month, day] = (date || new Date().toISOString().split('T')[0]).split('-').map(Number);
    const start = new Date(year, month - 1, day, hours, minutes, 0);
    const end   = new Date(start.getTime() + 30 * 60000);
    const tz    = 'Asia/Manila';

    let recurrence = [];
    if (frequency === 'daily' || frequency === 'twice-daily') {
      recurrence = endDate
        ? [`RRULE:FREQ=DAILY;UNTIL=${endDate.replace(/-/g,'')}T235959Z`]
        : ['RRULE:FREQ=DAILY'];
    } else if (frequency === 'weekly') {
      const days = ['SU','MO','TU','WE','TH','FR','SA'];
      recurrence = endDate
        ? [`RRULE:FREQ=WEEKLY;BYDAY=${days[start.getDay()]};UNTIL=${endDate.replace(/-/g,'')}T235959Z`]
        : [`RRULE:FREQ=WEEKLY;BYDAY=${days[start.getDay()]}`];
    }

    const eventBody = {
      summary: `💊 ${medicine}`,
      description: `Dosage: ${dosage}\nFrequency: ${frequency}`,
      start: { dateTime: start.toISOString(), timeZone: tz },
      end:   { dateTime: end.toISOString(),   timeZone: tz },
      recurrence,
      reminders: {
        useDefault: false,
        overrides: [{ method: 'popup', minutes: 10 }],
      },
    };

    let resultEventId;
    if (eventId) {
      const updated = await calendar.events.update({
        calendarId: 'primary', eventId, resource: eventBody,
      });
      resultEventId = updated.data.id;
    } else {
      const created = await calendar.events.insert({
        calendarId: 'primary', resource: eventBody,
      });
      resultEventId = created.data.id;
    }

    return Response.json({ success: true, eventId: resultEventId }, { status: 201 });
  } catch (err) {
    // Handle expired token explicitly
    if (err.message?.includes('invalid_grant') || err.message?.includes('Invalid Credentials')) {
      return Response.json({ error: 'Token expired. Please reconnect your Google account.' }, { status: 401 });
    }
    console.error('Google Calendar POST error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/calendar/google?eventId=xxx&accessToken=xxx&refreshToken=xxx
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');

    if (!accessToken) return Response.json({ error: 'Not authenticated' }, { status: 401 });
    if (!eventId) return Response.json({ error: 'eventId required' }, { status: 400 });

    const auth = getOAuthClient(accessToken, refreshToken);
    const calendar = google.calendar({ version: 'v3', auth });
    await calendar.events.delete({ calendarId: 'primary', eventId });
    return Response.json({ success: true });
  } catch (err) {
    // Handle expired token explicitly
    if (err.message?.includes('invalid_grant') || err.message?.includes('Invalid Credentials')) {
      return Response.json({ error: 'Token expired. Please reconnect your Google account.' }, { status: 401 });
    }
    console.error('Google Calendar DELETE error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}