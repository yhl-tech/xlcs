/**
 * 依赖库入口文件 - index.html 使用
 * 将 CDN 依赖改为本地打包
 */

// driver.js CSS
import "driver.js/dist/driver.css"

// vConsole 移动端调试工具（仅非生产环境）
import VConsole from "vconsole"

const isProduction =
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1" &&
  !window.location.hostname.startsWith("192.168.") &&
  window.location.protocol === "https:"

if (!isProduction) {
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
  if (isMobile || window.location.search.includes("debug=true")) {
    window.vConsole = new VConsole({
      theme: "dark",
      maxLogNumber: 1000,
      onReady: function () {
        console.log("[vConsole] 移动端调试工具已启用")
      },
    })
  }
}
