import { prisma } from '@/lib/prisma';

const VALID_TYPES = ['bug', 'feedback', 'feature'];

// POST /api/feedback
export async function POST(req) {
  try {
    const { type, message, userEmail, userId } = await req.json();

    if (!message || message.trim().length < 5) {
      return Response.json({ error: 'Message is too short.' }, { status: 400 });
    }

    if (!VALID_TYPES.includes(type)) {
      return Response.json({ error: 'Invalid feedback type.' }, { status: 400 });
    }

    const feedback = await prisma.feedback.create({
      data: {
        type,
        message: message.trim(),
        userEmail: userEmail?.trim() || null,
        userId: userId ? parseInt(userId) : null,
      },
    });

    return Response.json({ success: true, id: feedback.id }, { status: 201 });
  } catch (err) {
    console.error('POST feedback error:', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

// GET /api/feedback — view all submissions (you can call this to review feedback)
export async function GET() {
  try {
    const feedbacks = await prisma.feedback.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    return Response.json(feedbacks);
  } catch (err) {
    console.error('GET feedback error:', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}