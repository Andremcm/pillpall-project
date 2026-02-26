import { prisma } from '@/lib/prisma';

// GET /api/history?userId=1
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = parseInt(searchParams.get('userId'));
    if (!userId) return Response.json({ error: 'userId required' }, { status: 400 });

    const logs = await prisma.log.findMany({
      where: {
        reminder: {
          medication: { userId }
        }
      },
      include: {
        reminder: {
          include: { medication: true }
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    const history = logs.map(log => ({
      logId: log.id,
      status: log.status,
      timestamp: log.timestamp,
      medicine: log.reminder.medication.name,
      dosage: log.reminder.medication.dosage,
      frequency: log.reminder.medication.frequency,
      scheduledTime: log.reminder.reminderTime
    }));

    return Response.json(history);
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}