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
    // 让 vue / vue-i18n 共享同一个 vue runtime 实例
    // 多实例会导致 vue-i18n 拿到的 currentInstance 是另一个 vue 副本，
    // 出现 "init_runtime_dom_esm_bundler is not defined" 类的内部错误
    dedupe: ['vue'],
  },

  // D11：让 Vite 不预构建 vue-i18n
  // 默认 Vite 会用 esbuild 把 vue-i18n 打成单文件 ESM 放 .vite/deps/，
  // 但 vue-i18n 11.x 的 esm-bundler 入口里对 @vue/runtime-dom 的引用方式
  // 跟 esbuild 的 ESM 处理不兼容（init_xxx helper 被错位 hoist），导致运行时 ReferenceError
  // exclude 后浏览器直接走原生 ESM 加载 vue-i18n，问题消失
  optimizeDeps: {
    exclude: ['vue-i18n'],
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
