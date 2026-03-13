// AI日案生成 リクエスト / レスポンス型

export interface DailyPlanAiRequest {
  /** 選択された活動名リスト（1件以上） */
  activityNames: string[];
  /** 活動領域キー */
  domain: string;
  /** 参加児童数 */
  childCount: number;
  /** スタッフ数 */
  staffCount: number;
  /** 活動フロー */
  activityFlow?: "集団" | "個別" | "グループ";
  /** グループ数 */
  groupCount?: number;
}

// --- レスポンス内部型 ---

export interface ScheduleItem {
  time: string;   // "HH:MM"
  title: string;
  detail: string;
}

export interface StaffPlanItem {
  staffLabel: string;   // "メイン", "サブ", "メンバー1" …
  assignment: string;
  notes: string;
}

export interface DailyPlanAiResponse {
  purposeAim: string;
  schedule: ScheduleItem[];
  staffPlan: StaffPlanItem[];
  preparations: string[];
}
