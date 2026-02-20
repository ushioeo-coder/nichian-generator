import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// 非表示にしたデフォルト活動をすべて復元する
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const result = await prisma.hiddenActivity.deleteMany({
    where: { storeId: session.storeId },
  });

  return NextResponse.json({
    restored: result.count,
    message: result.count > 0
      ? `${result.count}件のデフォルト活動を復元しました`
      : "非表示のデフォルト活動はありません",
  });
}
