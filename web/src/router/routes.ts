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
//     /home /about               D1 测试页

import type { RouteRecordRaw } from 'vue-router'

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
