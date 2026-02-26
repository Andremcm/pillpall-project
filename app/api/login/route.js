import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return Response.json({ error: 'No account found with that email.' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return Response.json({ error: 'Incorrect password.' }, { status: 401 });
    }

    return Response.json({
      id: user.id,
      name: user.name,
      email: user.email
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Server error.' }, { status: 500 });
  }
}