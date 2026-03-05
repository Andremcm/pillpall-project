import { google } from 'googleapis';

function getOAuthClient(accessToken, refreshToken = null) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  auth.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  return auth;
}

// POST /api/calendar/google — create OR update (idempotent via extendedProperties)
export async function POST(req) {
  try {
    const body = await req.json();
    const { medicine, dosage, time, frequency, endDate, date, eventId, accessToken, refreshToken, uniqueKey } = body;

    if (!accessToken) return Response.json({ error: 'Not authenticated' }, { status: 401 });

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

    const dateStr = date || new Date().toISOString().split('T')[0];
    const paddedHours = String(hours).padStart(2, '0');
    const paddedMinutes = String(minutes).padStart(2, '0');
    const start = new Date(`${dateStr}T${paddedHours}:${paddedMinutes}:00+08:00`);
    const end = new Date(start.getTime() + 30 * 60000);
    const tz = 'Asia/Manila';

    let recurrence = [];
    if (frequency === 'daily' || frequency === 'twice-daily') {
      recurrence = endDate
        ? [`RRULE:FREQ=DAILY;UNTIL=${endDate.replace(/-/g, '')}T235959Z`]
        : ['RRULE:FREQ=DAILY'];
    } else if (frequency === 'weekly') {
      const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
      recurrence = endDate
        ? [`RRULE:FREQ=WEEKLY;BYDAY=${days[start.getDay()]};UNTIL=${endDate.replace(/-/g, '')}T235959Z`]
        : [`RRULE:FREQ=WEEKLY;BYDAY=${days[start.getDay()]}`];
    }
    // custom frequency = no recurrence, single event per date

    // ✅ uniqueKey is used as a stable fingerprint: "reminderId_date" or "reminderId"
    // This lets us find and update existing events without needing to store the eventId client-side
    const fingerprint = uniqueKey || null;

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
      // ✅ Store fingerprint in extendedProperties so we can find this event later
      ...(fingerprint && {
        extendedProperties: {
          private: { pillpalKey: fingerprint }
        }
      }),
    };

    let resultEventId;

    if (eventId) {
      // We have an eventId — try to update it directly
      try {
        const updated = await calendar.events.update({
          calendarId: 'primary', eventId, resource: eventBody,
        });
        resultEventId = updated.data.id;
      } catch (updateErr) {
        // Event may have been manually deleted from Google Calendar — create fresh
        if (updateErr.code === 404 || updateErr.code === 410) {
          const created = await calendar.events.insert({
            calendarId: 'primary', resource: eventBody,
          });
          resultEventId = created.data.id;
        } else {
          throw updateErr;
        }
      }
    } else if (fingerprint) {
      // ✅ No eventId stored — search by fingerprint to avoid creating duplicates
      try {
        const existing = await calendar.events.list({
          calendarId: 'primary',
          privateExtendedProperty: `pillpalKey=${fingerprint}`,
          maxResults: 1,
          singleEvents: true,
        });
        const found = existing.data.items?.[0];
        if (found) {
          // Already exists — update it
          const updated = await calendar.events.update({
            calendarId: 'primary', eventId: found.id, resource: eventBody,
          });
          resultEventId = updated.data.id;
        } else {
          // Truly new — create it
          const created = await calendar.events.insert({
            calendarId: 'primary', resource: eventBody,
          });
          resultEventId = created.data.id;
        }
      } catch {
        // Fallback: just create
        const created = await calendar.events.insert({
          calendarId: 'primary', resource: eventBody,
        });
        resultEventId = created.data.id;
      }
    } else {
      // No eventId, no fingerprint — plain create
      const created = await calendar.events.insert({
        calendarId: 'primary', resource: eventBody,
      });
      resultEventId = created.data.id;
    }

    return Response.json({ success: true, eventId: resultEventId }, { status: 201 });
  } catch (err) {
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

    try {
      await calendar.events.delete({ calendarId: 'primary', eventId });
    } catch (deleteErr) {
      // 404/410 = already deleted, that's fine
      if (deleteErr.code !== 404 && deleteErr.code !== 410) throw deleteErr;
    }

    return Response.json({ success: true });
  } catch (err) {
    if (err.message?.includes('invalid_grant') || err.message?.includes('Invalid Credentials')) {
      return Response.json({ error: 'Token expired. Please reconnect your Google account.' }, { status: 401 });
    }
    console.error('Google Calendar DELETE error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}