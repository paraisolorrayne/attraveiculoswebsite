import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Mesmo alias do tsconfig: o motor do gerador de criativos vive em
      // content/admin/creative/, ao lado do Story Vendido.
      '@content': path.resolve(__dirname, './content'),
    },
  },
})
