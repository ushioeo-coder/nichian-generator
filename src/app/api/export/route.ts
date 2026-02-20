import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import ExcelJS from "exceljs";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const data = await request.json();

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("日案");

  // 列幅設定
  ws.getColumn(1).width = 15.5;
  ws.getColumn(2).width = 11.3;
  ws.getColumn(3).width = 11.3;
  ws.getColumn(4).width = 11.3;
  ws.getColumn(5).width = 11.3;
  ws.getColumn(6).width = 11.3;

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };

  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD9E1F2" },
  };

  // 行1: スタッフヘッダー
  ws.mergeCells("B1:F1");
  ws.getCell("B1").value = "スタッフ";
  ws.getCell("B1").font = { bold: true, size: 12 };
  ws.getCell("B1").alignment = { horizontal: "center" };
  ws.getCell("B1").fill = headerFill;
  ws.getRow(1).height = 18.5;

  // 行2: 日付・スタッフ役割ヘッダー
  ws.mergeCells("A2:A5");
  const dateStr = data.date ? new Date(data.date).toLocaleDateString("ja-JP", { month: "long", day: "numeric" }) : "月　　日";
  ws.getCell("A2").value = dateStr;
  ws.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };
  ws.getCell("B2").value = "メイン";
  ws.getCell("C2").value = "サブ";
  ws.getCell("D2").value = "メンバー";
  ws.getCell("E2").value = "メンバー";
  ws.getCell("F2").value = "メンバー";

  // 行3: スタッフ名
  const staffConfig = data.staffConfig || {};
  ws.getCell("B3").value = staffConfig.main || "";
  ws.getCell("C3").value = staffConfig.sub || "";
  const members = staffConfig.members || [];
  ws.getCell("D3").value = members[0] || "";
  ws.getCell("E3").value = members[1] || "";
  ws.getCell("F3").value = members[2] || "";

  // 行4: メンバー追加行
  ws.getCell("B4").value = "メンバー";
  ws.getCell("C4").value = "メンバー";
  ws.getCell("B5").value = members[3] || "";
  ws.getCell("C5").value = members[4] || "";

  ws.getRow(3).height = 25;

  // 行6-8: 児童名
  ws.mergeCells("A6:A8");
  ws.getCell("A6").value = "児童名";
  ws.getCell("A6").alignment = { horizontal: "center", vertical: "middle" };
  ws.getCell("A6").fill = headerFill;

  const childrenNames: string[] = data.childrenNames || [];
  const childCells = ["B6", "C6", "D6", "E6", "F6", "B7", "C7", "D7", "E7", "F7", "B8", "C8", "D8", "E8", "F8"];
  childrenNames.forEach((name: string, i: number) => {
    if (i < childCells.length) {
      ws.getCell(childCells[i]).value = name;
    }
  });

  // 行9: 活動
  ws.getCell("A9").value = "活動";
  ws.getCell("A9").fill = headerFill;
  ws.mergeCells("B9:F9");
  ws.getCell("B9").value = `${data.activityName || ""}`;

  // 行10: 目的・狙い
  ws.getCell("A10").value = "目的・狙い";
  ws.getCell("A10").fill = headerFill;
  ws.mergeCells("B10:F10");
  ws.getCell("B10").value = data.purpose || "";
  ws.getCell("B10").alignment = { wrapText: true, vertical: "top" };
  ws.getRow(10).height = 35.5;

  // 行11: スケジュールヘッダー
  ws.getCell("A11").value = "時間";
  ws.getCell("A11").fill = headerFill;
  ws.mergeCells("B11:C11");
  ws.getCell("B11").value = "流れ";
  ws.getCell("B11").fill = headerFill;
  ws.mergeCells("D11:E11");
  ws.getCell("D11").value = "スタッフの動き";
  ws.getCell("D11").fill = headerFill;
  ws.getCell("F11").value = "準備物";
  ws.getCell("F11").fill = headerFill;

  // 行12-32: スケジュール本体
  ws.mergeCells("A12:A32");
  ws.mergeCells("B12:C32");
  ws.mergeCells("D12:E32");
  ws.mergeCells("F12:F32");

  ws.getCell("B12").value = data.flow || "";
  ws.getCell("B12").alignment = { wrapText: true, vertical: "top" };
  ws.getCell("D12").value = data.staffActions || "";
  ws.getCell("D12").alignment = { wrapText: true, vertical: "top" };
  ws.getCell("F12").value = data.preparations || "";
  ws.getCell("F12").alignment = { wrapText: true, vertical: "top" };

  // 行33: 連絡事項
  ws.getCell("A33").value = "連絡事項";
  ws.getCell("A33").fill = headerFill;

  ws.mergeCells("B33:F36");
  ws.getCell("B33").value = data.notes || "";
  ws.getCell("B33").alignment = { wrapText: true, vertical: "top" };

  // 罫線適用
  for (let row = 1; row <= 36; row++) {
    for (let col = 1; col <= 6; col++) {
      const cell = ws.getCell(row, col);
      cell.border = thinBorder;
    }
  }

  // ヘッダーセルのフォント
  ["A2", "B2", "C2", "D2", "E2", "F2", "B4", "C4", "A6", "A9", "A10", "A11", "B11", "D11", "F11", "A33"].forEach(ref => {
    ws.getCell(ref).font = { bold: true };
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="nichian_${data.date || "plan"}.xlsx"`,
    },
  });
}
