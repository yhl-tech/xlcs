/**
 * 统一配置文件
 * 根据环境自动选择 WebSocket URL 和 API Base URL
 */

// 判断是否为生产环境
// Vite 中：import.meta.env.PROD 在生产构建时为 true
// import.meta.env.MODE 可以是 'development' 或 'production'
const isProduction = typeof import.meta !== 'undefined' && (
  import.meta.env?.PROD === true || 
  import.meta.env?.MODE === 'production'
);

// 根据环境选择 API Base URL
const getApiBaseUrl = () => {
  if (isProduction) {
    // 生产环境 - 从环境变量获取，如果没有则使用默认值
    return import.meta.env?.VITE_API_BASE_URL || 'https://your-production-api-domain.com/api';
  }
  // 开发环境 - 使用代理
  return '/api';
};

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

// API 配置
export const API_CONFIG = {
  baseURL: getApiBaseUrl(),
  isProduction: isProduction
};

// 分析接口使用的固定 API Key
const ANALYZE_API_KEY = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJkb25ncml4aW55dSIsImV4cCI6MTc2MzQ1NzU1Nn0.gCGNkTXgLcOhC8GuQZNfiXCljyA5JJCOqgRaPT83wkM";

// 导出到全局（供非模块代码使用）
if (typeof window !== 'undefined') {
  window.ANALYZE_API_KEY = ANALYZE_API_KEY;
  window.API_CONFIG = API_CONFIG;
}

// 导出默认配置
export default {
  wsUrl: getWebSocketUrl(),
  apiBaseUrl: getApiBaseUrl(),
  isProduction
};

// 导出 API Key（供模块使用）
export { ANALYZE_API_KEY };