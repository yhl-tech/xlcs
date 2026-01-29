import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  
  server: {
    port: 8080,
    open: false,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://14.103.237.160:29876',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  
  preview: {
    port: 8080,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://14.103.237.160:29876',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/xlcp/api': {
        target: 'http://14.103.237.160:29876',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/xlcp\/api/, '')
      }
    }
  },
  
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true
      },
      mangle: true,
      format: {
        comments: false
      }
    },
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp/i.test(ext)) {
            return 'images/[name]-[hash][extname]'
          }
          if (/mp3|wav|ogg|m4a/i.test(ext)) {
            return 'audio/[name]-[hash][extname]'
          }
          if (/css/i.test(ext)) {
            return 'css/[name]-[hash][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        },
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        manualChunks: {
          three: ['three'],
          vconsole: ['vconsole'],
          vendor: ['axios', 'driver.js']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    emptyOutDir: true,
    reportCompressedSize: true
  },
  
  base: '/xlcp/',  // 部署在 /xlcp 子路径下
  publicDir: 'public',
  
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia', 'axios', 'three']
  }
})
