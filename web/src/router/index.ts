// Router 入口
// 只做三件事：创建 router、注入守卫、导出
// 具体的路由表见 routes.ts，守卫逻辑见 guards.ts

import { createRouter, createWebHistory } from 'vue-router'

import { routes } from './routes'
import { setupRouterGuards } from './guards'

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 注入守卫（依赖注入：把 router 传给 guards，避免循环依赖）
setupRouterGuards(router)

export default router
