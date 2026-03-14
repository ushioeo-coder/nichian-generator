import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import ExcelJS from "exceljs";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const data = await request.json();

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("日案");

  // ── 列幅設定 ──────────────────────────────────────────────────────────────
  // A4 印刷可能幅（余白 0.25" 時）の実ピクセル計算:
  //   A4 = 8.27", 余白合計 0.5" → 印刷幅 7.77" × 96DPI = 746px
  //   各列のピクセル幅 = NumChars × MDW + 5px_padding  (MDW = 7px for Calibri 11pt)
  //   6列合計: total_chars × 7 + 30 ≈ 746  → total_chars ≈ 102
  ws.getColumn(1).width = 8;    // 時間列
  ws.getColumn(2).width = 18.8; // 流れ左
  ws.getColumn(3).width = 18.8; // 流れ右
  ws.getColumn(4).width = 18.8; // スタッフ動き左
  ws.getColumn(5).width = 18.8; // スタッフ動き右
  ws.getColumn(6).width = 18.8; // 準備物
  // 合計: 8 + 18.8×5 = 102 units → (102×7+30) = 744px ≈ A4 印刷幅 746px

  // ── A4 印刷設定 ───────────────────────────────────────────────────────────
  // 重要: scale=undefined にしないと ExcelJS がデフォルトで scale="100" を XML に書き込み、
  //       fitToWidth が無視される（ExcelJS の既知の挙動）。
  ws.pageSetup.paperSize = 9;           // A4
  ws.pageSetup.orientation = "portrait";
  ws.pageSetup.fitToPage = true;
  ws.pageSetup.fitToWidth = 1;          // 横方向：1ページに収める
  ws.pageSetup.fitToHeight = 0;         // 縦方向：制限なし（縦圧縮しない）
  ws.pageSetup.scale = undefined as unknown as number; // ExcelJS デフォルトの scale="100" を消す
  ws.pageSetup.margins = {
    left: 0.25, right: 0.25,
    top: 0.25,  bottom: 0.25,
    header: 0,  footer: 0,
  };

  // ── スタイル定義 ─────────────────────────────────────────────────────────
  const thinBorder: Partial<ExcelJS.Borders> = {
    top:    { style: "thin" },
    left:   { style: "thin" },
    bottom: { style: "thin" },
    right:  { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD9E1F2" },
  };
  const centerMiddle: Partial<ExcelJS.Alignment> = { horizontal: "center", vertical: "middle" };
  const wrapTop: Partial<ExcelJS.Alignment> = { wrapText: true, vertical: "top" };

  // ─────────────────────────────────────────────────────────────────────────
  // 行1: スタッフヘッダー
  // ─────────────────────────────────────────────────────────────────────────
  ws.mergeCells("B1:F1");
  const staffCount =
    (data.staffConfig?.main ? 1 : 0) +
    (data.staffConfig?.sub  ? 1 : 0) +
    (data.staffConfig?.members?.length || 0);
  ws.getCell("B1").value     = `スタッフ（合計 ${staffCount} 名）`;
  ws.getCell("B1").font      = { bold: true, size: 11 };
  ws.getCell("B1").alignment = centerMiddle;
  ws.getCell("B1").fill      = headerFill;
  ws.getRow(1).height = 20;

  // ─────────────────────────────────────────────────────────────────────────
  // 行2: 日付・スタッフ役割ヘッダー
  // ─────────────────────────────────────────────────────────────────────────
  ws.mergeCells("A2:A5");
  const dateStr = data.date
    ? new Date(data.date).toLocaleDateString("ja-JP", { month: "long", day: "numeric" })
    : "月　　日";
  ws.getCell("A2").value     = dateStr;
  ws.getCell("A2").alignment = centerMiddle;
  ws.getCell("A2").font      = { bold: true, size: 12 };

  (["メイン","サブ","メンバー","メンバー","メンバー"] as const).forEach((label, i) => {
    const cell = ws.getCell(2, i + 2);
    cell.value     = label;
    cell.font      = { bold: true, size: 10 };
    cell.alignment = centerMiddle;
    cell.fill      = headerFill;
  });
  ws.getRow(2).height = 18;

  // ─────────────────────────────────────────────────────────────────────────
  // 行3: スタッフ名
  // ─────────────────────────────────────────────────────────────────────────
  const staffConfig = data.staffConfig || {};
  const members = staffConfig.members || [];
  ws.getCell("B3").value = staffConfig.main || "";
  ws.getCell("C3").value = staffConfig.sub  || "";
  ws.getCell("D3").value = members[0] || "";
  ws.getCell("E3").value = members[1] || "";
  ws.getCell("F3").value = members[2] || "";
  ws.getRow(3).height = 22;

  // ─────────────────────────────────────────────────────────────────────────
  // 行4-5: 追加メンバー
  // ─────────────────────────────────────────────────────────────────────────
  ws.getCell("B4").value = "メンバー";
  ws.getCell("B4").font  = { bold: true, size: 10 };
  ws.getCell("B4").fill  = headerFill;
  ws.getCell("C4").value = "メンバー";
  ws.getCell("C4").font  = { bold: true, size: 10 };
  ws.getCell("C4").fill  = headerFill;
  ws.getCell("B5").value = members[3] || "";
  ws.getCell("C5").value = members[4] || "";
  ws.getRow(4).height = 18;
  ws.getRow(5).height = 20;

  // ─────────────────────────────────────────────────────────────────────────
  // 行6-8: 児童名
  // ─────────────────────────────────────────────────────────────────────────
  ws.mergeCells("A6:A8");
  const childrenNames: string[] = data.childrenNames || [];
  ws.getCell("A6").value     = `児童名\n(全 ${childrenNames.length} 名)`;
  ws.getCell("A6").alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  ws.getCell("A6").fill      = headerFill;
  ws.getCell("A6").font      = { size: 9, bold: true };

  const childCells = ["B6","C6","D6","E6","F6","B7","C7","D7","E7","F7","B8","C8","D8","E8","F8"];
  childrenNames.forEach((name: string, i: number) => {
    if (i < childCells.length) {
      ws.getCell(childCells[i]).value     = name;
      ws.getCell(childCells[i]).alignment = centerMiddle;
      ws.getCell(childCells[i]).font      = { size: 10 };
    }
  });
  [6, 7, 8].forEach(r => { ws.getRow(r).height = 20; });

  // ─────────────────────────────────────────────────────────────────────────
  // 行9: 活動名
  // ─────────────────────────────────────────────────────────────────────────
  ws.getCell("A9").value     = "活動";
  ws.getCell("A9").fill      = headerFill;
  ws.getCell("A9").font      = { bold: true };
  ws.getCell("A9").alignment = centerMiddle;
  ws.mergeCells("B9:F9");
  ws.getCell("B9").value     = `活動：${data.activityName || ""}`;
  ws.getCell("B9").font      = { size: 11, bold: true };
  ws.getCell("B9").alignment = { vertical: "middle", wrapText: true };
  ws.getRow(9).height = 22;

  // ─────────────────────────────────────────────────────────────────────────
  // 行10: 目的・狙い
  // ─────────────────────────────────────────────────────────────────────────
  ws.getCell("A10").value     = "目的・狙い";
  ws.getCell("A10").fill      = headerFill;
  ws.getCell("A10").font      = { bold: true };
  ws.getCell("A10").alignment = centerMiddle;
  ws.mergeCells("B10:F10");
  ws.getCell("B10").value     = data.purpose || "";
  ws.getCell("B10").alignment = wrapTop;
  ws.getCell("B10").font      = { size: 10 };
  ws.getRow(10).height = 55;

  // ─────────────────────────────────────────────────────────────────────────
  // 行11: スケジュールヘッダー
  // ─────────────────────────────────────────────────────────────────────────
  const schedHeaderCells: [string, string][] = [
    ["A11", "時間"],
    ["B11", "流れ"],
    ["D11", "スタッフの動き"],
    ["F11", "準備物"],
  ];
  ws.mergeCells("B11:C11");
  ws.mergeCells("D11:E11");
  schedHeaderCells.forEach(([ref, label]) => {
    ws.getCell(ref).value     = label;
    ws.getCell(ref).fill      = headerFill;
    ws.getCell(ref).font      = { bold: true };
    ws.getCell(ref).alignment = centerMiddle;
  });
  ws.getRow(11).height = 18;

  // ─────────────────────────────────────────────────────────────────────────
  // 行12-32: スケジュール本体
  // schedule 構造化データがあれば個別行で配置、なければ従来形式
  // ─────────────────────────────────────────────────────────────────────────

  if (data.schedule && Array.isArray(data.schedule) && data.schedule.length > 0) {
    // 構造化スケジュールデータを使用 - 時間を A 列、内容を B-F 列に分割配置
    let rowNum = 12;
    for (const item of data.schedule) {
      if (rowNum > 32) break;

      // A列：時間
      ws.getCell(rowNum, 1).value = item.time;
      ws.getCell(rowNum, 1).alignment = centerMiddle;
      ws.getCell(rowNum, 1).font = { size: 10 };
      ws.getCell(rowNum, 1).border = thinBorder;

      // B-C列：タイトル + 詳細（改行で結合）
      const flowText = item.detail ? `${item.title}\n${item.detail}` : item.title;
      ws.getCell(rowNum, 2).value = flowText;
      ws.getCell(rowNum, 2).alignment = wrapTop;
      ws.getCell(rowNum, 2).font = { size: 10 };
      ws.getCell(rowNum, 2).border = thinBorder;

      // D-E列、F列：1行目のみデータを配置（スタッフアクション・準備物は活動全体に対して統一）
      if (rowNum === 12) {
        ws.getCell(rowNum, 4).value = data.staffActions || "";
        ws.getCell(rowNum, 4).alignment = wrapTop;
        ws.getCell(rowNum, 4).font = { size: 10 };
        ws.getCell(rowNum, 4).border = thinBorder;

        ws.getCell(rowNum, 6).value = data.preparations || "";
        ws.getCell(rowNum, 6).alignment = wrapTop;
        ws.getCell(rowNum, 6).font = { size: 10 };
        ws.getCell(rowNum, 6).border = thinBorder;
      }

      // 行の高さを動的に計算（テキスト量に応じて）
      const textLength = flowText.length;
      const lineCount = (flowText.match(/\n/g) || []).length + 1; // 改行数 + 1
      const estimatedHeight = Math.max(22, 15 + lineCount * 12);
      ws.getRow(rowNum).height = Math.min(60, estimatedHeight);

      rowNum++;
    }

    // 残りの行（スケジュール行数が21未満の場合）をクリア
    for (let r = rowNum; r <= 32; r++) {
      ws.getRow(r).height = 22;
    }
  } else {
    // 従来形式：テキスト一括配置（schedule データがない場合の互換性）
    ws.mergeCells("A12:A32");
    ws.mergeCells("B12:C32");
    ws.mergeCells("D12:E32");
    ws.mergeCells("F12:F32");

    for (let r = 12; r <= 32; r++) {
      ws.getRow(r).height = 22;
    }

    ws.getCell("B12").value     = data.flow || "";
    ws.getCell("B12").alignment = wrapTop;
    ws.getCell("B12").font      = { size: 10 };

    ws.getCell("D12").value     = data.staffActions || "";
    ws.getCell("D12").alignment = wrapTop;
    ws.getCell("D12").font      = { size: 10 };

    ws.getCell("F12").value     = data.preparations || "";
    ws.getCell("F12").alignment = wrapTop;
    ws.getCell("F12").font      = { size: 10 };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 行33-37: 連絡事項
  // ─────────────────────────────────────────────────────────────────────────
  ws.mergeCells("A33:A37");
  ws.getCell("A33").value     = "連絡事項";
  ws.getCell("A33").fill      = headerFill;
  ws.getCell("A33").font      = { bold: true };
  ws.getCell("A33").alignment = centerMiddle;

  ws.mergeCells("B33:F37");
  ws.getCell("B33").value     = data.notes || "";
  ws.getCell("B33").alignment = wrapTop;
  ws.getCell("B33").font      = { size: 10 };

  // 18pt × 5行 = 90pt
  for (let r = 33; r <= 37; r++) {
    ws.getRow(r).height = 18;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 罫線を全セルに適用
  // ─────────────────────────────────────────────────────────────────────────
  for (let row = 1; row <= 37; row++) {
    for (let col = 1; col <= 6; col++) {
      ws.getCell(row, col).border = thinBorder;
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="nichian_${data.date || "plan"}.xlsx"`,
    },
  });
}
