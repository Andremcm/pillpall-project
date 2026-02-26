import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  try {
    const { fullName, email, password } = await req.json();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return Response.json({ error: 'An account with this email already exists.' }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name: fullName, email, password: hashed }
    });

    return Response.json({ id: user.id, name: user.name, email: user.email }, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Server error.' }, { status: 500 });
  }
}