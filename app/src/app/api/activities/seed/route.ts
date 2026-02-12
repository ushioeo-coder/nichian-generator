import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { defaultActivities } from "@/lib/defaultActivities";

// 既存店舗にデフォルト活動を追加（既存の活動名と重複しないもののみ）
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const existing = await prisma.activity.findMany({
    where: { storeId: session.storeId },
    select: { name: true, domain: true },
  });

  const existingSet = new Set(existing.map((a) => `${a.domain}:${a.name}`));
  const newActivities = defaultActivities.filter(
    (a) => !existingSet.has(`${a.domain}:${a.name}`)
  );

  if (newActivities.length === 0) {
    return NextResponse.json({ added: 0, message: "すべてのデフォルト活動は既に登録済みです" });
  }

  await prisma.activity.createMany({
    data: newActivities.map((a) => ({
      name: a.name,
      domain: a.domain,
      storeId: session.storeId,
    })),
  });

  return NextResponse.json({ added: newActivities.length, message: `${newActivities.length}件のデフォルト活動を追加しました` });
}
