"use client";

import { useState } from "react";

interface Item {
  id: string;
  name: string;
}

interface ManagementPanelProps {
  title: string;
  items: Item[];
  onAdd: (name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  loading?: boolean;
}

export default function ManagementPanel({
  title,
  items,
  onAdd,
  onDelete,
  loading,
}: ManagementPanelProps) {
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    await onAdd(newName.trim());
    setNewName("");
    setAdding(false);
  }

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h3 className="font-bold text-gray-700 mb-3">{title}</h3>
      <form onSubmit={handleAdd} className="flex gap-2 mb-3">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="名前を入力"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={adding || !newName.trim()}
          className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          追加
        </button>
      </form>
      {loading ? (
        <p className="text-gray-400 text-sm">読み込み中...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-400 text-sm">データがありません</p>
      ) : (
        <ul className="space-y-1 max-h-48 overflow-y-auto">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between py-1.5 px-2 bg-gray-50 rounded text-sm"
            >
              <span>{item.name}</span>
              <button
                onClick={() => onDelete(item.id)}
                className="text-red-400 hover:text-red-600 text-xs transition"
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
