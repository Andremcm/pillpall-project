import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
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

// Handles both formats: JSON array [{date,eventId}] and plain string
function parseEventIds(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(e => e.eventId).filter(Boolean);
    return [raw];
  } catch {
    return [raw];
  }
}

// PUT /api/reminders/[id]
export async function PUT(req, { params }) {
  try {
    const { id: rawId } = await params;
    const id = parseInt(rawId);
    const { medicine, dosage, frequency, time, secondTime, customDates, color, endDate, googleEventId } = await req.json();

    const reminderTime = parseTimeToDate(time);
    const secondReminderTime = secondTime ? parseTimeToDate(secondTime) : null;
    const dayOfWeek = frequency === 'weekly' ? new Date().getDay() : null;
    const customDatesJson = frequency === 'custom' && customDates?.length ? JSON.stringify(customDates) : null;
    const endDateVal = ['daily', 'twice-daily'].includes(frequency) && endDate ? endDate : null;

    const reminder = await prisma.reminder.findUnique({
      where: { id },
      include: { medication: true },
    });

    if (!reminder) return Response.json({ error: 'Reminder not found' }, { status: 404 });

    await prisma.medication.update({
      where: { id: reminder.medicationId },
      data: {
        name: medicine,
        dosage,
        frequency,
        color: color || reminder.medication.color,
        endDate: endDateVal,
        dayOfWeek,
        customDates: customDatesJson,
      },
    });

    const updatedReminder = await prisma.reminder.update({
      where: { id },
      data: {
        reminderTime,
        secondTime: secondReminderTime,
        ...(googleEventId !== undefined && { googleEventId }),
      },
    });

    return Response.json({ success: true, reminder: updatedReminder });
  } catch (err) {
    console.error('PUT reminder error:', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/reminders/[id]
export async function DELETE(req, { params }) {
  try {
    const { id: rawId } = await params;
    const id = parseInt(rawId);

    const reminder = await prisma.reminder.findUnique({
      where: { id },
      include: { medication: true },
    });

    if (!reminder) return Response.json({ error: 'Reminder not found' }, { status: 404 });

    // ✅ Delete from Google Calendar server-side using getServerSession
    // This works from ANY page — no need for client to pass tokens
    if (reminder.googleEventId) {
      try {
        const session = await getServerSession(authOptions);
        if (session?.accessToken) {
          const eventIds = parseEventIds(reminder.googleEventId);
          const auth = getOAuthClient(session.accessToken, session.refreshToken);
          const calendar = google.calendar({ version: 'v3', auth });

          await Promise.allSettled(
            eventIds.map(eventId =>
              calendar.events.delete({ calendarId: 'primary', eventId })
                .catch(err => {
                  // 404/410 = already deleted from Google Cal manually, that's fine
                  if (err.code !== 404 && err.code !== 410) {
                    console.warn('GCal delete error for event', eventId, err.message);
                  }
                })
            )
          );
        }
      } catch (gcalErr) {
        // Don't block DB delete if Google Cal fails
        console.warn('Google Calendar delete failed (continuing with DB delete):', gcalErr.message);
      }
    }

    // ✅ Delete from DB (always runs regardless of Google Cal result)
    await prisma.log.deleteMany({ where: { reminderId: id } });
    await prisma.reminder.delete({ where: { id } });
    await prisma.medication.delete({ where: { id: reminder.medicationId } });

    return Response.json({ success: true });
  } catch (err) {
    console.error('DELETE reminder error:', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

function parseTimeToDate(timeStr) {
  if (!timeStr) return new Date();

  // Handle "8:00 AM" / "08:00 PM" format
  const ampmMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1]);
    const minutes = parseInt(ampmMatch[2]);
    const ampm = ampmMatch[3].toUpperCase();
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    return d;
  }

  // Handle "HH:MM" 24hr format
  const [hours, minutes] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}