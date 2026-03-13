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

/** 分数を加算して { hour, minute } を返す */
function addMinutes(h: number, m: number, mins: number): { h: number; m: number } {
  const total = h * 60 + m + mins;
  return { h: Math.floor(total / 60), m: total % 60 };
}

/** HH:MM 形式にフォーマット */
function formatTime(h: number, m: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * 活動セクションのスケジュール行を、17:00 から逆算した正確な時刻で生成する。
 * AIに計算させず、コード側で確定した時刻文字列を返す。
 */
function buildActivityScheduleLines(
  flowType: string,
  activityList: string,
  groupCount: number,
  childCount: number
): string {
  // 17:00 片付け から逆算して活動開始時刻を決定
  const FIXED_END = { h: 17, m: 0 };

  if (flowType === "グループ") {
    // 説明10分 + グループ数×10分
    const totalMins = 10 + groupCount * 10;
    let cur = addMinutes(FIXED_END.h, FIXED_END.m, -totalMins);
    const lines: string[] = [];
    lines.push(`    { "time": "${formatTime(cur.h, cur.m)}", "title": "活動：${activityList}（説明・準備）", "detail": "活動内容の説明とグループ分けを行う" }`);
    for (let i = 1; i <= groupCount; i++) {
      cur = addMinutes(cur.h, cur.m, 10);
      lines.push(`    { "time": "${formatTime(cur.h, cur.m)}", "title": "グループ${i}", "detail": "順番に活動を行う" }`);
    }
    return lines.join(",\n");
  }

  if (flowType === "個別") {
    // 説明5分 + 人数×5分
    const totalMins = 5 + childCount * 5;
    let cur = addMinutes(FIXED_END.h, FIXED_END.m, -totalMins);
    const lines: string[] = [];
    lines.push(`    { "time": "${formatTime(cur.h, cur.m)}", "title": "活動：${activityList}（説明・準備）", "detail": "活動内容の説明と順番を確認する" }`);
    for (let i = 1; i <= childCount; i++) {
      cur = addMinutes(cur.h, cur.m, 5);
      lines.push(`    { "time": "${formatTime(cur.h, cur.m)}", "title": "${i}人目", "detail": "個別に活動を実施する" }`);
    }
    return lines.join(",\n");
  }

  // 集団: 30分
  const cur = addMinutes(FIXED_END.h, FIXED_END.m, -30);
  return `    { "time": "${formatTime(cur.h, cur.m)}", "title": "活動：${activityList}", "detail": "全員で一緒に活動を行う" }`;
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
  const activityLines = buildActivityScheduleLines(
    flowType,
    activityList,
    req.groupCount ?? 1,
    req.childCount
  );

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
- 活動セクションの時刻とタイトルは以下の行をそのままコピーして使うこと（時刻・タイトルの変更禁止）：
${activityLines}
- 17:00以降は必ず以下の4行を固定で含めること（時刻・タイトルの変更・削除禁止）：
    { "time": "17:00", "title": "片付け", "detail": "使用したものを片付け、室内を整える" },
    { "time": "17:05", "title": "帰宅準備（トイレ、持ち物整理、送迎準備）", "detail": "トイレを済ませ、持ち物を確認し、送迎の準備を行う" },
    { "time": "17:15", "title": "帰りの会（振り返り、挨拶）", "detail": "今日の活動を振り返り、良かった点を確認して挨拶する" },
    { "time": "17:30", "title": "帰宅", "detail": "順次帰宅" }
- 到着〜活動開始前の流れ（到着・自由時間・はじまりの会など）はAIが自由に生成してよい
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
