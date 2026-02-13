import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }

  const activityCount = await prisma.activity.count({
    where: { storeId: session.storeId },
  });

  return NextResponse.json({ ...session, activityCount });
}
