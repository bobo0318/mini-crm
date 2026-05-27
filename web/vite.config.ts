import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],

  // 路径别名：让 @/xxx 解析到 src/xxx
  // 配完之后写 import { foo } from '@/utils/format'
  // 比 ../../../utils/format 易读，且文件移动时不需要改 import 路径
  // 注意：仅配 Vite 不够，TS 也要在 tsconfig.app.json 里加 paths 才能让 IDE 跳转和类型检查跟上
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

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
