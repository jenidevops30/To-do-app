import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0', // Bind to all network interfaces
    port: 5173,
    allowedHosts: true, // Allow all hosts (useful for tunnels/any IP)
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path,
      }
    }
  },
  test: {
    globals: true,
    environment: 'happy-dom',
  },
})
