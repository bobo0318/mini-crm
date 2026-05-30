<script setup lang="ts">
// 主布局组件 —— 中后台所有"登录后看到的页面"都套在这个布局里
// 结构：左侧菜单 + 顶部 header + 右侧内容区（路由出口）
//
// 关键设计：
//   - 这个组件本身不知道里面要渲染哪个页面，而是用 <router-view /> 作为"出口"
//   - 路由表里把 Dashboard / CustomerList 等作为它的 children
//   - 子路由的 component 就会被渲染到 <router-view /> 的位置

import { computed, ref, watch, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  DashboardOutlined,
  TeamOutlined,
  FundOutlined,
  SettingOutlined,
  LogoutOutlined,
  GlobalOutlined,
  BulbOutlined,
  BulbFilled,
} from '@ant-design/icons-vue'
import { message, theme as antTheme } from 'ant-design-vue'

import { useUserStore } from '@/stores/user'
import { useSettingsStore } from '@/stores/settings'

// D11：拿当前主题的 token（亮/暗自动切）
// token.value.colorBgContainer  组件背景色（亮白 / 暗灰）
// token.value.colorBorderSecondary  弱分割线
// token.value.colorText  正文文字色
const { token } = antTheme.useToken()

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const settings = useSettingsStore()

// useI18n() 拿到 t 函数 + locale ref
// 注意：用 { locale } 解构出来的是个 ref，可以双向赋值
const { t, locale: i18nLocale } = useI18n()

// =====================================================
// 联动 settings.locale → vue-i18n 的 locale
// =====================================================
//
// settings store 是项目"语言真理之源"；vue-i18n 的 locale 是它的"使用者"
// F5 后 store hydrate 时 settings.locale 会变成持久化值，watch 一下让 i18n 跟上
// immediate:true 保证首次进来也同步一次
watch(
  () => settings.locale,
  (val) => {
    i18nLocale.value = val
  },
  { immediate: true },
)

// =====================================================
// 侧栏菜单数据（D9 加 permission，D11 把 label 改成 i18nKey）
// =====================================================
type MenuItem = {
  key: string
  i18nKey: string
  icon: Component
  permission?: string
  children?: MenuItem[]
}

const allMenuItems: MenuItem[] = [
  { key: '/dashboard', i18nKey: 'menu.dashboard', icon: DashboardOutlined },
  { key: '/customer/list', i18nKey: 'menu.customer', icon: TeamOutlined, permission: 'customer:read' },
  { key: '/deal/board', i18nKey: 'menu.deal', icon: FundOutlined, permission: 'deal:read' },
  {
    key: '/system',
    i18nKey: 'menu.system',
    icon: SettingOutlined,
    permission: 'role:read',
    children: [
      { key: '/system/role', i18nKey: 'menu.systemRole', icon: SettingOutlined, permission: 'role:read' },
      { key: '/system/user', i18nKey: 'menu.systemUser', icon: TeamOutlined, permission: 'user:read' },
    ],
  },
]

// 派生：当前用户能看到的菜单（递归处理 children）
// 思路：
//   - permission 为空 → 任何人可见
//   - permission 有值 → 检查权限，没权限整条隐藏
//   - 有 children → 先过滤 children；children 过滤后空了 → 父菜单也隐藏
function filterByPermission(items: MenuItem[]): MenuItem[] {
  return items
    .map((item) => {
      // permission 检查
      if (item.permission && !userStore.hasPermission(item.permission)) return null
      // 递归处理 children
      if (item.children) {
        const filteredChildren = filterByPermission(item.children)
        if (filteredChildren.length === 0) return null
        return { ...item, children: filteredChildren }
      }
      return item
    })
    .filter((x): x is MenuItem => x !== null)
}

