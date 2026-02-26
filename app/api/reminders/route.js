import { prisma } from '@/lib/prisma';

// GET /api/reminders?userId=1
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = parseInt(searchParams.get('userId'));
    if (!userId) return Response.json({ error: 'userId required' }, { status: 400 });

    const medications = await prisma.medication.findMany({
      where: { userId },
      include: {
        reminders: {
          include: { logs: { orderBy: { timestamp: 'desc' } } }
        }
      }
    });

    const todayStr = getTodayStr();

    const reminders = medications.flatMap(med => {
      return med.reminders.flatMap(rem => {
        const entries = [];
        const takenLog = rem.logs.find(l => l.takenDate === todayStr && l.status === 'taken');

        entries.push({
          id: rem.id,
          medicationId: med.id,
          medicine: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          color: med.color || '#43a047',
          startDate: med.startDate,
          dayOfWeek: med.dayOfWeek,
          customDates: med.customDates ? JSON.parse(med.customDates) : [],
          time: formatTime(rem.reminderTime),
          rawTime: rem.reminderTime,
          taken: !!takenLog,
          isSecond: false
        });

        if (med.frequency === 'twice-daily' && rem.secondTime) {
          const takenLog2 = rem.logs.find(l => l.takenDate === todayStr + '_2' && l.status === 'taken');
          entries.push({
            id: rem.id,
            medicationId: med.id,
            medicine: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            color: med.color || '#43a047',
            startDate: med.startDate,
            dayOfWeek: med.dayOfWeek,
            customDates: med.customDates ? JSON.parse(med.customDates) : [],
            time: formatTime(rem.secondTime),
            rawTime: rem.secondTime,
            taken: !!takenLog2,
            isSecond: true
          });
        }

        return entries;
      });
    });

    return Response.json(reminders);
  } catch (err) {
    console.error('GET reminders error:', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/reminders
export async function POST(req) {
  try {
    const { userId, medicine, dosage, frequency, time, secondTime, customDates, color } = await req.json();
    if (!userId || !medicine || !dosage || !time) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const reminderTime = parseTimeToDate(time);
    const secondReminderTime = secondTime ? parseTimeToDate(secondTime) : null;
    const startDate = new Date();
    const dayOfWeek = frequency === 'weekly' ? startDate.getDay() : null;
    const customDatesJson = frequency === 'custom' && customDates?.length ? JSON.stringify(customDates) : null;

    const medication = await prisma.medication.create({
      data: {
        userId,
        name: medicine,
        dosage,
        frequency,
        color: color || generateColor(medicine),
        startDate,
        dayOfWeek,
        customDates: customDatesJson,
        reminders: {
          create: [{ reminderTime, secondTime: secondReminderTime }]
        }
      },
      include: { reminders: true }
    });

    const rem = medication.reminders[0];
    return Response.json({
      id: rem.id,
      medicationId: medication.id,
      medicine: medication.name,
      dosage: medication.dosage,
      frequency: medication.frequency,
      color: medication.color,
      startDate: medication.startDate,
      dayOfWeek: medication.dayOfWeek,
      customDates: medication.customDates ? JSON.parse(medication.customDates) : [],
      time: formatTime(rem.reminderTime),
      taken: false
    }, { status: 201 });
  } catch (err) {
    console.error('POST reminders error:', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

function parseTimeToDate(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function formatTime(date) {
  if (!date) return '';
  const d = new Date(date);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function generateColor(name) {
  const colors = ['#e53935','#d81b60','#8e24aa','#3949ab','#1e88e5','#00897b','#43a047','#f4511e','#fb8c00','#f6bf26','#33b679','#0b8043'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}