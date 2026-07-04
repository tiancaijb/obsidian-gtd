# GTD Workflow

> Obsidian 用 GTD ワークフロープラグイン——Markdown チェックボックス + org-mode スタイルメタデータで完全な GTD システムを実現：TODO/DONE 状態、優先度、予定日/期限日、Agenda ビュー、クイックキャプチャ、タスクタイマー、ポモドーロ、タイムライン、統計グラフ。

[English](./README.md) · [中文](./README.zh-CN.md)

---

## これは何？

GTD Workflow は Markdown チェックボックス構文と org-mode スタイルのメタデータを使って、Obsidian に完全な GTD システムをもたらします。タスクはプレーンな Markdown ファイルに保存され、完全に編集可能でポータブル。

Emacs org-mode にインスパイアされ、Obsidian のために設計されました。

## 機能

- **📁 GTD フォルダ構造** — `gtd/` フォルダ（inbox、next actions、waiting、someday/maybe、projects）を自動作成。
- **📋 Agenda ビュー** — 右サイドバー、タスクを今日/今週/今月/未来でグループ化。
- **⚡ クイックキャプチャ** — `Ctrl+Shift+C` で Obsidian のどこからでもアイデアを inbox にキャプチャ。
- **⏱ タスクタイマー** — タスクごとに開始/一時停止/停止。CLOCK レコードを自動記録。
- **🍅 ポモドーロタイマー** — 集中/休憩サイクル、自動 CLOCK 記録。時間設定可能。
- **📈 タイムライン** — 24h タイムライン、任意の日の CLOCK レコードを表示。
- **📊 統計** — タスクごとの時間集計、円グラフ表示、CSV エクスポート対応。
- **🔤 優先度** — `[#A] [#B] [#C]` インライン優先度、`Shift+↑/↓` で切替。
- **↔️ インデント調整** — `Alt+←/→` でタスクを昇格/降格（サブタスク含む）。
- **🌐 バイリンガル** — UI とメタデータキーワードは中国語と英語に対応。

## タスク形式

```markdown
- [ ] タスク説明  [#A]
  計画: <2026-06-27>
  期限: <2026-06-30>
  CLOCK: [2026-06-27 Sat 09:00]--[2026-06-27 Sat 10:30] => 1:30
```

- 優先度：`[#A]`（高）`[#B]`（中）`[#C]`（低）
- 日付：`計画:`（計画日）`期限:`（期限日）
- 時間：`CLOCK: [開始]--[終了] => 時間`

## コマンド

| コマンド | デフォルトキー |
|---------|--------------|
| クイックキャプチャ | `Ctrl+Shift+C` |
| チェックボックス切替 | `Ctrl+Enter` |
| 優先度切替 | `Shift+↑` / `Shift+↓` |
| 昇格/降格 | `Alt+←` / `Alt+→` |
| タスク挿入 | `Ctrl+Shift+Enter` |
| タイマー切替 | `Ctrl+Shift+T` |
| Agenda を開く | — |
| タイムラインを開く | — |
| 統計を開く | — |

## ビュー

- **Agenda** — 右サイドバー。日付別タスク一覧、インラインクイックキャプチャ、タイマー、ポモドーロ。
- **Timeline** — 右サイドバー。24h タイムライン、任意の日の CLOCK レコードを表示。
- **Stats** — 右サイドバー。タスク別時間集計、円グラフ表示、CSV エクスポート。

## インストール

### Obsidian コミュニティストアから
**GTD Workflow** を検索（審査中）。

### 手動インストール
[最新リリース](https://github.com/tiancaijb/obsidian-gtd/releases) から `main.js`、`styles.css`、`manifest.json` をダウンロードし、`.obsidian/plugins/obsidian-gtd/` にコピー。

### 開発者モード
```bash
git clone git@github.com:tiancaijb/obsidian-gtd.git
cd obsidian-gtd
npm install
npm run dev
```

## アーキテクチャ

データモデルは org-mode の慣習に従います：

- **タスク** は Markdown リスト項目、`[ ]` / `[x]` チェックボックス付き
- **メタデータ**（`[#A]`、`計画:`、`期限:`、`CLOCK:`）はリスト項目内にインライン
- **ビュー** はタスクファイルをリアルタイム解析——個別データベースなし
- **フォルダ構造**（`gtd/`）は GTD 方法論に従う：収集 → 処理 → 整理 → レビュー

## このプラグインを作った理由

私は Emacs org-mode を個人の GTD システムとして使っています（[私のワークフロー](https://tiancaijb-site.vercel.app/zh/notes/my-workflow) 参照）。このプラグインは同じタスクモデルを Obsidian ユーザーに届けます——チェックボックス、優先度、予定日、CLOCK レコード——Emacs は不要です。

## License

MIT