const visibleMenuItems = computed(() => filterByPermission(allMenuItems))

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
  message.success(t('layout.logout') + ' ✓')
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
        <!-- D9：用 visibleMenuItems（按权限过滤后） -->
        <!-- 有 children → 渲染 a-sub-menu（可展开的折叠菜单）；否则 a-menu-item -->
        <template v-for="item in visibleMenuItems" :key="item.key">
          <a-sub-menu v-if="item.children" :key="item.key">
            <template #title>
              <component :is="item.icon" />
              <span>{{ $t(item.i18nKey) }}</span>
            </template>
            <a-menu-item v-for="child in item.children" :key="child.key">
              <component :is="child.icon" />
              <span>{{ $t(child.i18nKey) }}</span>
            </a-menu-item>
          </a-sub-menu>
          <a-menu-item v-else :key="item.key">
            <!-- component :is 是 Vue 的动态组件语法：把 item.icon 这个组件当成标签来渲染 -->
            <component :is="item.icon" />
            <span>{{ $t(item.i18nKey) }}</span>
          </a-menu-item>
        </template>
      </a-menu>
    </a-layout-sider>

    <!-- 右侧主区域（顶栏 + 内容） -->
    <a-layout>
      <!-- 顶栏：背景/分割线 绑 AD token，主题切换自动跟 -->
      <a-layout-header
        class="header"
        :style="{
          background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }"
      >
        <!-- 顶栏左侧占位（D11 可以加面包屑） -->
        <div class="header-left"></div>

        <!-- 顶栏右侧：切换按钮 + 用户名 + 下拉菜单 -->
        <a-space :size="12">
          <!-- 语言切换：点一下中英互换；按钮上显示对方语言提示用户"会切到啥" -->
          <a-tooltip :title="$t('layout.languageTip')">
            <a-button type="text" @click="settings.toggleLocale">
              <template #icon><GlobalOutlined /></template>
              {{ settings.locale === 'zh-CN' ? 'EN' : '中' }}
            </a-button>
          </a-tooltip>

          <!-- 主题切换：亮 ↔ 暗。图标也换：亮态显示 Bulb（开灯），暗态显示 BulbFilled（实心灯） -->
          <a-tooltip :title="$t('layout.themeTip')">
            <a-button type="text" @click="settings.toggleTheme">
              <template #icon>
                <BulbFilled v-if="settings.theme === 'dark'" />
                <BulbOutlined v-else />
              </template>
            </a-button>
          </a-tooltip>

          <!-- a-dropdown 鼠标悬停在 trigger 上显示下拉内容 -->
          <a-dropdown>
            <span class="user-trigger" :style="{ color: token.colorText }">
              {{ userStore.userInfo?.name || '用户' }}
              <span class="email">({{ userStore.userInfo?.email }})</span>
            </span>

            <!-- v-slot:overlay 是 a-dropdown 的具名插槽，放下拉菜单本体 -->
            <template #overlay>
              <a-menu>
                <a-menu-item key="logout" @click="handleLogout">
                  <LogoutOutlined />
                  <span>{{ $t('layout.logout') }}</span>
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </a-space>
      </a-layout-header>

      <!-- 内容区：路由出口 -->
      <!-- 子路由的页面会渲染到这里；背景同样绑 token -->
      <a-layout-content
        class="content"
        :style="{ background: token.colorBgContainer }"
      >
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

/* 顶栏（D11：background / border 走 token inline style，亮暗主题自动跟） */
.header {
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  /* 占位，把下拉菜单挤到右侧 */
  flex: 1;
}

.user-trigger {
  cursor: pointer;
  /* color 走 inline style 的 token.colorText（亮暗自动跟） */
  padding: 0 8px;
  transition: color 0.2s;
}
.user-trigger:hover {
  color: #1677ff;
}
.email {
  /* #999 在亮/暗模式下都还能看（中灰 vs 中浅灰对比都够）—— 不动 */
  color: #999;
  margin-left: 4px;
  font-size: 12px;
}

/* 内容区（D11：background 走 token inline style） */
.content {
  margin: 16px;
  padding: 24px;
  /* 内容区本身允许滚动，不影响顶栏和侧栏 */
  min-height: calc(100vh - 64px - 32px);
}
</style>
