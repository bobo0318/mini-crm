// Vue 应用入口文件
// 整个项目的代码执行从这里开始

// ① 从 Vue 引入工厂函数
import { createApp } from 'vue'

// ② Pinia 状态管理库
import { createPinia } from 'pinia'
// Pinia 的持久化插件：让 store 数据自动同步到 localStorage，F5 刷新不丢
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

// ③ Ant Design Vue 组件库（全量引入）
import Antd from 'ant-design-vue'
// Ant Design Vue 4 自带的 CSS reset，去掉浏览器默认样式（h1 边距、a 下划线等）
import 'ant-design-vue/dist/reset.css'

// ④ 路由实例（注意路径是 './router'，会自动找该目录下的 index.ts）
import router from './router'

// ⑤ 全局样式（Vite 模板自带的，先保留）
import './style.css'

// ⑥ 根组件
import App from './App.vue'

// ⑦ 自定义指令（D9）
import { vAuth } from './directives/auth'

// =====================================================
// 创建 Vue 应用实例
// =====================================================
const app = createApp(App)

// =====================================================
// 创建 Pinia 实例，并挂上持久化插件
// =====================================================
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

// =====================================================
// 链式调用 .use() 注册插件，最后 .mount() 挂载到 DOM
// 顺序无所谓，但习惯上：状态管理 → 路由 → UI 库
// =====================================================
app
  .use(pinia)   // 注册 Pinia，从此所有组件能用 useXxxStore()
  .use(router)  // 注册 Vue Router，从此 <router-view> 和 <router-link> 生效
  .use(Antd)    // 注册 Ant Design Vue，从此 <a-button> 等组件全局可用
  .directive('auth', vAuth)  // 注册 v-auth 自定义指令（D9 按钮级权限）
  .mount('#app') // 挂载到 index.html 里那个 <div id="app">
