import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import ExcelJS from "exceljs";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const data = await request.json();

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("日案");

  // ── 列幅設定（A4ポートレート幅 21cm に合わせて最適化）──────────────────
  // 合計 ~104 unit ≈ A4幅に収まる
  ws.getColumn(1).width = 14;   // ラベル列（日付・見出し）
  ws.getColumn(2).width = 18;   // 流れ左 / スタッフ左
  ws.getColumn(3).width = 18;   // 流れ右 / スタッフ右
  ws.getColumn(4).width = 18;   // スタッフ動き左
  ws.getColumn(5).width = 18;   // スタッフ動き右
  ws.getColumn(6).width = 18;   // 準備物

  // ── A4 印刷設定 ───────────────────────────────────────────────────────────
  ws.pageSetup.paperSize = 9;           // A4
  ws.pageSetup.orientation = "portrait";
  ws.pageSetup.fitToPage = true;
  ws.pageSetup.fitToWidth = 1;          // 幅は1ページに収める
  ws.pageSetup.fitToHeight = 0;         // 高さは縮小しない（内容に応じて自然な高さ）
  ws.pageSetup.margins = {
    left: 0.35, right: 0.35,
    top: 0.35,  bottom: 0.35,
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
  const flowType = data.activityFlow
    ? `【${data.activityFlow}${data.activityFlow === "グループ" ? ` ${data.groupCount}組` : ""}】`
    : "";
  ws.getCell("B9").value     = `活動：${data.activityName || ""}${flowType}`;
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
  // 行12-32: スケジュール本体（21行 × 約17pt ≈ 357pt ≈ 12.6cm）
  // ─────────────────────────────────────────────────────────────────────────
  ws.mergeCells("A12:A32");
  ws.mergeCells("B12:C32");
  ws.mergeCells("D12:E32");
  ws.mergeCells("F12:F32");

  // 各行に高さを設定（合計でスケジュール内容が読める高さを確保）
  for (let r = 12; r <= 32; r++) {
    ws.getRow(r).height = 17;
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
