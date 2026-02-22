"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ActivitySelector from "@/components/ActivitySelector";
import type { DailyPlanAiResponse, ScheduleItem, StaffPlanItem } from "@/types/dailyPlanAi";

interface StaffItem {
  id: string;
  name: string;
}

interface ChildItem {
  id: string;
  name: string;
}

export default function Home() {
  const router = useRouter();
  const [storeName, setStoreName] = useState("");
  const [loading, setLoading] = useState(true);

  // 日案データ
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [childList, setChildList] = useState<ChildItem[]>([]);
  const [mainStaff, setMainStaff] = useState("");
  const [subStaff, setSubStaff] = useState("");
  const [memberStaff, setMemberStaff] = useState<string[]>([]);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [selectedDomain, setSelectedDomain] = useState("");
  const [selectedActivity, setSelectedActivity] = useState("");

  // テキスト系フィールド（既存・個別AI生成でも利用）
  const [purpose, setPurpose] = useState("");
  const [flow, setFlow] = useState("");
  const [staffActions, setStaffActions] = useState("");
  const [preparations, setPreparations] = useState("");
  const [notes, setNotes] = useState("");

  // 統合AI下書き用の構造化state
  const [aiDraft, setAiDraft] = useState<DailyPlanAiResponse | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [staffPlan, setStaffPlan] = useState<StaffPlanItem[]>([]);
  const [prepList, setPrepList] = useState<string[]>([]);
  // 統合AI下書きが反映済みかどうか（structured表示に切替）
  const [useDraftMode, setUseDraftMode] = useState(false);

  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [generatingAll, setGeneratingAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const loadData = useCallback(async () => {
    const [staffRes, childRes] = await Promise.all([
      fetch("/api/staff"),
      fetch("/api/children"),
    ]);
    setStaffList(await staffRes.json());
    setChildList(await childRes.json());
  }, []);

  useEffect(() => {
    if (storeName) loadData();
  }, [storeName, loadData]);

  async function checkAuth() {
    const res = await fetch("/api/auth/me");
    if (!res.ok) {
      router.push("/login");
      return;
    }
    const data = await res.json();
    setStoreName(data.storeName);
    setLoading(false);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  function toggleChild(name: string) {
    setSelectedChildren((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  }

  function addMember() {
    setMemberStaff((prev) => [...prev, ""]);
  }

  function updateMember(index: number, value: string) {
    setMemberStaff((prev) => prev.map((m, i) => (i === index ? value : m)));
  }

  function removeMember(index: number) {
    setMemberStaff((prev) => prev.filter((_, i) => i !== index));
  }

  function getStaffCount() {
    let count = 0;
    if (mainStaff) count++;
    if (subStaff) count++;
    count += memberStaff.filter((m) => m).length;
    return Math.max(count, 1);
  }

  // ── 個別フィールドAI生成（既存） ──────────────────────────
  async function generate(type: string) {
    if (!selectedActivity || !selectedDomain) {
      alert("先に活動を選択してください");
      return;
    }
    setGenerating((prev) => ({ ...prev, [type]: true }));
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          activityName: selectedActivity,
          domain: selectedDomain,
          staffCount: getStaffCount(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error);
        return;
      }
      switch (type) {
        case "purpose":
          setPurpose(data.result);
          break;
        case "flow":
          setFlow(data.result);
          break;
        case "staffActions":
          setStaffActions(data.result);
          break;
        case "preparations":
          setPreparations(data.result);
          break;
      }
      // 個別生成したらテキストモードに切替
      setUseDraftMode(false);
    } catch {
      alert("AI生成中にエラーが発生しました");
    } finally {
      setGenerating((prev) => ({ ...prev, [type]: false }));
    }
  }

  // ── 統合AI下書き生成（新方式） ────────────────────────────
  async function generateAllDraft() {
    if (!selectedActivity || !selectedDomain) {
      alert("先に活動を選択してください");
      return;
    }
    setGeneratingAll(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "all",
          activityNames: [selectedActivity],
          domain: selectedDomain,
          childCount: selectedChildren.length || 1,
          staffCount: getStaffCount(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "AI生成中にエラーが発生しました");
        return;
      }
      const draft = data as DailyPlanAiResponse;
      setAiDraft(draft);
      setPurpose(draft.purposeAim);
      setSchedule(draft.schedule);
      setStaffPlan(draft.staffPlan);
      setPrepList(draft.preparations);
      setUseDraftMode(true);
    } catch {
      alert("AI生成中にエラーが発生しました");
    } finally {
      setGeneratingAll(false);
    }
  }

  // ── 構造化データ → 保存用文字列変換 ──────────────────────
  function serializeSchedule(items: ScheduleItem[]): string {
    return items.map((s) => `${s.title}\n${s.detail}`).join("\n\n");
  }

  function serializeStaffPlan(items: StaffPlanItem[]): string {
    return items
      .map((s) => `【${s.staffLabel}】${s.assignment}\n留意点: ${s.notes}`)
      .join("\n\n");
  }

  function getFlowForSave(): string {
    return useDraftMode ? serializeSchedule(schedule) : flow;
  }

  function getStaffActionsForSave(): string {
    return useDraftMode ? serializeStaffPlan(staffPlan) : staffActions;
  }

  function getPreparationsForSave(): string {
    return useDraftMode ? prepList.join("\n") : preparations;
  }

  // ── 保存 ──────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/daily-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          staffConfig: { main: mainStaff, sub: subStaff, members: memberStaff.filter(Boolean) },
          childrenNames: selectedChildren,
          activityDomain: selectedDomain,
          activityName: selectedActivity,
          purpose,
          flow: getFlowForSave(),
          staffActions: getStaffActionsForSave(),
          preparations: getPreparationsForSave(),
          notes,
        }),
      });
      if (res.ok) {
        alert("日案を保存しました");
      }
    } catch {
      alert("保存中にエラーが発生しました");
    } finally {
      setSaving(false);
    }
  }

  // ── Excel出力 ─────────────────────────────────────────────
  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          staffConfig: { main: mainStaff, sub: subStaff, members: memberStaff.filter(Boolean) },
          childrenNames: selectedChildren,
          activityDomain: selectedDomain,
          activityName: selectedActivity,
          purpose,
          flow: getFlowForSave(),
          staffActions: getStaffActionsForSave(),
          preparations: getPreparationsForSave(),
          notes,
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `日案_${date}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      alert("エクスポート中にエラーが発生しました");
    } finally {
      setExporting(false);
    }
  }

  // ── 構造化Schedule編集ヘルパー ────────────────────────────
  function updateScheduleItem(i: number, field: keyof ScheduleItem, value: string) {
    setSchedule((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  }

  function addScheduleItem() {
    setSchedule((prev) => [...prev, { title: "", detail: "" }]);
  }

  function removeScheduleItem(i: number) {
    setSchedule((prev) => prev.filter((_, idx) => idx !== i));
  }

  // ── 構造化StaffPlan編集ヘルパー ───────────────────────────
  function updateStaffPlanItem(i: number, field: keyof StaffPlanItem, value: string) {
    setStaffPlan((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  }

  function addStaffPlanItem() {
    setStaffPlan((prev) => [...prev, { staffLabel: "", assignment: "", notes: "" }]);
  }

  function removeStaffPlanItem(i: number) {
    setStaffPlan((prev) => prev.filter((_, idx) => idx !== i));
  }

  // ── 準備物リスト編集ヘルパー ──────────────────────────────
  function updatePrepItem(i: number, value: string) {
    setPrepList((prev) => prev.map((p, idx) => (idx === i ? value : p)));
  }

  function addPrepItem() {
    setPrepList((prev) => [...prev, ""]);
  }

  function removePrepItem(i: number) {
    setPrepList((prev) => prev.filter((_, idx) => idx !== i));
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-indigo-700">日案ジェネレーター</h1>
            <p className="text-xs text-gray-500">{storeName}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/settings")}
              className="text-sm px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              設定
            </button>
            <button
              onClick={handleLogout}
              className="text-sm px-3 py-1.5 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* 日付 */}
        <section className="bg-white rounded-xl shadow p-4">
          <label className="block text-sm font-bold text-gray-700 mb-2">日付</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </section>

        {/* スタッフ配置 */}
        <section className="bg-white rounded-xl shadow p-4">
          <h2 className="text-sm font-bold text-gray-700 mb-3">スタッフ配置</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">メイン</label>
              <select
                value={mainStaff}
                onChange={(e) => setMainStaff(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">選択してください</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">サブ</label>
              <select
                value={subStaff}
                onChange={(e) => setSubStaff(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">選択してください</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
            {memberStaff.map((member, i) => (
              <div key={i}>
                <label className="block text-xs text-gray-500 mb-1">
                  メンバー{i + 1}
                  <button
                    onClick={() => removeMember(i)}
                    className="ml-2 text-red-400 hover:text-red-600"
                  >
                    ×
                  </button>
                </label>
                <select
                  value={member}
                  onChange={(e) => updateMember(i, e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">選択してください</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <button
            onClick={addMember}
            className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 transition"
          >
            + メンバーを追加
          </button>
        </section>

        {/* 児童選択 */}
        <section className="bg-white rounded-xl shadow p-4">
          <h2 className="text-sm font-bold text-gray-700 mb-3">児童選択</h2>
          {childList.length === 0 ? (
            <p className="text-gray-400 text-sm">
              児童が登録されていません。設定画面から追加してください。
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {childList.map((child) => (
                <label
                  key={child.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition ${
                    selectedChildren.includes(child.name)
                      ? "bg-indigo-50 border-indigo-400 text-indigo-700"
                      : "bg-white border-gray-300 text-gray-600 hover:border-gray-400"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedChildren.includes(child.name)}
                    onChange={() => toggleChild(child.name)}
                    className="accent-indigo-600"
                  />
                  {child.name}
                </label>
              ))}
            </div>
          )}
          {selectedChildren.length > 0 && (
            <p className="mt-2 text-xs text-gray-500">
              選択中: {selectedChildren.join("、")}
            </p>
          )}
        </section>

        {/* 活動選択 */}
        <section className="bg-white rounded-xl shadow p-4">
          <ActivitySelector
            onSelect={(domain, activity) => {
              setSelectedDomain(domain);
              setSelectedActivity(activity);
            }}
            selectedDomain={selectedDomain}
            selectedActivity={selectedActivity}
          />

          {selectedActivity && (
            <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100 space-y-3">
              <p className="text-sm text-indigo-700 font-medium">
                選択中の活動: {selectedActivity}
              </p>

              {/* ★ 統合AI下書き生成ボタン（新機能） */}
              <button
                onClick={generateAllDraft}
                disabled={generatingAll}
                className="w-full bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {generatingAll ? (
                  <>
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    AI生成中...
                  </>
                ) : (
                  "AIで下書き生成（4項目まとめて）"
                )}
              </button>

              {aiDraft && (
                <p className="text-xs text-indigo-500">
                  下書き生成済み。各項目を直接編集できます。
                </p>
              )}
            </div>
          )}
        </section>

        {/* 目的・狙い */}
        <section className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-gray-700">目的・狙い</h2>
            <button
              onClick={() => generate("purpose")}
              disabled={generating.purpose}
              className="text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
            >
              {generating.purpose ? "生成中..." : "AI再生成"}
            </button>
          </div>
          <textarea
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            rows={4}
            placeholder="活動を選択して「AIで下書き生成」を押すとAIが自動生成します。手動入力も可能です。"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </section>

        {/* 流れ（時刻付き） */}
        <section className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-700">流れ（時刻付き）</h2>
            <div className="flex items-center gap-3">
              {useDraftMode && (
                <button
                  onClick={() => setUseDraftMode(false)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  テキスト入力に切替
                </button>
              )}
              <button
                onClick={() => generate("flow")}
                disabled={generating.flow}
                className="text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
              >
                {generating.flow ? "生成中..." : "AI再生成"}
              </button>
            </div>
          </div>

          {useDraftMode ? (
            /* 構造化編集UI */
            <div className="space-y-2">
              {schedule.map((item, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto] gap-2 items-start">
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => updateScheduleItem(i, "title", e.target.value)}
                      placeholder="項目名"
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="text"
                      value={item.detail}
                      onChange={(e) => updateScheduleItem(i, "detail", e.target.value)}
                      placeholder="詳細"
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    onClick={() => removeScheduleItem(i)}
                    className="mt-1 text-red-400 hover:text-red-600 text-sm"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={addScheduleItem}
                className="text-xs text-indigo-600 hover:text-indigo-800 transition"
              >
                + 行を追加
              </button>
            </div>
          ) : (
            /* フリーテキスト入力（既存） */
            <textarea
              value={flow}
              onChange={(e) => setFlow(e.target.value)}
              rows={8}
              placeholder="活動を選択して「AIで下書き生成」を押すとAIが自動生成します。手動入力も可能です。"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          )}
        </section>

        {/* スタッフの動き */}
        <section className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-700">スタッフの動き</h2>
            <div className="flex items-center gap-3">
              {useDraftMode && (
                <button
                  onClick={() => setUseDraftMode(false)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  テキスト入力に切替
                </button>
              )}
              <button
                onClick={() => generate("staffActions")}
                disabled={generating.staffActions}
                className="text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
              >
                {generating.staffActions ? "生成中..." : "AI再生成"}
              </button>
            </div>
          </div>

          {useDraftMode ? (
            <div className="space-y-3">
              {staffPlan.map((item, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={item.staffLabel}
                      onChange={(e) => updateStaffPlanItem(i, "staffLabel", e.target.value)}
                      placeholder="役割（例: メイン）"
                      className="border border-gray-300 rounded px-2 py-1 text-xs font-medium w-32 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={() => removeStaffPlanItem(i)}
                      className="text-red-400 hover:text-red-600 text-sm"
                    >
                      ×
                    </button>
                  </div>
                  <input
                    type="text"
                    value={item.assignment}
                    onChange={(e) => updateStaffPlanItem(i, "assignment", e.target.value)}
                    placeholder="担当内容"
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    value={item.notes}
                    onChange={(e) => updateStaffPlanItem(i, "notes", e.target.value)}
                    placeholder="留意点"
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ))}
              <button
                onClick={addStaffPlanItem}
                className="text-xs text-indigo-600 hover:text-indigo-800 transition"
              >
                + スタッフを追加
              </button>
            </div>
          ) : (
            <textarea
              value={staffActions}
              onChange={(e) => setStaffActions(e.target.value)}
              rows={6}
              placeholder="活動を選択して「AIで下書き生成」を押すとAIが自動生成します。手動入力も可能です。"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          )}
        </section>

        {/* 準備物 */}
        <section className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-gray-700">準備物</h2>
            <div className="flex items-center gap-3">
              {useDraftMode && (
                <button
                  onClick={() => setUseDraftMode(false)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  テキスト入力に切替
                </button>
              )}
              <button
                onClick={() => generate("preparations")}
                disabled={generating.preparations}
                className="text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
              >
                {generating.preparations ? "生成中..." : "AI再生成"}
              </button>
            </div>
          </div>

          {useDraftMode ? (
            <div className="space-y-2">
              {prepList.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">•</span>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updatePrepItem(i, e.target.value)}
                    placeholder="準備物"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => removePrepItem(i)}
                    className="text-red-400 hover:text-red-600 text-sm"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={addPrepItem}
                className="text-xs text-indigo-600 hover:text-indigo-800 transition"
              >
                + 項目を追加
              </button>
            </div>
          ) : (
            <textarea
              value={preparations}
              onChange={(e) => setPreparations(e.target.value)}
              rows={4}
              placeholder="活動を選択して「AIで下書き生成」を押すとAIが自動生成します。手動入力も可能です。"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          )}
        </section>

        {/* 連絡事項 */}
        <section className="bg-white rounded-xl shadow p-4">
          <h2 className="text-sm font-bold text-gray-700 mb-2">連絡事項</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="連絡事項があれば入力してください"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </section>

        {/* 完了ボタン */}
        <section className="flex gap-3 justify-center pb-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-gray-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-700 disabled:opacity-50 transition"
          >
            {saving ? "保存中..." : "保存"}
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="bg-green-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition"
          >
            {exporting ? "出力中..." : "Excel出力・ダウンロード"}
          </button>
        </section>
      </main>
    </div>
  );
}
