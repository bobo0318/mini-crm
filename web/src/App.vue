<script setup lang="ts">
// 根组件暂时不需要逻辑，路由切换由 Vue Router 自动处理
</script>

<template>
  <!-- 顶部导航栏：router-link 是 Vue Router 提供的全局组件，渲染成 <a> 标签，点击不刷新页面 -->
  <header class="nav">
    <router-link to="/" class="nav-link">首页</router-link>
    <router-link to="/about" class="nav-link">关于</router-link>
  </header>

  <!-- router-view 是"路由出口"：当前匹配到哪个路由，对应组件就在这里渲染 -->
  <!-- 比如访问 /，渲染 Home.vue；访问 /about，渲染 About.vue -->
  <main>
    <router-view />
  </main>
</template>

<style scoped>
.nav {
  padding: 12px 24px;
  border-bottom: 1px solid #eee;
  display: flex;
  gap: 16px;
}

.nav-link {
  color: #1677ff;
  text-decoration: none;
}

/* router-link 在"当前激活的路由"上会自动加 router-link-active 类，可以这样高亮 */
.nav-link.router-link-active {
  font-weight: bold;
  color: #003a8c;
}
</style>
