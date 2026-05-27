// 路由守卫
// 接受 router 作为参数（依赖注入），避免直接 import 'router/index'（循环依赖）
//
// 当前只有一个 beforeEach 守卫，D9 加权限三级控制时会在这里继续加：
//   - meta.roles 权限校验
//   - 动态菜单计算
//   - 等等

import type { Router } from 'vue-router'

import { useUserStore } from '@/stores/user'
import { getMe } from '@/api/auth'

export function setupRouterGuards(router: Router) {
  // =====================================================
  // beforeEach：每次路由切换"在跳转完成前"执行
  // =====================================================
  // 规则：
  //   meta.public = true → 任何人能访问（如 /login）
  //   其他路由         → 必须已登录，否则跳登录页带 redirect
  router.beforeEach(async (to) => {
    const userStore = useUserStore()

    // 情况 1：public 路由
    // 小优化：已经登录的用户访问 /login，直接踢回工作台
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

    //   2b. 本次会话还没验证过 token（F5 刷新后）
    //       isInitialized 不持久化，每次 F5 都是 false
    //       这里调 getMe() 让后端验签，防止伪造 localStorage
    if (!userStore.isInitialized) {
      try {
        const user = await getMe()
        userStore.setUserInfo(user)
        userStore.setInitialized()
      } catch {
        // 401 已经被 axios 拦截器处理（logout + 跳登录）
        // 这里 return false 取消当前跳转，避免短暂渲染受保护页
        return false
      }
    }

    //   2c. 一切就绪，放行
    return true
  })
}
