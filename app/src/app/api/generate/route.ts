import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  generatePurpose,
  generateFlow,
  generateStaffActions,
  generatePreparations,
} from "@/lib/gemini";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const { type, activityName, domain, staffCount } = await request.json();

  try {
    let result: string;
    switch (type) {
      case "purpose":
        result = await generatePurpose(activityName, domain);
        break;
      case "flow":
        result = await generateFlow(activityName, domain);
        break;
      case "staffActions":
        result = await generateStaffActions(activityName, domain, staffCount || 2);
        break;
      case "preparations":
        result = await generatePreparations(activityName, domain);
        break;
      default:
        return NextResponse.json({ error: "無効な生成タイプ" }, { status: 400 });
    }
    return NextResponse.json({ result });
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json(
      { error: "AI生成中にエラーが発生しました。APIキーを確認してください。" },
      { status: 500 }
    );
  }
}
