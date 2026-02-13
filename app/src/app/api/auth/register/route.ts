import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createToken } from "@/lib/auth";
import { defaultActivities } from "@/lib/defaultActivities";

export async function POST(request: NextRequest) {
  const { name, loginId, password } = await request.json();

  const existing = await prisma.store.findUnique({ where: { loginId } });
  if (existing) {
    return NextResponse.json({ error: "このログインIDは既に使用されています" }, { status: 400 });
  }

  const hashedPassword = await hashPassword(password);

  // トランザクションで店舗作成とデフォルト活動登録を一括実行
  const store = await prisma.$transaction(async (tx) => {
    const newStore = await tx.store.create({
      data: { name, loginId, password: hashedPassword },
    });

    if (defaultActivities.length > 0) {
      await tx.activity.createMany({
        data: defaultActivities.map((a) => ({
          name: a.name,
          domain: a.domain,
          storeId: newStore.id,
        })),
      });
    }

    return newStore;
  });

  const token = createToken({ storeId: store.id, storeName: store.name });

  const response = NextResponse.json({ storeName: store.name });
  response.cookies.set("auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return response;
}
