import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const BACKEND_URL = 'http://localhost:3000'; // 修改为后端地址

// 静态文件
// 提供项目根目录的静态文件（index.html, script/ 等）
app.use(express.static(__dirname));
// 提供 public 目录的静态文件（images/, audio/ 等）
app.use(express.static(path.join(__dirname, 'public')));

// API 代理：所有 /api 请求转发到后端
app.use('/api', createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true
}));

// 其他请求返回 index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 启动服务器，自动检测可用端口
function startServer(port = 8080) {
    const server = app.listen(port, () => {
        console.log(`前端: http://localhost:${port}`);
        console.log(`代理: /api -> ${BACKEND_URL}/api`);
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

