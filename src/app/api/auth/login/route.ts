import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { loginId, password } = await request.json();

  const store = await prisma.store.findUnique({ where: { loginId } });
  if (!store) {
    return NextResponse.json({ error: "ログインIDまたはパスワードが正しくありません" }, { status: 401 });
  }

  const valid = await verifyPassword(password, store.password);
  if (!valid) {
    return NextResponse.json({ error: "ログインIDまたはパスワードが正しくありません" }, { status: 401 });
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
