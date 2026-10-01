import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/unshuffle/',
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.{js,jsx}'],
  },
})
