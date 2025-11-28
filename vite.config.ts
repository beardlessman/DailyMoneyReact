import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Позволяет доступ из сети
    port: 5173, // Порт по умолчанию
    strictPort: false, // Если порт занят, попробует следующий
  },
  build: {
    // Убеждаемся, что service worker и manifest копируются в dist
    rollupOptions: {
      output: {
        // Сохраняем структуру для PWA файлов
      }
    }
  }
})
