// 全局设置 store（D11）
//
// 管理两件事：
//   - locale：当前语言（zh-CN / en）
//   - theme：当前主题（light / dark）
//
// 都用 persistedstate 持久化，F5 后保持用户选择

import { defineStore } from 'pinia'
import { ref } from 'vue'

export type Locale = 'zh-CN' | 'en'
export type Theme = 'light' | 'dark'

export const useSettingsStore = defineStore(
  'settings',
  () => {
    // 默认中文 + 亮色（用户首次进来的体验）
    const locale = ref<Locale>('zh-CN')
    const theme = ref<Theme>('light')

    function setLocale(l: Locale) {
      locale.value = l
    }

    function setTheme(t: Theme) {
      theme.value = t
    }

    // 工具方法：切换主题（亮 ↔ 暗）
    function toggleTheme() {
      theme.value = theme.value === 'light' ? 'dark' : 'light'
    }

    // 工具方法：切换语言（中 ↔ 英）
    function toggleLocale() {
      locale.value = locale.value === 'zh-CN' ? 'en' : 'zh-CN'
    }

    return {
      locale,
      theme,
      setLocale,
      setTheme,
      toggleTheme,
      toggleLocale,
    }
  },
  {
    persist: {
      pick: ['locale', 'theme'],
    },
  },
)
