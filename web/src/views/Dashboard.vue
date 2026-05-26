<script setup lang="ts">
// 工作台占位页
// 用来验证"登录后能进到这里 + 能拿到用户信息 + 能登出"
// D10 会换成正式的仪表盘（三张 ECharts 图表）

import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()

// 登出：清 store + 跳登录页
function handleLogout() {
  userStore.logout()
  message.success('已退出登录')
  router.replace('/login')
}
</script>

<template>
  <div class="dashboard">
    <h1>Mini CRM 工作台</h1>
    <p class="welcome">
      欢迎，<strong>{{ userStore.userInfo?.name || '用户' }}</strong>
      （{{ userStore.userInfo?.email }}）
    </p>

    <a-card title="登录态信息" style="max-width: 600px; margin-top: 24px">
      <p>用户 ID：{{ userStore.userInfo?.id }}</p>
      <p>是否已登录：{{ userStore.isLoggedIn ? '是' : '否' }}</p>
      <p style="word-break: break-all">
        Token（前 40 字符）：{{ userStore.token.slice(0, 40) }}...
      </p>
    </a-card>

    <div style="margin-top: 24px">
      <a-button type="primary" danger @click="handleLogout">
        退出登录
      </a-button>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  padding: 32px;
}
.welcome {
  color: #666;
  margin-top: 8px;
}
</style>
