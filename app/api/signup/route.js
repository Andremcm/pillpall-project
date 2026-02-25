import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

export async function POST(req) {
  try {
    const { fullName, email, password } = await req.json();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: fullName,
        email,
        password: hashedPassword,
        role: 'user'
      }
    });

    return NextResponse.json({ message: 'Account created!', userId: user.id }, { status: 201 });
  } catch (err) {
    console.error('SIGNUP ERROR:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}