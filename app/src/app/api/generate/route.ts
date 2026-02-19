import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  generatePurpose,
  generateFlow,
  generateStaffActions,
  generatePreparations,
} from "@/lib/gemini";
import { generateDailyPlanDraft } from "@/lib/ai/gemini";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const body = await request.json();
  const { type } = body;

  // ── 統合JSON生成（新方式） ──────────────────────────────
  if (type === "all") {
    const { activityNames, domain, childCount, staffCount } = body;
    if (!activityNames?.length || !domain) {
      return NextResponse.json(
        { error: "activityNames と domain は必須です" },
        { status: 400 }
      );
    }
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY が設定されていません" },
        { status: 500 }
      );
    }
    try {
      const draft = await generateDailyPlanDraft({
        activityNames,
        domain,
        childCount: childCount ?? 1,
        staffCount: staffCount ?? 1,
      });
      return NextResponse.json(draft);
    } catch (error) {
      console.error("Gemini unified generation error:", error);
      const message =
        error instanceof Error ? error.message : "AI生成中にエラーが発生しました";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // ── 個別フィールド生成（既存方式を維持） ─────────────────
  const { activityName, domain, staffCount } = body;
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
