"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ManagementPanel from "@/components/ManagementPanel";

const DOMAINS = [
  { key: "health", label: "健康・生活" },
  { key: "exercise", label: "運動・感覚" },
  { key: "cognition", label: "認知・行動" },
  { key: "language", label: "言語・コミュニケーション" },
  { key: "social", label: "人間関係・社会性" },
];

interface Item {
  id: string;
  name: string;
}

interface Activity {
  id: string;
  name: string;
  domain: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [storeName, setStoreName] = useState("");
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<Item[]>([]);
  const [children, setChildren] = useState<Item[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activeDomain, setActiveDomain] = useState("health");
  const [newActivityName, setNewActivityName] = useState("");
  const [staffLoading, setStaffLoading] = useState(false);
  const [childLoading, setChildLoading] = useState(false);
  const [actLoading, setActLoading] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const loadAll = useCallback(async () => {
    setStaffLoading(true);
    setChildLoading(true);
    setActLoading(true);
    const [staffRes, childRes, actRes] = await Promise.all([
      fetch("/api/staff"),
      fetch("/api/children"),
      fetch("/api/activities"),
    ]);
    setStaff(await staffRes.json());
    setChildren(await childRes.json());
    setActivities(await actRes.json());
    setStaffLoading(false);
    setChildLoading(false);
    setActLoading(false);
  }, []);

  useEffect(() => {
    if (storeName) loadAll();
  }, [storeName, loadAll]);

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

  async function addStaff(name: string) {
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const item = await res.json();
      setStaff((prev) => [...prev, item]);
    }
  }

  async function deleteStaff(id: string) {
    await fetch("/api/staff", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setStaff((prev) => prev.filter((s) => s.id !== id));
  }

  async function addChild(name: string) {
    const res = await fetch("/api/children", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const item = await res.json();
      setChildren((prev) => [...prev, item]);
    }
  }

  async function deleteChild(id: string) {
    await fetch("/api/children", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setChildren((prev) => prev.filter((c) => c.id !== id));
  }

  async function addActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!newActivityName.trim()) return;
    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newActivityName.trim(), domain: activeDomain }),
    });
    if (res.ok) {
      const item = await res.json();
      setActivities((prev) => [...prev, item]);
      setNewActivityName("");
    }
  }

  async function deleteActivity(id: string) {
    await fetch("/api/activities", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setActivities((prev) => prev.filter((a) => a.id !== id));
  }

  const domainActivities = activities.filter((a) => a.domain === activeDomain);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-indigo-700">設定</h1>
            <p className="text-xs text-gray-500">{storeName}</p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            日案作成に戻る
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* スタッフ・児童管理 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ManagementPanel
            title="スタッフ管理"
            items={staff}
            onAdd={addStaff}
            onDelete={deleteStaff}
            loading={staffLoading}
          />
          <ManagementPanel
            title="児童管理"
            items={children}
            onAdd={addChild}
            onDelete={deleteChild}
            loading={childLoading}
          />
        </div>

        {/* 活動管理 */}
        <section className="bg-white rounded-xl shadow p-4">
          <h3 className="font-bold text-gray-700 mb-3">活動管理（5領域）</h3>

          {/* 領域タブ */}
          <div className="flex flex-wrap gap-2 mb-4">
            {DOMAINS.map((domain) => (
              <button
                key={domain.key}
                onClick={() => setActiveDomain(domain.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                  activeDomain === domain.key
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"
                }`}
              >
                {domain.label}
              </button>
            ))}
          </div>

          {/* 活動追加フォーム */}
          <form onSubmit={addActivity} className="flex gap-2 mb-3">
            <input
              type="text"
              value={newActivityName}
              onChange={(e) => setNewActivityName(e.target.value)}
              placeholder={`${DOMAINS.find((d) => d.key === activeDomain)?.label}の活動名`}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={!newActivityName.trim()}
              className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              追加
            </button>
          </form>

          {/* 活動一覧 */}
          {actLoading ? (
            <p className="text-gray-400 text-sm">読み込み中...</p>
          ) : domainActivities.length === 0 ? (
            <p className="text-gray-400 text-sm">
              この領域の活動が登録されていません
            </p>
          ) : (
            <ul className="space-y-1 max-h-60 overflow-y-auto">
              {domainActivities.map((activity) => (
                <li
                  key={activity.id}
                  className="flex items-center justify-between py-1.5 px-2 bg-gray-50 rounded text-sm"
                >
                  <span>{activity.name}</span>
                  <button
                    onClick={() => deleteActivity(activity.id)}
                    className="text-red-400 hover:text-red-600 text-xs transition"
                  >
                    削除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
