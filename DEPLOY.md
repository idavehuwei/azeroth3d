# 部署指南

## 概述

Azeroth3D 是一个纯前端单页游戏，部署方式极其简单：只需要一个静态文件服务器。

## 最小部署

```bash
# 方案一：使用任何 HTTP 服务器托管文件
python3 -m http.server 8080
# 浏览器访问 http://localhost:8080/game.html
```

```bash
# 方案二：使用 nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/azeroth3d;
    index game.html;
}
```

## 线上部署

### 静态托管（推荐）

将项目目录上传到任意静态托管服务：

- **GitHub Pages**
- **Vercel** / **Netlify**
- **Cloudflare Pages**
- **AWS S3 + CloudFront**

无需构建步骤，直接上传即可。

### 注意事项

1. **Three.js 依赖 CDN。** 游戏使用 CDN 加载 Three.js，确保部署环境可以访问 `cdnjs.cloudflare.com`。
2. **`file://` 协议限制。** 由于 Three.js 从 CDN 加载，`file://` 协议下可能因 CORS 限制无法工作。建议使用本地 HTTP 服务器。
3. **存档功能。** 存档数据存储在 `localStorage`，导出存档功能兼容 `file://` 环境。

## 性能建议

- 启用 gzip 压缩（HTML/JS/CSS 文件）
- 设置适当的缓存头（静态文件可缓存 7 天）
- 如使用自定义域名，配置 HTTPS

## 部署清单

- [ ] 所有文件上传至服务器
- [ ] `game.html` 可正常访问
- [ ] Three.js CDN 加载正常
- [ ] 游戏流程完整可玩（出生 → 任务 → 杀猪 → 进本 → 击杀 Boss）
- [ ] HTTPS 已配置（如使用自定义域名）