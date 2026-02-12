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
  const store = await prisma.store.create({
    data: { name, loginId, password: hashedPassword },
  });

  // デフォルト活動を新規店舗に登録
  if (defaultActivities.length > 0) {
    await prisma.activity.createMany({
      data: defaultActivities.map((a) => ({
        name: a.name,
        domain: a.domain,
        storeId: store.id,
      })),
    });
  }

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
