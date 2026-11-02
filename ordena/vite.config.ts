import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    // distritos-mx's Django (docker compose, :8110) answers /api/ for the ordena host; Vite forwards there, so no CORS is needed in development.
    proxy: { '/api': { target: 'http://localhost:8110', headers: { Host: 'ordena.localhost' } } },
  },
})
