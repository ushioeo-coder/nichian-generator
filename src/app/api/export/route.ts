import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import ExcelJS from "exceljs";
import path from "path";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const data = await request.json();

  // ── テンプレートを読み込む ─────────────────────────────────────────────
  // テンプレートは public/template/nichian-template.xlsx に配置
  // レイアウト・罫線・行高・列幅・文字位置はすべてテンプレートで確定済み
  // コード側はデータの流し込みのみを行う
  const workbook = new ExcelJS.Workbook();
  const templatePath = path.join(process.cwd(), "public", "template", "nichian-template.xlsx");
  await workbook.xlsx.readFile(templatePath);

  const ws = workbook.getWorksheet("日案");
  if (!ws) {
    return NextResponse.json({ error: "テンプレートが見つかりません" }, { status: 500 });
  }

  // ── 行1: スタッフ合計 ──────────────────────────────────────────────────
  const staffConfig = data.staffConfig || {};
  const members = staffConfig.members || [];
  const staffCount =
    (staffConfig.main  ? 1 : 0) +
    (staffConfig.sub   ? 1 : 0) +
    (members.length    || 0);
  ws.getCell("B1").value = `スタッフ（合計 ${staffCount} 名）`;

  // ── 行2-5: 日付・スタッフ名 ────────────────────────────────────────────
  // A2-A5 は統合済み → A2 に書き込む
  const dateStr = data.date
    ? new Date(data.date).toLocaleDateString("ja-JP", { month: "long", day: "numeric" })
    : "月　　日";
  ws.getCell("A2").value = dateStr;

  // 行3: メイン・サブ・メンバー1-3
  ws.getCell("B3").value = staffConfig.main  || "";
  ws.getCell("C3").value = staffConfig.sub   || "";
  ws.getCell("D3").value = members[0]        || "";
  ws.getCell("E3").value = members[1]        || "";
  ws.getCell("F3").value = members[2]        || "";

  // 行5: 追加メンバー4-5（行4はテンプレートのラベル行のため変更しない）
  ws.getCell("B5").value = members[3] || "";
  ws.getCell("C5").value = members[4] || "";

  // ── 行7-9: 児童名 ──────────────────────────────────────────────────────
  // A7-A9 は統合済み → A7 に書き込む
  const childrenNames: string[] = data.childrenNames || [];
  ws.getCell("A7").value = `児童名\n(全 ${childrenNames.length} 名)`;

  // B7-F9 に児童名を配置（最大15名）
  const childCells = [
    "B7","C7","D7","E7","F7",
    "B8","C8","D8","E8","F8",
    "B9","C9","D9","E9","F9",
  ];
  // まず全セルをクリア
  childCells.forEach((ref) => { ws.getCell(ref).value = ""; });
  // 児童名を順に入力
  childrenNames.forEach((name: string, i: number) => {
    if (i < childCells.length) ws.getCell(childCells[i]).value = name;
  });

  // ── 行10: 活動名 ───────────────────────────────────────────────────────
  // B10-F10 は統合済み → B10 に書き込む
  ws.getCell("B10").value = `活動：${data.activityName || ""}`;

  // ── 行11: 目的・狙い ───────────────────────────────────────────────────
  // B11-F11 は統合済み → B11 に書き込む
  ws.getCell("B11").value = data.purpose || "";

  // ── 行13-32: スケジュール本体 ──────────────────────────────────────────
  // テンプレート構造（変更不可）：
  //   A列（13-32）: 独立セル → タイムスタンプを各行に入力
  //   B列（13-32）: B-C統合済み（各行独立）→ 流れを各行に入力
  //   D列（13-32）: D13-E32 統合済み → D13 にスタッフの動きを入力
  //   F列（13-32）: F13-F32 統合済み → F13 に準備物を入力

  // まずA列・B列をクリア
  for (let r = 13; r <= 32; r++) {
    ws.getCell(r, 1).value = "";
    ws.getCell(r, 2).value = "";
  }
  ws.getCell("D13").value = "";
  ws.getCell("F13").value = "";

  if (data.schedule && Array.isArray(data.schedule) && data.schedule.length > 0) {
    // 構造化スケジュールデータ：各行にタイムスタンプと流れを入力
    data.schedule.forEach((item: { time: string; title: string; detail: string }, idx: number) => {
      const rowNum = 13 + idx;
      if (rowNum > 32) return;

      // A列：タイムスタンプ
      ws.getCell(rowNum, 1).value = item.time;

      // B列（B-C統合済み）：タイトル + 詳細（改行区切り）
      // 詳細テキストは句点「。」とステップ番号「①②③...」で改行を挿入して見やすくする
      const detailText = item.detail
        ? item.detail
            .replace(/。/g, "。\n") // 句点の後に改行を追加
            .replace(/([①②③④⑤⑥⑦⑧⑨⑩])/g, "\n$1") // ステップ番号「①～⑩」の前に改行を追加
        : "";
      ws.getCell(rowNum, 2).value = detailText
        ? `${item.title}\n${detailText}`
        : item.title;
    });

    // D13（統合セル）: スタッフの動き
    ws.getCell("D13").value = data.staffActions || "";

    // F13（統合セル）: 準備物
    ws.getCell("F13").value = data.preparations || "";

  } else {
    // 従来形式（構造化データなし）: B13 に一括テキスト入力
    ws.getCell("B13").value  = data.flow         || "";
    ws.getCell("D13").value  = data.staffActions  || "";
    ws.getCell("F13").value  = data.preparations  || "";
  }

  // ── 行33: 連絡事項 ──────────────────────────────────────────────────────
  // B33-F35 は統合済み → B33 に書き込む
  ws.getCell("B33").value = data.notes || "";

  // ── 出力 ──────────────────────────────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="nichian_${data.date || "plan"}.xlsx"`,
    },
  });
}
