import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],

  // 开发服务器配置
  server: {
    // 代理：前端开发时，所有 /api 开头的请求都转发到后端 3000 端口
    // 浏览器看到的请求像是发给 5173 自己的（同源），实际由 Vite 转发到 3000
    // 好处：开发时前端不用 CORS，也不用在代码里写完整的 http://localhost:3000/api/xxx
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // 转发目标：后端地址
        changeOrigin: true, // 修改请求头里的 Origin，让后端以为请求是从 3000 自己发来的（避免某些 CORS 校验）
      },
    },
  },
})
