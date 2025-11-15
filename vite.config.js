import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';

/**
 * Vite 构建配置
 * 用于打包罗夏墨迹测试前端项目
 */
export default defineConfig({
  // 项目根目录
  root: '.',
  // publicPath:'/xlcp/',
  // 构建配置
  build: {
    // 输出目录
    outDir: 'dist',
    
    // 是否生成 source map（生产环境建议关闭）
    sourcemap: false,
    
    // 构建后是否生成 manifest.json
    manifest: false,
    
    // 压缩配置
    minify: 'esbuild', // 使用 esbuild 进行压缩（快速且高效，Vite 默认）
    // esbuild 配置（生产环境删除 console 和 debugger）
    esbuild: {
      drop: ['console', 'debugger'], // 生产环境删除 console 和 debugger
    },
    // 如需使用 terser（更好的压缩效果），需要安装: npm install -D terser
    // minify: 'terser',
    // terserOptions: {
    //   compress: {
    //     drop_console: true,  // 删除 console
    //     drop_debugger: true, // 移除 debugger
    //   },
    // },
    
    // CSS 代码分割（将 CSS 提取到独立文件）
    cssCodeSplit: true,
    
    // 资源内联阈值（小于此大小的资源会被内联为 base64）
    assetsInlineLimit: 4096, // 4KB
    
    // 代码分割配置
    rollupOptions: {
      input: 'index.html', // 入口文件
      output: {
        // 资源文件命名
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `images/[name]-[hash][extname]`;
          }
          if (/mp3|wav|ogg|m4a/i.test(ext)) {
            return `audio/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext)) {
            return `css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        // JS 文件命名
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        // 手动代码分割（可选）
        manualChunks: undefined, // 使用默认的自动分割策略
      },
    },
    
    // 构建大小警告阈值（KB）
    chunkSizeWarningLimit: 1000,
    
    // 是否在构建时清空输出目录
    emptyOutDir: true,
    
    // 报告压缩后的大小（gzip）
    reportCompressedSize: true,
  },
  
  // 开发服务器配置（用于 vite preview）
  server: {
    port: 8080,
    open: false,
    cors: true,
  },
  
  // 预览服务器配置
  preview: {
    port: 8080,
    open: false,
    cors: true,
  },
  
  // 公共基础路径
  base: './',
  
  // 静态资源处理
  // 使用 public 目录，Vite 会自动复制 public 目录下的所有文件到 dist 根目录
  publicDir: 'public',
  
  // 优化配置
  optimizeDeps: {
    // 预构建的依赖（axios 使用 CDN，不需要预构建）
    include: [],
  },
  
  // 插件配置
  plugins: [
    // HTML 压缩插件
    createHtmlPlugin({
      minify: {
        // 移除 HTML 注释
        removeComments: true,
        // 折叠空白字符
        collapseWhitespace: true,
        // 移除属性引号（如果可能）
        removeAttributeQuotes: false, // 保持引号，避免潜在问题
        // 移除空属性
        removeEmptyAttributes: true,
        // 折叠布尔属性
        collapseBooleanAttributes: true,
        // 移除可选标签
        removeOptionalTags: false, // 保持标签结构
        // 移除 script 标签的 type="text/javascript"
        removeScriptTypeAttributes: true,
        // 移除 style 标签的 type="text/css"
        removeStyleLinkTypeAttributes: true,
        // 使用最短的 DOCTYPE
        useShortDoctype: true,
        // 最小化内联 CSS
        minifyCSS: true,
        // 最小化内联 JavaScript
        minifyJS: true,
      },
    }),
  ],
});

