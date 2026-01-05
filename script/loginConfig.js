/**
 * 登录页面环境配置
 * 用于控制登录方式的显示
 */

// 读取环境变量
const showUsernameLogin = import.meta.env.VITE_SHOW_USERNAME_LOGIN === 'true'

// 导出到全局
window.LOGIN_CONFIG = {
  showUsernameLogin,
}

export default {
  showUsernameLogin,
}
