import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react],

  test: {
    environment: 'jsdom',
    globals: true,
    clearMocks: true
  },

  coverage: {
  reporter: ['text', 'json', 'json-summary'],
  reportsDirectory: './coverage',
  include: ['src/**/*.js', 'src/**/*.jsx']
}
})