<script setup lang="ts">
// 根组件
//
// D4 起：所有导航逻辑放到 MainLayout 里，App.vue 只剩一个最外层的路由出口
// D11 起：在最外层包一个 a-config-provider，注入「Ant Design Vue 的语言包 + 主题算法」
//        这俩跟 settings store 联动 —— 用户点切换按钮，整个应用瞬间变样

import { computed, watch } from 'vue'
import { theme } from 'ant-design-vue'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import enUS from 'ant-design-vue/es/locale/en_US'

import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()

// D11：把 settings.theme 同步到 html 标签的 class
// 用途：让全局 CSS（如 style.css 里的 -webkit-autofill 修复）能区分亮/暗主题
// AD Vue 自己的组件颜色已经通过 ConfigProvider 处理；这个 class 只服务于"我们自己写的 CSS"
watch(
  () => settings.theme,
  (val) => {
    document.documentElement.classList.toggle('theme-dark', val === 'dark')
  },
  { immediate: true },
)

// =====================================================
// AD Vue 内置文案的语言包
// =====================================================
//
// AD Vue 自带"上一页/下一页/暂无数据/确认/取消"等内部文案
// 单独维护，跟 vue-i18n 是两套体系 —— 但要联动切换
//
// 用 computed：settings.locale 变 → 这个 antLocale 重算 → a-config-provider 重渲染
const antLocale = computed(() => (settings.locale === 'en' ? enUS : zhCN))

// =====================================================
// 主题算法
// =====================================================
//
// AD Vue 4 内置 darkAlgorithm，传给 ConfigProvider 整套组件库就变暗黑色
// 不用自己定义 CSS 变量、不用维护两套样式表
//
// 注意 theme.darkAlgorithm 是一个"算法函数"，不是字符串名
const themeConfig = computed(() => ({
  algorithm:
    settings.theme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
}))
</script>

<template>
  <!-- :locale 控制 AD Vue 组件文案 -->
  <!-- :theme 控制亮/暗算法 -->
  <a-config-provider :locale="antLocale" :theme="themeConfig">
    <router-view />
  </a-config-provider>
</template>
