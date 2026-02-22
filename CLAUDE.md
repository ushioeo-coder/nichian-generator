# 日案ジェネレーター - プロジェクト概要

## このアプリについて

放課後等デイサービス向けの**日案（指導案）自動生成Webアプリ**。
施設スタッフがブラウザから使い、Gemini AIが日案の各項目を自動で作成する。

### 主な機能
- AI（Gemini）による日案の自動生成（目的・流れ・スタッフの動き・準備物）
- 過去の日案の保存・閲覧
- Excel形式でのダウンロード
- スタッフ・児童・活動の管理
- 施設ごとのアカウント分離（マルチテナント）

---

## 技術構成

| 項目 | 内容 |
|---|---|
| フレームワーク | Next.js 16 + TypeScript |
| データベース | PostgreSQL（本番） / SQLite（ローカル開発） |
| ORM | Prisma 5 |
| AI | Google Gemini API（@google/generative-ai） |
| 認証 | JWT + bcrypt + HTTPOnly Cookie（有効期限7日） |
| Excel出力 | ExcelJS |
| バリデーション | Zod |
| デプロイ | Railway.app（Nixpacks） |

---

## ディレクトリ構成

```
src/
├── app/
│   ├── api/
│   │   ├── auth/         # ログイン・登録・セッション確認・ログアウト
│   │   ├── staff/        # スタッフのCRUD
│   │   ├── children/     # 児童のCRUD
│   │   ├── activities/   # 活動のCRUD・デフォルト活動の復元
│   │   ├── daily-plans/  # 日案の保存・取得
│   │   ├── generate/     # AI生成（一括・個別フィールド）
│   │   └── export/       # Excel出力
│   ├── page.tsx          # メイン画面（日案作成フォーム）
│   ├── login/page.tsx    # ログイン・施設登録画面
│   └── settings/page.tsx # 設定画面（スタッフ・児童・活動管理）
├── components/
│   ├── ActivitySelector.tsx  # 5領域の活動選択UI
│   └── ManagementPanel.tsx   # 汎用リスト管理コンポーネント
└── lib/
    ├── auth.ts               # JWT・パスワードユーティリティ
    ├── prisma.ts             # Prismaクライアント（シングルトン）
    ├── gemini.ts             # 個別フィールドのAI生成
    ├── defaultActivities.ts  # デフォルト活動170件以上（5領域）
    └── ai/
        ├── gemini.ts         # 一括JSON生成
        └── schemas.ts        # Zodバリデーションスキーマ
```

---

## データベース構造（Prismaスキーマ）

```
Store（施設）
  └── Staff（スタッフ）
  └── Child（児童）
  └── Activity（カスタム活動）
  └── HiddenActivity（非表示にしたデフォルト活動）
  └── DailyPlan（作成済み日案）
```

- すべてのデータは施設（storeId）で分離されている
- 施設を削除すると関連データはすべてカスケード削除される
- DailyPlanのstaffConfig・childrenNamesはJSON列で保存

---

## 環境変数

```env
DATABASE_URL=       # PostgreSQL接続文字列（本番）またはfile:./prisma/dev.db（ローカル）
JWT_SECRET=         # JWTの署名キー（本番では必ず変更すること）
GEMINI_API_KEY=     # Google AI StudioのAPIキー
GEMINI_MODEL=       # 使用モデル（例：gemini-2.0-flash または gemini-1.5-pro）
```

**環境変数の管理場所**
- ローカル開発：`.env.local`（Gitに含まれない）
- 本番（Railway）：Railwayダッシュボードの環境変数設定

---

## デプロイ構成（Railway）

- **ビルド**：`npm install && npx prisma generate && npm run build`
- **起動**：`mkdir -p /data && npx prisma migrate deploy && npm start`
- 起動失敗時は最大10回自動再起動
- Node.js 20以上が必要

---

## よく使うコマンド（ローカル開発時）

```bash
npm run dev           # 開発サーバー起動（http://localhost:3000）
npm run build         # 本番ビルド確認
npx prisma db push    # スキーマをDBに反映（開発用）
npx prisma migrate deploy  # マイグレーション実行（本番用）
npx prisma studio     # DBをGUIで確認
```

---

## AI生成の仕組み

`/api/generate` エンドポイントが2つのモードを持つ：

1. **一括生成（type: "all"）**
   - `src/lib/ai/gemini.ts` の `generateDailyPlanDraft()` を呼ぶ
   - 目的・流れ・スタッフの動き・準備物を一度に生成
   - ZodスキーマでJSONをバリデーション

2. **個別フィールド生成（type: "purpose" など）**
   - `src/lib/gemini.ts` の関数を呼ぶ
   - 1フィールドずつ再生成するときに使用

---

## デフォルト活動について

- `src/lib/defaultActivities.ts` に170件以上がハードコードされている
- DBには保存されておらず、「非表示にしたもの」だけ `HiddenActivity` に記録する仕組み
- 施設が誤って活動を削除した場合は設定画面の「復元」ボタンで戻せる

---

## 注意事項・既知の制約

1. **AIのJSON解析**：Geminiのレスポンスから `{` と `}` を探して抽出する実装。モデルの回答によってはパースに失敗することがある
2. **同時編集**：複数ユーザーが同じ日案を同時編集した場合、後から保存した内容で上書きされる（排他制御なし）
3. **Excel出力**：セル位置がハードコードされているため、活動名が長すぎると表示が崩れることがある
4. **マルチテナント**：施設ごとにデータは完全に分離。クロスアクセスはできない設計

---

## このアプリの開発者・保守者向け

- オーナーはコーディングスキルを持っていないため、修正・追加はすべてClaude Codeが対応する
- 変更はGitHub経由でRailwayに自動デプロイされる（git pushで本番反映）
- クライアントへはRailwayのURLを共有するだけでOK
- APIキーやパスワードは絶対にチャットに貼らないこと
