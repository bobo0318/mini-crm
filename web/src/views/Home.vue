<script setup lang="ts">
// 这里暂时不需要写任何逻辑
// Ant Design Vue 的组件等会儿在 main.ts 全局注册后，
// template 里可以直接用 <a-button>，不需要 import
</script>

<template>
  <div class="home">
    <h1>Mini CRM 工作台</h1>
    <p>这是 D1 阶段搭出来的第一个页面。能看到下面三个有样式的按钮，就说明 Ant Design Vue 接好了。</p>

    <a-space>
      <a-button type="primary">主要按钮</a-button>
      <a-button>默认按钮</a-button>
      <a-button type="dashed">虚线按钮</a-button>
    </a-space>
  </div>
</template>

<style scoped>
.home {
  padding: 24px;
}
</style>
