<script setup lang="ts">
// 工作台占位页
// D4 起这个页面是 MainLayout 的子路由：顶部 / 侧栏 / 退出按钮都由 Layout 提供
// 这里只关心"工作台自己的内容"——D10 会换成正式的 ECharts 仪表盘
import { useUserStore } from '../stores/user'

const userStore = useUserStore()
</script>

<template>
  <div>
    <h2>工作台</h2>
    <p class="welcome">
      欢迎，<strong>{{ userStore.userInfo?.name || '用户' }}</strong>
    </p>

    <a-card title="登录态信息" style="max-width: 600px; margin-top: 24px">
      <p>用户 ID：{{ userStore.userInfo?.id }}</p>
      <p>邮箱：{{ userStore.userInfo?.email }}</p>
      <p>是否已登录：{{ userStore.isLoggedIn ? '是' : '否' }}</p>
      <p style="word-break: break-all">
        Token（前 40 字符）：{{ userStore.token.slice(0, 40) }}...
      </p>
    </a-card>
  </div>
</template>

<style scoped>
.welcome {
  color: #666;
  margin-top: 8px;
}
</style>
