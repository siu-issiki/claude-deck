# claude-deck: Claude Code Desktop Companion

Codex Mac アプリのようにプロジェクトを俯瞰・管理できる Claude Code 向けデスクトップアプリ。

## 背景・動機

- OpenAI Codex Mac アプリはサイドバーでプロジェクト一覧・スレッド管理・マルチエージェント実行ができる
- Claude Code にはこのような統合デスクトップ UI がない
- 既存ツール (opcode, CodePilot 等) は開発停止や機能不足

## スコープ: Level 1 (MVP)

「プロジェクト一覧サイドバー + Claude Code セッション管理」に絞る。

### 機能一覧

1. **プロジェクトサイドバー**
   - `~/.claude/projects/` を読み取りプロジェクト一覧を表示
   - 各プロジェクト配下のセッション一覧を展開表示
   - セッションのメタデータ（日時、最初のメッセージ等）を表示
   - プロジェクトの検索・フィルタ

2. **Claude Code セッション管理**
   - セッション選択で既存セッションを resume
   - 新規セッションの開始（ディレクトリ選択）
   - タブ UI で複数セッションを同時に開く

3. **ターミナル埋め込み**
   - xterm.js ベースのターミナルを中央ペインに表示
   - Claude Code CLI をサブプロセスとして起動
   - ターミナルの入出力をそのまま表示（フル機能）

4. **ワークスペース永続化**
   - 開いているタブ・レイアウトをアプリ終了時に保存
   - 次回起動時に復元

### 対象外 (Level 2 以降)

- コードレビュー / diff 表示
- チェックポイント / タイムライン
- Usage トラッキング / コスト分析
- マルチエージェント並列実行
- スケジュール自動化
- MCP サーバー管理 UI

## 技術スタック

| レイヤー | 技術 | 選定理由 |
|----------|------|----------|
| デスクトップフレームワーク | **Tauri 2** | 軽量（Electron 比でメモリ 1/10）、Rust バックエンド |
| フロントエンド | **React 18 + TypeScript** | エコシステムの充実度 |
| ビルドツール | **Vite** | 高速な HMR |
| スタイリング | **Tailwind CSS v4** | ユーティリティファースト |
| UI コンポーネント | **shadcn/ui** | カスタマイズ性、Tailwind との親和性 |
| ターミナル | **xterm.js + @xterm/addon-fit** | 業界標準のターミナルエミュレータ |
| 状態管理 | **Zustand** | 軽量、ボイラープレート少 |
| データ永続化 | **tauri-plugin-store** | Tauri ネイティブの KV ストア |
| パッケージマネージャ | **Bun** | 高速インストール・実行 |

## アーキテクチャ

```
┌─────────────────────────────────────────────────┐
│                  Tauri Window                    │
│                                                  │
│  ┌──────────┐  ┌─────────────────────────────┐  │
│  │          │  │                             │  │
│  │ Sidebar  │  │    Terminal Tabs             │  │
│  │          │  │  ┌───┬───┬───┐              │  │
│  │ Projects │  │  │ 1 │ 2 │ 3 │              │  │
│  │  └ sess  │  │  └───┴───┴───┘              │  │
│  │  └ sess  │  │  ┌─────────────────────┐    │  │
│  │          │  │  │                     │    │  │
│  │ Project2 │  │  │   xterm.js          │    │  │
│  │  └ sess  │  │  │   (Claude Code)     │    │  │
│  │          │  │  │                     │    │  │
│  │          │  │  └─────────────────────┘    │  │
│  └──────────┘  └─────────────────────────────┘  │
│                                                  │
└─────────────────────────────────────────────────┘
```

### バックエンド (Rust / Tauri)

```
src-tauri/
├── src/
│   ├── main.rs              # エントリポイント
│   ├── lib.rs               # Tauri セットアップ
│   ├── commands/
│   │   ├── mod.rs
│   │   ├── projects.rs      # プロジェクト一覧取得
│   │   ├── sessions.rs      # セッション情報取得
│   │   └── terminal.rs      # PTY プロセス管理
│   └── pty/
│       └── mod.rs            # PTY の生成・I/O ブリッジ
├── Cargo.toml
└── tauri.conf.json
```

主な Tauri コマンド:

- `list_projects()` → `~/.claude/projects/` を走査しプロジェクト一覧を返す
- `list_sessions(project_id)` → 特定プロジェクトのセッション一覧を返す
- `spawn_pty(cwd, args)` → Claude Code CLI を PTY 上で起動
- `write_pty(id, data)` → PTY への入力
- `resize_pty(id, cols, rows)` → ターミナルサイズ変更
- `kill_pty(id)` → PTY プロセス終了

PTY → フロントエンドのデータ送信は Tauri の Event system を使用。

### フロントエンド (React)

