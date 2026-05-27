<script setup lang="ts">
// 主布局组件 —— 中后台所有"登录后看到的页面"都套在这个布局里
// 结构：左侧菜单 + 顶部 header + 右侧内容区（路由出口）
//
// 关键设计：
//   - 这个组件本身不知道里面要渲染哪个页面，而是用 <router-view /> 作为"出口"
//   - 路由表里把 Dashboard / CustomerList 等作为它的 children
//   - 子路由的 component 就会被渲染到 <router-view /> 的位置

import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  DashboardOutlined,
  TeamOutlined,
  LogoutOutlined,
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// =====================================================
// 侧栏菜单数据
// =====================================================
// key：用 path 做 key，方便和当前路由 path 对应（高亮联动）
// label：菜单显示文字
// icon：菜单图标（Ant Design 图标组件）
// 后续 D6/D7/D8/D9 会陆续加联系人、销售漏斗、团队等菜单项
const menuItems = [
  { key: '/dashboard', label: '工作台', icon: DashboardOutlined },
  { key: '/customer/list', label: '客户管理', icon: TeamOutlined },
]

// =====================================================
// 当前选中的菜单项（高亮联动）
// =====================================================
// a-menu 的 selectedKeys 是一个数组（支持多选场景），单选时数组里只有一个值
// 用 computed 让它跟着 route.path 自动变：路由变 → 菜单高亮跟着变
//
// 这里没有用 v-model:selectedKeys 双向绑定，是因为：
//   "菜单高亮 = 当前路由"这个关系是单向的——路由说了算
//   用户点菜单的动作走 handleMenuClick，里面调 router.push，路由变了菜单自然就高亮变了
const selectedKeys = computed(() => [route.path])

// 点击菜单：跳到对应路由
function handleMenuClick({ key }: { key: string }) {
  router.push(key)
}

// =====================================================
// 侧栏收起 / 展开
// =====================================================
// Ant Design Vue 的 a-layout-sider 自带 collapsible 功能
// 我们只需要用 v-model:collapsed 绑一个 ref，组件底部会自动渲染"收起按钮"
const collapsed = ref(false)

// =====================================================
// 退出登录
// =====================================================
function handleLogout() {
  userStore.logout()
  message.success('已退出登录')
  router.replace('/login')
}
</script>

<template>
  <a-layout class="main-layout">
    <!-- 左侧菜单栏 -->
    <!-- v-model:collapsed 用 v-model 简写双向绑定 collapsed 这个 ref -->
    <!-- collapsible：开启"折叠"功能，组件底部自动出收起按钮 -->
    <!-- theme="dark"：黑底白字（Ant Design 中后台经典侧栏样式） -->
    <a-layout-sider
      v-model:collapsed="collapsed"
      collapsible
      theme="dark"
      :width="200"
    >
      <!-- Logo 区：折叠后只显示首字母 -->
      <div class="logo">
        {{ collapsed ? 'M' : 'Mini CRM' }}
      </div>

      <!-- 菜单 -->
      <!-- mode="inline"：竖向菜单（横向是 horizontal） -->
      <!-- theme="dark"：跟侧栏主题一致 -->
      <a-menu
        :selected-keys="selectedKeys"
        mode="inline"
        theme="dark"
        @click="handleMenuClick"
      >
        <a-menu-item v-for="item in menuItems" :key="item.key">
          <!-- component :is 是 Vue 的动态组件语法：把 item.icon 这个组件当成标签来渲染 -->
          <component :is="item.icon" />
          <span>{{ item.label }}</span>
        </a-menu-item>
      </a-menu>
    </a-layout-sider>

    <!-- 右侧主区域（顶栏 + 内容） -->
    <a-layout>
      <!-- 顶栏 -->
      <a-layout-header class="header">
        <!-- 顶栏左侧占位（D11 可以加面包屑） -->
        <div class="header-left"></div>

        <!-- 顶栏右侧：用户名 + 下拉菜单 -->
        <!-- a-dropdown 鼠标悬停在 trigger 上显示下拉内容 -->
        <a-dropdown>
          <span class="user-trigger">
            {{ userStore.userInfo?.name || '用户' }}
            <span class="email">({{ userStore.userInfo?.email }})</span>
          </span>

          <!-- v-slot:overlay 是 a-dropdown 的具名插槽，放下拉菜单本体 -->
          <template #overlay>
            <a-menu>
              <a-menu-item key="logout" @click="handleLogout">
                <LogoutOutlined />
                <span>退出登录</span>
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </a-layout-header>

      <!-- 内容区：路由出口 -->
      <!-- 子路由的页面会渲染到这里 -->
      <a-layout-content class="content">
        <router-view />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<style scoped>
.main-layout {
  /* 占满整个视口高度，否则侧栏不会顶天立地 */
  min-height: 100vh;
}

/* Logo 区 */
.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  /* 让 logo 跟侧栏一体 */
  background: rgba(255, 255, 255, 0.05);
}

/* 顶栏 */
.header {
  /* Ant Design 默认 header 是深蓝色，这里覆盖成白色更"中后台风" */
  background: #fff;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* 顶栏下面来一条浅灰分割线 */
  border-bottom: 1px solid #f0f0f0;
}

.header-left {
  /* 占位，把下拉菜单挤到右侧 */
  flex: 1;
}

.user-trigger {
  cursor: pointer;
  color: #333;
  /* 让 hover 时有反馈 */
  padding: 0 8px;
  transition: color 0.2s;
}
.user-trigger:hover {
  color: #1677ff;
}
.email {
  color: #999;
  margin-left: 4px;
  font-size: 12px;
}

/* 内容区 */
.content {
  /* 内容跟顶栏 / 侧栏之间留点间距 */
  margin: 16px;
  padding: 24px;
  background: #fff;
  /* 内容区本身允许滚动，不影响顶栏和侧栏 */
  min-height: calc(100vh - 64px - 32px);
}
</style>
