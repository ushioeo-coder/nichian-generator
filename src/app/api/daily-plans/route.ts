import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const data = await request.json();

  const plan = await prisma.dailyPlan.create({
    data: {
      date: new Date(data.date),
      storeId: session.storeId,
      staffConfig: JSON.stringify(data.staffConfig),
      childrenNames: JSON.stringify(data.childrenNames),
      activityDomain: data.activityDomain,
      activityName: data.activityName,
      purpose: data.purpose,
      flow: data.flow,
      staffActions: data.staffActions,
      preparations: data.preparations,
      notes: data.notes || "",
    },
  });

  return NextResponse.json(plan);
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const plans = await prisma.dailyPlan.findMany({
    where: { storeId: session.storeId },
    orderBy: { date: "desc" },
    take: 50,
  });
  return NextResponse.json(plans);
}
