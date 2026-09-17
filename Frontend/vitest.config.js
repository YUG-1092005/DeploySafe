import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react],
  test: {
    environment: 'jsdom',
    globals: true,
    clearMocks: true,
    poolOptions: {
      forks: {
        execArgv: ['--no-experimental-webstorage']
      }
    },
    coverage: {
      reporter: ['text', 'json', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      exclude: ['src/**/*.test.{js,jsx,ts,tsx}', 'src/**/*.d.ts']
    }
  }
})