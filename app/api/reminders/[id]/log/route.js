import { prisma } from '@/lib/prisma';

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const reminderId = parseInt(id);
    const { taken, isSecond } = await req.json();

    const status = taken ? 'taken' : 'skipped';

    // Build takenDate: "YYYY-MM-DD" or "YYYY-MM-DD_2" for second dose
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const takenDate = isSecond ? dateStr + '_2' : dateStr;

    // Remove any existing log for this reminder+date (upsert behavior)
    await prisma.log.deleteMany({
      where: { reminderId, takenDate }
    });

    if (taken) {
      await prisma.log.create({
        data: { reminderId, status, timestamp: now, takenDate }
      });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error('LOG error:', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}