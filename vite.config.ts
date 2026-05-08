import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = {
    ...loadEnv('dev', process.cwd(), ''),
    ...loadEnv(mode, process.cwd(), ''),
  }
  const backendUrl = env.VITE_BACK_URL || 'http://localhost:8080'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/athletes': backendUrl,
        '/api': backendUrl,
      },
    },
  }
})
