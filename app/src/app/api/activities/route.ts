import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const domain = request.nextUrl.searchParams.get("domain");
  const where: { storeId: string; domain?: string } = { storeId: session.storeId };
  if (domain) where.domain = domain;

  const activities = await prisma.activity.findMany({
    where,
    orderBy: { name: "asc" },
  });
  return NextResponse.json(activities);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const { name, domain } = await request.json();
  if (!name?.trim() || !domain) {
    return NextResponse.json({ error: "活動名と領域を入力してください" }, { status: 400 });
  }

  const activity = await prisma.activity.create({
    data: { name: name.trim(), domain, storeId: session.storeId },
  });
  return NextResponse.json(activity);
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const { id } = await request.json();
  await prisma.activity.deleteMany({
    where: { id, storeId: session.storeId },
  });
  return NextResponse.json({ ok: true });
}
