# content/ — 教材コンテンツ（リビルドをまたいで引き継ぐデータ）

UI 非依存の教材・資産データ。
**新実装はここのテキストと ID を正として使うこと**（ファイル形式・スキーマの変更は自由。中身の意味を変えない）。

| ファイル | 内容 | 備考 |
|---|---|---|
| `quizzes.js` | 各ステージの問題文・正解・解説 | **正解値(`correctAnswer`/`correctAnswerIndex`)は DB のクリア記録と対応する仕様の一部。変更禁止**。問題文に正解値を書かないこと |
| `stories.js` | 物語ナレーションと章・小章の summary | C-14 で「桃太郎＝パケット」の比喩に統一済み |
| `glossary.js` | 用語集(6 語) | 増補計画は `docs/content-and-ux-redesign-plan.md` C-8 |
| `stages.js` | stageId ↔ routeName ↔ タイトルの台帳 | **stageId 1〜7 は DB の `clear_records.stage_id` と対応。変更禁止** |
| `models.js` | 3D アセット台帳(GLB のパス・サイズ・生成方法) | アセットは `frontend/public/models/` に実在 |

## 整合性テストの復活義務

新実装では以下を検証する Vitest テストを必ず用意すること:

1. `stages.js` の stageId が 1〜7 で重複なく揃っている。routeName とルーター定義が一致する。
2. 正解値のロック（DB のクリア記録と対応するため変更禁止）:
   - stage-1-1 の `correctAnswer` = `192.168.1.20`
   - stage-2-2 の `correctAnswer` = `192.168.20.1`
   - stage-3-2 の `correctAnswerIndex` = `1`
   - stage-4-2 の復習クイズ = イヌ `1`・キジ `0`・サル `2`
3. 選択式の `correctAnswerIndex` が選択肢の範囲内にある。
4. `stories.js` の全小章の stageId・routeName が `stages.js` と一致する。
5. `models.js` の全 `path` が `frontend/public/models/` に実在する。
