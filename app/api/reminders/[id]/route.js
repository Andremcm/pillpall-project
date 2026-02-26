import { prisma } from '@/lib/prisma';

// PUT /api/reminders/[id] — edit reminder details
export async function PUT(req, { params }) {
  try {
    const { id } = await params;  // Next.js 15 requires awaiting params
    const reminderId = parseInt(id);
    const { medicine, dosage, frequency, time } = await req.json();

    const reminderTime = parseTimeToDate(time);

    const reminder = await prisma.reminder.findUnique({
      where: { id: reminderId },
      include: { medication: true }
    });

    if (!reminder) return Response.json({ error: 'Not found' }, { status: 404 });

    await prisma.medication.update({
      where: { id: reminder.medicationId },
      data: { name: medicine, dosage, frequency }
    });

    await prisma.reminder.update({
      where: { id: reminderId },
      data: { reminderTime }
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error('PUT error:', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/reminders/[id]
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;  // Next.js 15 requires awaiting params
    const reminderId = parseInt(id);

    const reminder = await prisma.reminder.findUnique({ where: { id: reminderId } });
    if (!reminder) return Response.json({ error: 'Not found' }, { status: 404 });

    // Delete logs first, then reminder, then medication
    await prisma.log.deleteMany({ where: { reminderId } });
    await prisma.reminder.delete({ where: { id: reminderId } });
    await prisma.medication.delete({ where: { id: reminder.medicationId } });

    return Response.json({ success: true });
  } catch (err) {
    console.error('DELETE error:', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

function parseTimeToDate(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}