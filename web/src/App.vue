<script setup lang="ts">
// 根组件
// D4 起：所有导航逻辑放到 MainLayout 里，App.vue 只剩下一个最外层的路由出口
// - 访问 /login → 渲染 Login.vue（无侧栏）
// - 访问其他路径 → 渲染 MainLayout（侧栏 + 顶栏 + 内部 <router-view />）
</script>

<template>
  <router-view />
</template>
