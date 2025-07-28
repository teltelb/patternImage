// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages のリポジトリ名を指定
export default defineConfig({
  base: '/patternImage/', // ← ここはリポジトリ名に合わせる
  plugins: [react()],
})