import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, req, res) => {
            console.error('❌ Proxy error:', err.message);
            console.error('   Request:', req.method, req.url);
            if (res && !res.headersSent) {
              res.writeHead(500, {
                'Content-Type': 'text/plain',
              });
              res.end('Proxy error: ' + err.message);
            }
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('📤 Proxying request:', req.method, req.url, '→ http://127.0.0.1:5000' + req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('📥 Proxy response:', req.method, req.url, 'Status:', proxyRes.statusCode);
          });
        },
      },
      '/uploads': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})