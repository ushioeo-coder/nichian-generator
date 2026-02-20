import { GoogleGenerativeAI } from "@google/generative-ai";

function getModel() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "").getGenerativeModel({ model: "gemini-1.5-flash" });
}

export async function generatePurpose(activityName: string, domain: string): Promise<string> {
  const domainLabel = getDomainLabel(domain);
  const prompt = `あなたは放課後等デイサービスの支援員です。
以下の活動について、目的・狙いを簡潔に3〜5行で記述してください。

領域: ${domainLabel}
活動名: ${activityName}

具体的な療育目標を含めて記述してください。`;

  const result = await getModel().generateContent(prompt);
  return result.response.text();
}

export async function generateFlow(
  activityName: string,
  domain: string
): Promise<string> {
  const domainLabel = getDomainLabel(domain);
  const prompt = `あなたは放課後等デイサービスの支援員です。
以下の活動を含む、施設到着から帰宅までの一日の流れ（スケジュール）を作成してください。

領域: ${domainLabel}
活動名: ${activityName}

以下の形式で時系列に記述してください：
・到着〜健康チェック
・自由遊び
・はじまりの会
・活動（${activityName}）
・おやつ
・帰りの会
・帰宅準備〜送迎

各項目に簡単な説明を付けてください。`;

  const result = await getModel().generateContent(prompt);
  return result.response.text();
}

export async function generateStaffActions(
  activityName: string,
  domain: string,
  staffCount: number
): Promise<string> {
  const domainLabel = getDomainLabel(domain);
  const prompt = `あなたは放課後等デイサービスの支援員です。
以下の活動におけるスタッフ${staffCount}名の動き・役割分担を記述してください。

領域: ${domainLabel}
活動名: ${activityName}
スタッフ人数: ${staffCount}名（メイン1名、サブ1名${staffCount > 2 ? `、メンバー${staffCount - 2}名` : ""}）

メインスタッフ、サブスタッフ${staffCount > 2 ? "、各メンバー" : ""}それぞれの具体的な役割と動きを記述してください。`;

  const result = await getModel().generateContent(prompt);
  return result.response.text();
}

export async function generatePreparations(
  activityName: string,
  domain: string
): Promise<string> {
  const domainLabel = getDomainLabel(domain);
  const prompt = `あなたは放課後等デイサービスの支援員です。
以下の活動に必要な準備物をリストアップしてください。

領域: ${domainLabel}
活動名: ${activityName}

箇条書きで準備物を列挙してください。`;

  const result = await getModel().generateContent(prompt);
  return result.response.text();
}

function getDomainLabel(domain: string): string {
  const labels: Record<string, string> = {
    health: "健康・生活",
    exercise: "運動・感覚",
    cognition: "認知・行動",
    language: "言語・コミュニケーション",
    social: "人間関係・社会性",
  };
  return labels[domain] || domain;
}