```
src/
├── App.tsx
├── main.tsx
├── components/
│   ├── Sidebar/
│   │   ├── Sidebar.tsx           # サイドバーコンテナ
│   │   ├── ProjectList.tsx       # プロジェクト一覧
│   │   ├── ProjectItem.tsx       # プロジェクト行（展開可能）
│   │   └── SessionItem.tsx       # セッション行
│   ├── Terminal/
│   │   ├── TerminalTabs.tsx      # タブバー
│   │   ├── TerminalPane.tsx      # xterm.js ラッパー
│   │   └── NewSessionDialog.tsx  # 新規セッション作成
│   └── Layout/
│       └── MainLayout.tsx        # サイドバー + メインの分割レイアウト
├── stores/
│   ├── projectStore.ts           # プロジェクト・セッション状態
│   ├── terminalStore.ts          # ターミナルタブ状態
│   └── workspaceStore.ts         # ワークスペース永続化
├── hooks/
│   ├── useProjects.ts            # プロジェクト読み込み
│   ├── useTerminal.ts            # xterm.js + PTY 連携
│   └── useWorkspace.ts           # ワークスペース保存・復元
├── lib/
│   └── tauri.ts                  # Tauri invoke/listen ヘルパー
└── styles/
    └── globals.css
```

## データモデル

### プロジェクト (`~/.claude/projects/` から読み取り)

```typescript
interface Project {
  id: string;           // ディレクトリ名（パスをエンコードしたもの）
  path: string;         // 元のプロジェクトパス
  displayName: string;  // 表示名（パスの末尾）
  sessions: Session[];
}

interface Session {
  id: string;           // セッション ID
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
  firstMessage?: string; // 最初のユーザーメッセージ（プレビュー用）
}
```

### ワークスペース状態 (tauri-plugin-store で永続化)

```typescript
interface Workspace {
  openTabs: TabState[];
  activeTabIndex: number;
  sidebarWidth: number;
  sidebarCollapsed: boolean;
}

interface TabState {
  id: string;
  projectId: string;
  sessionId?: string;   // undefined = 新規セッション
  cwd: string;
}
```

## 実装ステップ

### Step 1: プロジェクト初期化 (Day 1)

- [ ] Tauri 2 + React + TypeScript + Vite でプロジェクトスキャフォールド
- [ ] Tailwind CSS v4 + shadcn/ui セットアップ
- [ ] 基本レイアウト（サイドバー + メインペイン）の実装

### Step 2: プロジェクトサイドバー (Day 2-3)

- [ ] Rust: `~/.claude/projects/` ディレクトリ走査コマンド
- [ ] Rust: セッション JSONL ファイルからメタデータ読み取り
- [ ] React: ProjectList / ProjectItem / SessionItem コンポーネント
- [ ] プロジェクト検索・フィルタ機能

### Step 3: ターミナル埋め込み (Day 4-6)

- [ ] Rust: PTY 生成・管理 (`portable-pty` crate)
- [ ] Rust → フロントエンド: Event system でデータストリーム
- [ ] React: xterm.js 統合 (TerminalPane コンポーネント)
- [ ] ターミナルリサイズ対応 (addon-fit)
- [ ] Claude Code CLI の起動・resume コマンド構築

### Step 4: タブ管理 (Day 7-8)

- [ ] タブバー UI (追加・閉じる・切り替え)
- [ ] 新規セッション作成ダイアログ（ディレクトリ選択）
- [ ] タブごとの PTY インスタンス管理

### Step 5: ワークスペース永続化 (Day 9)

- [ ] tauri-plugin-store によるワークスペース状態の保存
- [ ] アプリ起動時の復元ロジック
- [ ] サイドバー幅のドラッグリサイズ・記憶

### Step 6: 仕上げ (Day 10)

- [ ] エラーハンドリング（Claude Code 未インストール時の案内等）
- [ ] ダークモード対応
- [ ] アプリアイコン・タイトル設定
- [ ] macOS DMG ビルド確認

## 前提条件

- Claude Code CLI がインストール済み
- Rust / Cargo がインストール済み
- Bun がインストール済み
- macOS (Apple Silicon) を主ターゲット

## 調査で見つかった参考プロジェクト

| プロジェクト | Stars | 状態 | 参考になる点 |
|-------------|-------|------|-------------|
| [opcode](https://github.com/winfunc/opcode) | 20.5k | 開発停止 (2025-10) | Tauri 2 構成、プロジェクトブラウザ UI |
| [CodePilot](https://github.com/op7418/CodePilot) | 549 | 活発 | 3ペイン構成、Agent SDK 利用 |
| [OpenWork](https://github.com/different-ai/openwork) | 9k | 活発 | マルチエージェント設計 |
| [Agentrooms](https://github.com/baryhuang/claude-code-by-agents) | 764 | やや活発 | @メンション連携 |
| [Simple Code GUI](https://github.com/DonutsDelivery/simple-code-gui) | 25 | - | タブ式セッション管理 |

## 将来の拡張 (Level 2+)

- Git diff / コードレビューペイン
- チェックポイント / タイムライン
- Usage トラッキングダッシュボード
- マルチエージェント並列実行
- スケジュール自動化 (Automations)
- MCP サーバー管理 UI
