import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const BACKEND_URL = 'http://14.103.237.160:29876'; // 开发环境后端地址

// 静态文件
// 提供项目根目录的静态文件（index.html, script/ 等）
app.use(express.static(__dirname));
// 提供 public 目录的静态文件（images/, audio/ 等）
app.use(express.static(path.join(__dirname, 'public')));

// API 代理：所有 /api 请求转发到后端
app.use('/api', createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true,
    // 路径重写：将 /api 前缀去掉，直接转发到后端（与 users 项目保持一致）
    pathRewrite: {
        '^/api': '' // 去掉 /api 前缀，例如 /api/rorschach/user_login -> /rorschach/user_login
    },
    // 日志配置（开发环境）
    logLevel: 'debug',
    onProxyReq: (proxyReq, req, res) => {
    },
    onError: (err, req, res) => {
        console.error('[代理错误]', err.message);
        res.status(500).json({ error: '代理服务器错误' });
    }
}));

// 其他请求返回 index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 启动服务器，自动检测可用端口
function startServer(port = 8080) {
    const server = app.listen(port, () => {
        console.log(`前端: http://localhost:${port}`);
        console.log(`代理: /api -> ${BACKEND_URL} (去掉 /api 前缀)`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`端口 ${port} 被占用，尝试使用 ${port + 1}...`);
            startServer(port + 1);
        } else {
            console.error('服务器启动失败:', err);
            process.exit(1);
        }
    });
}

startServer();

