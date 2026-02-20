import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { defaultActivities } from "@/lib/defaultActivities";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const domain = request.nextUrl.searchParams.get("domain");

  // 非表示にしたデフォルト活動を取得
  const hiddenWhere: { storeId: string; domain?: string } = { storeId: session.storeId };
  if (domain) hiddenWhere.domain = domain;
  const hidden = await prisma.hiddenActivity.findMany({ where: hiddenWhere });
  const hiddenSet = new Set(hidden.map((h) => `${h.domain}:${h.name}`));

  // デフォルト活動をフィルタリング（非表示除外、領域フィルタ）
  const defaults = defaultActivities
    .map((a, i) => ({ ...a, _index: i }))
    .filter((a) => !domain || a.domain === domain)
    .filter((a) => !hiddenSet.has(`${a.domain}:${a.name}`))
    .map((a) => ({
      id: `default-${a._index}`,
      name: a.name,
      domain: a.domain,
      isDefault: true,
    }));

  // カスタム活動を取得
  const customWhere: { storeId: string; domain?: string } = { storeId: session.storeId };
  if (domain) customWhere.domain = domain;
  const custom = await prisma.activity.findMany({
    where: customWhere,
    orderBy: { name: "asc" },
  });

  const activities = [
    ...defaults,
    ...custom.map((c) => ({ ...c, isDefault: false })),
  ];

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
  return NextResponse.json({ ...activity, isDefault: false });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const { id } = await request.json();

  if (id.startsWith("default-")) {
    // デフォルト活動 → 非表示リストに追加
    const index = parseInt(id.replace("default-", ""));
    const activity = defaultActivities[index];
    if (activity) {
      await prisma.hiddenActivity.upsert({
        where: {
          storeId_domain_name: {
            storeId: session.storeId,
            domain: activity.domain,
            name: activity.name,
          },
        },
        update: {},
        create: {
          name: activity.name,
          domain: activity.domain,
          storeId: session.storeId,
        },
      });
    }
  } else {
    // カスタム活動 → DBから削除
    await prisma.activity.deleteMany({
      where: { id, storeId: session.storeId },
    });
  }

  return NextResponse.json({ ok: true });
}
