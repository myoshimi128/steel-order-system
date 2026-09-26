// Vitest（単体テスト）の設定。
// 画面から切り離した純粋な関数（lib/pricing など）のテストに使う。

import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      // tsconfig.json の paths（"@/*": ["./*"]）と同じ別名をテストでも使えるようにする
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    // DOM を使わない計算ロジックのテストのみのため、Node 環境で実行する
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules/**', '.next/**'],
  },
})
