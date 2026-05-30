// vue-i18n 实例创建（D11）
//
// 入口约定：main.ts import 这里的 i18n 实例 + app.use(i18n)
// 业务组件用 useI18n() 拿 t 函数，或模板里直接 $t('xxx')（globalInjection）

import { createI18n } from 'vue-i18n'

import zhCN from './zh-CN'
import en from './en'

// =====================================================
// 默认语言：从 localStorage 读
// =====================================================
//
// 为什么不从 Pinia store 读？
//   时序问题：i18n 在 main.ts 里 createI18n 时就要知道默认 locale，
//   但 Pinia store 实例化在 app.use(pinia) 之后才有，
//   而且 persistedstate 的 hydrate 也是 use(pinia) 之后才发生
//
// 直接读 localStorage：
//   - persistedstate 默认 key 是 store id（'settings'），value 是整个 state 的 JSON
//   - 我们只需要 locale 字段；解析失败兜底中文
function getInitialLocale(): 'zh-CN' | 'en' {
  try {
    const raw = localStorage.getItem('settings')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.locale === 'en' || parsed.locale === 'zh-CN') {
        return parsed.locale
      }
    }
  } catch {
    // localStorage 损坏 / JSON 解析失败 → 走默认
  }
  return 'zh-CN'
}

export const i18n = createI18n({
  // Composition API 模式（项目整体风格）
  // 用 Options API 的 legacy 模式 type 麻烦、跟 Vue 3 setup 不合
  legacy: false,

  // 让模板里能直接用 $t('key')，组件里不用每次都 useI18n()
  globalInjection: true,

  locale: getInitialLocale(),
  fallbackLocale: 'zh-CN',  // 当某个 key 在当前语言找不到时，回退到中文

  messages: {
    'zh-CN': zhCN,
    en,
  },
})
