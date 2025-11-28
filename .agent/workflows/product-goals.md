# Intent Definition ($\mathcal{I}$)

このファイルはエージェントに対する初期入力パラメータであり、収束すべき $World_\infty$ の定義である。

## 🎯 Target State ($World_\infty$)
**Vision**: 特養シフト管理の完全自動化と法令遵守の両立。作成者の負担をゼロにし、ケアの質を最大化する。

## 📏 Convergence Criteria (KPIs)
以下の条件満たすとき、世界は完成とみなされる。
1. **Compliance**: 月またぎを含む7連勤の完全防止、夜勤明け公休の徹底。
2. **Efficiency**: シフト作成時間を数時間から数分へ短縮。
3. **Completeness**: 全勤務区分（A2, D1, N1等）と職員属性（常勤/パート）の完全対応。

## 📅 Transformation Steps (Roadmap)
- **Phase 1**: マスタデータ整備 (勤務区分, 職員情報, 定数設定)
- **Phase 2**: コアロジック実装 (月またぎ連勤防止, 自動生成アルゴリズム)
- **Phase 3**: UI/UX実装 (シフト表, ドラッグ編集, リアルタイムバリデーション)
- **Phase 4**: 帳票出力 & 本番運用化
