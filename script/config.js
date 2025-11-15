/**
 * 统一配置文件
 * 根据环境自动选择 WebSocket URL
 */

// 判断是否为生产环境
// Vite 中：import.meta.env.PROD 在生产构建时为 true
// import.meta.env.MODE 可以是 'development' 或 'production'
const isProduction = typeof import.meta !== 'undefined' && (
  import.meta.env?.PROD === true || 
  import.meta.env?.MODE === 'production'
);

// WebSocket 配置
export const WS_CONFIG = {
  // 开发环境
  development: 'ws://localhost:8765',
  // 生产环境（使用域名和 wss:// 因为页面通过 HTTPS 加载）
  production: 'wss://www.jionlp.com/xlcp/ws/'
};
// 获取当前环境的 WebSocket URL
export const getWebSocketUrl = () => {
  if (isProduction) {
    return WS_CONFIG.production;
  }
  return WS_CONFIG.development;
};

// 导出默认配置
export default {
  wsUrl: getWebSocketUrl(),
  isProduction
};

