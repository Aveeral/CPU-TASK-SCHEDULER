import react from '@vitejs/plugin-react'
import { defineConfig, mergeConfig } from 'vite'
import { defineConfig as defineVitestConfig } from 'vitest/config'

const vitestConfig = defineVitestConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
  },
})

// https://vite.dev/config/
export default mergeConfig(
  defineConfig({
    base: '/CPU-TASK-SCHEDULER/',
    plugins: [react()],
  }),
  vitestConfig
)
