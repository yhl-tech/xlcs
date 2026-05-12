# 塞拉（psyla）前端部署

静态部署，不用 Docker。本地 `pnpm` 构建后用 `rsync` 同步到服务器，由服务器 Nginx 提供服务。

- 生产：`https://psyla.cn/`
- 测试：`https://psyla.cn/ror_test/`

---

## 1. 准备

**本机**：Node 18+、pnpm 8+

**服务器目录**：

```text
/var/www/html/
├── dist/         # 生产
└── ror_test/     # 测试
```

---

## 2. 构建

```bash
pnpm install            # 首次或锁文件变更时

pnpm run build:prod     # → dist/        (资源前缀 /)
pnpm run build:test     # → ror_test/    (资源前缀 /ror_test/)
```

环境变量见仓库根目录的 `.env.production` / `.env.test`，三套环境都通过 `/api` 访问后端。

---

## 3. 部署

把构建产物文件夹整体上传到服务器，覆盖旧的同名文件夹：

| 环境 | 本地       | 服务器              |
|------|-----------|---------------------|
| 生产 | `dist/`     | `/var/www/html/dist/`     |
| 测试 | `ror_test/` | `/var/www/html/ror_test/` |

修改了 `nginx.conf` 才需要 reload：`nginx -t && nginx -s reload`

---

## 4. Nginx 关键配置

完整配置见仓库 `nginx.conf`。`psyla.cn` 站点的关键点：

```nginx
server {
    server_name psyla.cn www.psyla.cn;
    root  /var/www/html/dist;
    index index.html;

    # API / 实时服务反代
    location /api/      { proxy_pass http://14.103.237.160:29876/; }
    location /realtime/ { proxy_pass http://129.226.147.53:8765/realtime/; }
    location /ws/ {
        proxy_pass http://127.0.0.1:8765/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # 测试子路径
    location = /ror_test       { return 301 https://$host/ror_test/; }
    location ^~ /ror_test/ {
        root /var/www/html;
        try_files $uri $uri/ /ror_test/index.html;
    }

    # 生产 SPA 回退
    location / {
        try_files $uri $uri/ /index.html;
    }

    listen 443 ssl;
    ssl_certificate     /etc/letsencrypt/live/psyla.cn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/psyla.cn/privkey.pem;
}
```

切换后端地址只改 nginx，前端不用重新打包。

---

## 5. 部署后检查

- `https://psyla.cn/` 和 `https://psyla.cn/ror_test/` 都能打开
- 登录、Realtime 对话、报告生成正常

需要回滚时，发布前先备份：

```bash
ssh root@psyla.cn 'cp -a /var/www/html/dist /var/www/html/dist.bak-$(date +%Y%m%d-%H%M%S)'
```
