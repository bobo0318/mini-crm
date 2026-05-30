// 路由表
// D6 起从 index.ts 拆出来：以后加新模块路由都改这一个文件，不动 index.ts
//
// 路由结构：
//   /login                       独立（不走 Layout）
//   /                            走 MainLayout
//     /dashboard                 工作台
//     /customer/list             客户列表
//     /customer/:id              客户详情（D6 新增）
//     /deal/board                销售漏斗看板（D7 新增）
//     /system/role               角色管理（D9 新增，admin only）
//     /system/user               用户管理（D9 新增，admin only）
//     /home /about               D1 测试页

import type { RouteRecordRaw } from 'vue-router'

// 扩展 vue-router 的 RouteMeta 类型
// 这样 routes 里写 meta.public / meta.permission 时 TS 有补全和类型校验
// declare module 是给已有模块"打补丁"加类型，不是定义新模块
declare module 'vue-router' {
  interface RouteMeta {
    /** 公共页面（不要求登录），如 /login */
    public?: boolean
    /** 访问此路由需要的权限码（D9）；缺省 = 已登录即可，无额外要求 */
    permission?: string | string[]
  }
}

export const routes: RouteRecordRaw[] = [
  // 登录页：独立于 Layout，不带侧栏
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/Login.vue'),
    meta: { public: true },
  },

  // 受保护页面统统挂在 MainLayout 下
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
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
      {
        // 客户详情：:id 是动态参数，URL 里取数字（如 /customer/16）
        // 组件内用 useRoute().params.id 拿到
        path: 'customer/:id',
        name: 'CustomerDetail',
        component: () => import('../views/customer/CustomerDetail.vue'),
        // props: true 让 :id 自动作为 props 传给组件，比 useRoute().params.id 更解耦
        // 但本项目我们用 useRoute() 也行；这里选 props: true 让组件签名更明确
        props: true,
      },

      // 销售漏斗看板（D7 新增）
      // 路径用 /deal/board，未来如果加列表页可以 /deal/list，共享 /deal 命名空间
      {
        path: 'deal/board',
        name: 'DealBoard',
        component: () => import('../views/deal/DealBoard.vue'),
      },

      // 系统管理（D9 新增，admin only —— meta.permission 让路由守卫拦截非 admin）
      // Phase 3 会把这俩占位页换成真页面
      {
        path: 'system/role',
        name: 'SystemRole',
        meta: { permission: 'role:read' },
        component: () => import('../views/system/RoleList.vue'),
      },
      {
        path: 'system/user',
        name: 'SystemUser',
        meta: { permission: 'user:read' },
        component: () => import('../views/system/UserList.vue'),
      },

      // D1 时建的测试页
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
