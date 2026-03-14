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
 * 到着〜帰宅まで完全なスケジュールをコードで生成する。
 * AIには time/title を変更させず、detail のみ記述させる。
 * 片付け17:00を遵守するため、活動時間に応じて自由時間を短縮する。
 */
function buildFullSchedule(
  flowType: string,
  activityList: string,
  groupCount: number,
  childCount: number
): Array<{ time: string; title: string }> {
  const FIXED_END = { h: 17, m: 0 };

  // 活動所要時間を計算（説明準備 + 各グループ/人）
  let activityMins: number;
  if (flowType === "グループ") {
    activityMins = 10 + groupCount * 10; // 説明10分 + グループ数×10分
  } else if (flowType === "個別") {
    activityMins = 5 + childCount * 5;   // 説明5分 + 人数×5分
  } else {
    activityMins = 30;                   // 集団: 30分
  }

  // 活動開始時刻 = 17:00 から逆算
  const actStart = addMinutes(FIXED_END.h, FIXED_END.m, -activityMins);

  // 到着(15:00)から活動開始までの空き時間
  const availMins = actStart.h * 60 + actStart.m - 15 * 60;

  const slots: Array<{ time: string; title: string }> = [];

  // 到着は常に15:00固定
  slots.push({ time: "15:00", title: "到着" });

  // 空き時間に応じて到着〜活動前を組む（自由時間を短縮して活動時間を確保）
  if (availMins >= 45) {
    // はじまりの会(15分) + 自由時間
    slots.push({ time: "15:15", title: "はじまりの会（出席確認、体調確認、今日の流れ説明）" });
    slots.push({ time: "15:30", title: "自由時間" });
  } else if (availMins >= 20) {
    // 自由時間のみ
    slots.push({ time: "15:15", title: "自由時間" });
  }
  // 20分未満: 到着後すぐ活動（スケジュールが詰まっている場合）

  // 活動セクション（17:00から逆算して決定した時刻）
  let cur = { h: actStart.h, m: actStart.m };
  slots.push({ time: formatTime(cur.h, cur.m), title: `活動：${activityList}（説明・準備）` });

  // グループ・個別ごとにタイムスタンプとラベルを追加（詳細はAIが最初の1回のみ記述）
  if (flowType === "グループ") {
    for (let i = 1; i <= groupCount; i++) {
      cur = addMinutes(cur.h, cur.m, 10);
      slots.push({ time: formatTime(cur.h, cur.m), title: `グループ${i}` });
    }
  } else if (flowType === "個別") {
    for (let i = 1; i <= childCount; i++) {
      cur = addMinutes(cur.h, cur.m, 5);
      slots.push({ time: formatTime(cur.h, cur.m), title: `${i}人目` });
    }
  }

  // 固定終了部分（17:00以降は絶対変更なし）
  slots.push({ time: "17:00", title: "片付け" });
  slots.push({ time: "17:05", title: "帰宅準備（トイレ、持ち物整理、送迎準備）" });
  slots.push({ time: "17:15", title: "帰りの会（振り返り、挨拶）" });
  slots.push({ time: "17:30", title: "帰宅" });

  return slots;
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
  const fullSchedule = buildFullSchedule(
    flowType,
    activityList,
    req.groupCount ?? 1,
    req.childCount
  );
  // AIに渡すスケジュール枠（time・titleは確定済み、AIはdetailのみ記述する）
  const scheduleTemplate = fullSchedule
    .map((s) => `    { "time": "${s.time}", "title": "${s.title}", "detail": "" }`)
    .join(",\n");

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
- scheduleの各項目のtime・titleは以下のとおりに完全固定（変更・追加・削除すべて禁止）。detailのみ、活動内容に合わせた具体的な内容を日本語で記述すること
- 「活動：〜（説明・準備）」のentryのdetailに活動全体の流れ・内容を具体的に記述すること
- 形式が「グループ」または「個別」の場合、「グループN」「N人目」のentryのdetailは空文字列（""）にすること（活動内容の繰り返し記述は不要）：
[
${scheduleTemplate}
]
- staffPlanは【活動】実施中における各スタッフの役割・動きを記述すること（到着・帰宅など活動以外の場面は含めない）。${staffLabels.map((l) => `"${l}"`).join("・")}それぞれ1項目ずつ
- preparationsは【活動】を実施するために必要な準備物を5〜10項目記述すること
- timeはHH:MM形式（例: "15:00"）
- 全フィールドを日本語で記述`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text();

  const jsonStr = extractJson(raw);
  const parsed = JSON.parse(jsonStr);
  const validated = dailyPlanAiResponseSchema.parse(parsed);

  // グループN / N人目 スロットの detail をコードで強制的に空にする
  // （AIがプロンプト指示を無視して繰り返し記述する場合への対策）
  validated.schedule = validated.schedule.map((item) => {
    if (/^グループ\d+$/.test(item.title) || /^\d+人目$/.test(item.title)) {
      return { ...item, detail: "" };
    }
    return item;
  });

  return validated;
}

function buildStaffLabels(count: number): string[] {
  const labels = ["メイン", "サブ"];
  for (let i = 3; i <= count; i++) {
    labels.push(`メンバー${i - 2}`);
  }
  return labels.slice(0, Math.max(count, 1));
}
