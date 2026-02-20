# セットアップ手順（Windows）

## 前提条件

- Node.js 18 以上がインストールされていること
- Gemini API キーを取得済みであること（[Google AI Studio](https://aistudio.google.com/) から取得）

---

## 手順

### ① 環境変数ファイルを作成する

**エクスプローラーで `app` フォルダを開き**、以下の操作をします：

1. `app\.env.local.example` を **コピー** して、同じ `app` フォルダ内に **貼り付け**
2. ファイル名を `.env.local.example` → **`.env.local`** に変更
3. `.env.local` をメモ帳で開き、`YOUR_GEMINI_API_KEY` の部分を **実際の Gemini API キー** に書き換えて保存

```
GEMINI_API_KEY="AIzaSy..."   ← ここを自分のキーに変更
GEMINI_MODEL="gemini-1.5-pro"
JWT_SECRET="CHANGE_ME"
DATABASE_URL="file:./prisma/dev.db"
```

> **注意**: `.env.local` は Git に含まれません（`.gitignore` で除外済み）。APIキーが外部に漏れることはありません。

---

### ② 依存パッケージをインストールする

コマンドプロンプト（またはPowerShell）で `app` フォルダに移動してから実行：

```cmd
cd app
npm install
```

---

### ③ データベースを初期化する

```cmd
npx prisma db push
```

---

### ④ 開発サーバーを起動する

```cmd
npm run dev
```

起動ログに以下が表示されれば正常です：

```
▲ Next.js ...
- Local:        http://localhost:3000
- Environments: .env.local    ← これが出れば env が読まれている
✓ Ready in ...
```

> **重要**: `Environments: .env.local` が表示されない場合は、`.env.local` が `app` フォルダの直下にあるか確認してください。

---

### ⑤ ブラウザで確認する

```
http://localhost:3000
```

---

## エラー時の確認チェックリスト

| 症状 | 確認事項 |
|------|----------|
| `GEMINI_API_KEY が設定されていません` | `app\.env.local` が存在するか / APIキーが正しく書かれているか |
| `Environments: .env.local` が出ない | `.env.local` の場所が `app\` 直下かどうか（`nichian-generator\.env.local` ではなく `nichian-generator\app\.env.local`） |
| ポート3000が使えない | `npx next dev -p 3001` で別ポートを試す |
| Prismaエラー | `cd app && npx prisma db push` を再実行 |

---

## ファイル構成（参考）

```
nichian-generator/
├── app/                     ← Next.js アプリ本体
│   ├── .env.local           ← ★ ここに作成（Git管理外）
│   ├── .env.local.example   ← テンプレート（Git管理内）
│   ├── src/
│   ├── prisma/
│   └── package.json
├── .env.local.example       ← ルートのテンプレート（参考用）
└── SETUP.md                 ← このファイル
```
