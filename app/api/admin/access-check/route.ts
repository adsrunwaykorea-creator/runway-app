import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/require-admin';

export async function GET(request: Request) {
  const auth = await requireAdminUser(request);
  if (auth.error) {
    const status = auth.error.status;
    const body = await auth.error.json();
    return NextResponse.json({
      allowed: false,
      reason: body?.message ?? 'access denied',
      status,
    });
  }

  return NextResponse.json({ allowed: true });
}
