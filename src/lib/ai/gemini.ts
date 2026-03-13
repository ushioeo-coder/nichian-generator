import { GoogleGenerativeAI } from "@google/generative-ai";
import { dailyPlanAiResponseSchema, DailyPlanAiResponseParsed } from "./schemas";
import type { DailyPlanAiRequest } from "@/types/dailyPlanAi";

function getGenAI() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
}

const modelName = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

const DOMAIN_LABELS: Record<string, string> = {
  health: "健康・生活",
  exercise: "運動・感覚",
  cognition: "認知・行動",
  language: "言語・コミュニケーション",
  social: "人間関係・社会性",
};

/** Gemini 応答テキストから最初の { ... } を抽出する */
function extractJson(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("JSONブロックが見つかりませんでした");
  }
  return text.slice(start, end + 1);
}

/**
 * 日案の4項目を1回のAPI呼び出しで統合JSON として生成する
 */
export async function generateDailyPlanDraft(
  req: DailyPlanAiRequest
): Promise<DailyPlanAiResponseParsed> {
  const model = getGenAI().getGenerativeModel({ model: modelName });
  const domainLabel = DOMAIN_LABELS[req.domain] ?? req.domain;
  const activityList = req.activityNames.join("、");

  const staffLabels = buildStaffLabels(req.staffCount);
  const flowType = req.activityFlow || "集団";

  const prompt = `あなたは放課後等デイサービスの熟練支援員です。
以下の条件で日案の4項目をJSON形式のみで出力してください。説明文や前置きは一切不要です。

【活動】${activityList}
【領域】${domainLabel}
【形式】${flowType}${req.groupCount ? `（${req.groupCount}グループ）` : ""}
【参加児童数】${req.childCount}名
【スタッフ】${staffLabels.join("・")}（計${req.staffCount}名）

出力するJSONの形式（この形式以外は禁止）:
{
  "purposeAim": "目的・狙いを3〜5行で記述",
  "schedule": [
    { "time": "HH:MM", "title": "項目名", "detail": "具体的な内容" }
  ],
  "staffPlan": [
    { "staffLabel": "メイン", "assignment": "担当内容", "notes": "留意点" }
  ],
  "preparations": ["準備物1", "準備物2"]
}

制約:
- scheduleは到着〜帰宅の流れを記述すること。
- 【形式】に応じて、活動部分のscheduleを以下のルールで構成してください：

  ■ 集団の場合：
    - { time: "HH:MM", title: "活動：${activityList}", detail: "..." } を1行追加（所要時間約30分）

  ■ グループの場合（${req.groupCount || 1}グループ）：
    - まず { time: "HH:MM", title: "活動：${activityList}（説明・準備）", detail: "..." } を1行追加
    - 続けて以下を10分間隔で${req.groupCount || 1}行追加すること（必ず${req.groupCount || 1}行、省略・まとめ禁止）：
      { time: "HH:MM", title: "グループ1", detail: "順番にシミュレーションを行う" }
      { time: "HH:MM", title: "グループ2", detail: "..." }
      ...
      { time: "HH:MM", title: "グループ${req.groupCount || 1}", detail: "..." }

  ■ 個別の場合（${req.childCount}人）：
    - まず { time: "HH:MM", title: "活動：${activityList}（説明・準備）", detail: "..." } を1行追加
    - 続けて以下を5分間隔で${req.childCount}行追加すること（必ず${req.childCount}行、省略・まとめ禁止）：
      { time: "HH:MM", title: "1人目", detail: "個別に活動を実施" }
      { time: "HH:MM", title: "2人目", detail: "..." }
      ...
      { time: "HH:MM", title: "${req.childCount}人目", detail: "..." }

- 活動の開始時間は17:00からの固定スケジュールに間に合うよう逆算して設定すること。
- 17:00以降は必ず以下のスケジュールを固定で含めてください。AIが勝手に時間を変えたり項目を削ったりしないでください：
    - 17:00 片付け
    - 17:05 帰宅準備（トイレ、持ち物整理、送迎準備）
    - 17:15 帰りの会（振り返り、挨拶）
    - 17:30 帰宅
- staffPlanは【活動】実施中における各スタッフの役割・動きを記述すること（到着・帰宅など活動以外の場面は含めない）。${staffLabels.map((l) => `"${l}"`).join("・")}それぞれ1項目ずつ
- preparationsは【活動】を実施するために必要な準備物を5〜10項目記述すること
- timeはHH:MM形式（例: "15:00"）
- 全フィールドを日本語で記述`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text();

  const jsonStr = extractJson(raw);
  const parsed = JSON.parse(jsonStr);
  return dailyPlanAiResponseSchema.parse(parsed);
}

function buildStaffLabels(count: number): string[] {
  const labels = ["メイン", "サブ"];
  for (let i = 3; i <= count; i++) {
    labels.push(`メンバー${i - 2}`);
  }
  return labels.slice(0, Math.max(count, 1));
}
