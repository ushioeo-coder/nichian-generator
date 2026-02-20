"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [storeName, setStoreName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const url = isRegister ? "/api/auth/register" : "/api/auth/login";
      const body = isRegister
        ? { loginId, password, name: storeName }
        : { loginId, password };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-indigo-700 mb-2">
          日案ジェネレーター
        </h1>
        <p className="text-center text-gray-500 mb-6 text-sm">
          放課後等デイサービス 日報計画作成ツール
        </p>

        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
              !isRegister ? "bg-white shadow text-indigo-700" : "text-gray-500"
            }`}
            onClick={() => setIsRegister(false)}
          >
            ログイン
          </button>
          <button
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
              isRegister ? "bg-white shadow text-indigo-700" : "text-gray-500"
            }`}
            onClick={() => setIsRegister(true)}
          >
            新規登録
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                店舗名
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
                placeholder="例：○○教室"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ログインID
            </label>
            <input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
              placeholder="ログインID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
              placeholder="パスワード"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {loading ? "処理中..." : isRegister ? "登録" : "ログイン"}
          </button>
        </form>
      </div>
    </div>
  );
}
