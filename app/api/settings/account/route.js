import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function PUT(req) {
  try {
    const { userId, name, currentPassword, newPassword } = await req.json();
    if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
    if (!user) return Response.json({ error: 'User not found' }, { status: 404 });

    const updateData = {};

    // Update name if provided
    if (name && name.trim()) {
      updateData.name = name.trim();
    }

    // Update password if provided
    if (newPassword) {
      if (!currentPassword) {
        return Response.json({ error: 'Current password is required to set a new password' }, { status: 400 });
      }
      const passwordMatch = await bcrypt.compare(currentPassword, user.password);
      if (!passwordMatch) {
        return Response.json({ error: 'Current password is incorrect' }, { status: 400 });
      }
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(updateData).length === 0) {
      return Response.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: updateData,
      select: { id: true, name: true, email: true }
    });

    return Response.json(updated);
  } catch (err) {
    console.error('Settings account error:', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}