import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const staff = await prisma.staff.findMany({
    where: { storeId: session.storeId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(staff);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const { name } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "名前を入力してください" }, { status: 400 });
  }

  const staff = await prisma.staff.create({
    data: { name: name.trim(), storeId: session.storeId },
  });
  return NextResponse.json(staff);
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const { id } = await request.json();
  await prisma.staff.deleteMany({
    where: { id, storeId: session.storeId },
  });
  return NextResponse.json({ ok: true });
}
