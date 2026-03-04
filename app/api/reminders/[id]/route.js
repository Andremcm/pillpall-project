import { prisma } from '@/lib/prisma';

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

    await prisma.log.deleteMany({ where: { reminderId: id } });        // ← was reminderLog
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