// Vue Router 4 的官方路由配置
import { createRouter, createWebHistory } from 'vue-router'

// 路由表：URL 和组件的对应关系
const routes = [
  {
    path: '/',
    name: 'Home',
    // 这里用 "懒加载" 写法：访问到这个路由时才去下载 Home.vue 的代码
    // 等价于：component: HomeComponent，但更省首屏流量
    component: () => import('../views/Home.vue'),
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('../views/About.vue'),
  },
]

// 用 createRouter 工厂函数创建路由实例
const router = createRouter({
  // createWebHistory: 使用 HTML5 history 模式（URL 干净，没有 #）
  // 对比 createWebHashHistory: hash 模式（URL 形如 /#/about）
  history: createWebHistory(),
  routes,
})

// 默认导出，让 main.ts 能 import 进去
export default router
