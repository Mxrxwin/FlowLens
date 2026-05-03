import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Proxy target switches by env:
//   - local dev:  http://localhost:8080  (default fallback)
//   - in Docker:  http://service1-backend:8080  (set via compose `environment:`)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../../', '');
  const backend = env.SERVICE1_BACKEND_URL || 'http://localhost:8080';

  return {
    plugins: [react()],
    envDir: '../../',
    server: {
      host: '0.0.0.0',
      port: 5174,
      proxy: {
        '/api': backend,
        '/ingest': backend,
      },
    },
  };
});
