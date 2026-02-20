"use client";

import { useState, useEffect } from "react";

const DOMAINS = [
  { key: "health", label: "健康・生活", color: "bg-green-100 text-green-800 border-green-300" },
  { key: "exercise", label: "運動・感覚", color: "bg-orange-100 text-orange-800 border-orange-300" },
  { key: "cognition", label: "認知・行動", color: "bg-blue-100 text-blue-800 border-blue-300" },
  { key: "language", label: "言語・コミュニケーション", color: "bg-purple-100 text-purple-800 border-purple-300" },
  { key: "social", label: "人間関係・社会性", color: "bg-pink-100 text-pink-800 border-pink-300" },
];

interface Activity {
  id: string;
  name: string;
  domain: string;
}

interface ActivitySelectorProps {
  onSelect: (domain: string, activityName: string) => void;
  selectedDomain: string;
  selectedActivity: string;
}

export default function ActivitySelector({
  onSelect,
  selectedDomain,
  selectedActivity,
}: ActivitySelectorProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activeDomain, setActiveDomain] = useState(selectedDomain);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeDomain) {
      loadActivities(activeDomain);
    }
  }, [activeDomain]);

  async function loadActivities(domain: string) {
    setLoading(true);
    const res = await fetch(`/api/activities?domain=${domain}`);
    const data = await res.json();
    setActivities(data);
    setLoading(false);
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-bold text-gray-700">
        活動の5領域を選択
      </label>
      <div className="flex flex-wrap gap-2">
        {DOMAINS.map((domain) => (
          <button
            key={domain.key}
            onClick={() => setActiveDomain(domain.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
              activeDomain === domain.key
                ? domain.color + " ring-2 ring-offset-1 ring-indigo-400"
                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
            }`}
          >
            {domain.label}
          </button>
        ))}
      </div>

      {activeDomain && (
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-600 mb-2">
            活動名を選択
          </label>
          {loading ? (
            <p className="text-gray-400 text-sm">読み込み中...</p>
          ) : activities.length === 0 ? (
            <p className="text-gray-400 text-sm">
              この領域の活動が登録されていません。設定画面から追加してください。
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {activities.map((activity) => (
                <button
                  key={activity.id}
                  onClick={() => onSelect(activeDomain, activity.name)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                    selectedActivity === activity.name && selectedDomain === activeDomain
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400"
                  }`}
                >
                  {activity.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
