// Vue Router 配置 + 路由守卫
//
// 路由守卫是 D3 的关键：决定"什么时候能进什么页"
// 核心规则：
//   - meta.public = true 的路由：任何人都能访问（如 /login）
//   - 其他路由：必须已登录；没登录 → 踢到 /login，并把目标 URL 用 query.redirect 记下来

import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

import { useUserStore } from '../stores/user'
import { getMe } from '../api/auth'

// =====================================================
// 路由表
// =====================================================
// D4 起改成"嵌套路由"结构：
//   /login 单独在外面（登录页不需要侧栏）
//   其他所有页面都是 MainLayout 的子路由 —— 进入这些页面时
//   会先渲染 MainLayout（侧栏 + 顶栏），里面的 <router-view /> 再渲染对应子页面
//
// 子路由的 path 不写前导 '/'，最终完整路径自动拼接：
//   '' + '/' + 'dashboard'    → /dashboard
//   '' + '/' + 'customer/list' → /customer/list
const routes: RouteRecordRaw[] = [
  // 登录页：独立于 Layout，不带侧栏
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/Login.vue'),
    // public: true 表示这个路由不需要登录
    // 守卫里靠这个标志放行
    meta: { public: true },
  },

  // 受保护页面统统挂在 MainLayout 下
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    // 访问 / 时直接跳到 /dashboard（写在 redirect 里，路由守卫会从 /dashboard 那条记录上读 meta）
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue'),
      },
      {
        path: 'customer/list',
        name: 'CustomerList',
        component: () => import('../views/customer/CustomerList.vue'),
      },

      // D1 时建的测试页，保留作为参考
      {
        path: 'home',
        name: 'Home',
        component: () => import('../views/Home.vue'),
      },
      {
        path: 'about',
        name: 'About',
        component: () => import('../views/About.vue'),
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// =====================================================
// 路由守卫 router.beforeEach
// =====================================================
//
// 每次路由切换"在跳转完成前"执行
// 参数：
//   to    -> 要去的目标路由
//   from  -> 当前所在路由
//   next  -> Vue Router 4 推荐 return 一个值代替调用 next()
//             - return true  / return undefined：放行
//             - return '/xxx' 或 { name: 'Xxx' }：改去这里
//             - return false：取消跳转
//
// async 函数：因为 F5 刷新时我们要 await getMe() 验证 token
router.beforeEach(async (to) => {
  const userStore = useUserStore()

  // 情况 1：目标是 public 路由（比如 /login）→ 任何状态都放行
  // 但有个小优化：已经登录的用户访问 /login，直接踢回工作台（没必要再让他登录）
  if (to.meta.public) {
    if (to.name === 'Login' && userStore.isLoggedIn) {
      return '/dashboard'
    }
    return true
  }

  // 情况 2：受保护路由
  //   2a. 没 token → 跳登录页，记下原 URL
  if (!userStore.token) {
    return {
      name: 'Login',
      query: { redirect: to.fullPath },
    }
  }

  //   2b. 本次会话还没验证过 token（典型场景：F5 刷新后）
  //       isInitialized 不持久化，每次 F5 都是 false
  //       这里调 getMe() 兼具两个作用：
  //         ① 让后端验证 token 真实有效（防止用户手动篡改 localStorage 伪造登录）
  //         ② 顺便拉一次最新的 user 信息（覆盖 localStorage 里可能过期的 userInfo）
  if (!userStore.isInitialized) {
    try {
      const user = await getMe()
      userStore.setUserInfo(user)
      userStore.setInitialized()
    } catch {
      // getMe 401 → axios 拦截器已经做了 logout + 跳登录页
      // 这里 return false 取消当前跳转，避免短暂渲染受保护页
      return false
    }
  }

  //   2c. 一切就绪，放行
  return true
})

export default router
