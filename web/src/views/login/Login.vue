<script setup lang="ts">
// 登录页
// 路径：/login   不需要登录态也能访问（在路由守卫里会放行）
//
// D11：全量 i18n + 加语言切换按钮（用户登录前也能切语言）

import { computed, reactive, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { message, theme as antTheme } from 'ant-design-vue'
import { GlobalOutlined } from '@ant-design/icons-vue'
import type { Rule } from 'ant-design-vue/es/form'

import { login } from '@/api/auth'
import { useUserStore } from '@/stores/user'
import { useSettingsStore } from '@/stores/settings'

// D11：拿当前主题 token，给登录页的背景/卡片用，暗黑自动跟
const { token } = antTheme.useToken()

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const settings = useSettingsStore()
const { t, locale: i18nLocale } = useI18n()

// 联动 settings.locale → vue-i18n.locale
// 跟 MainLayout 同套路（登录页跟主布局是平级路由，i18n 不会自动跨页面同步）
watch(
  () => settings.locale,
  (val) => {
    i18nLocale.value = val
  },
  { immediate: true },
)

// =====================================================
// 表单数据 & 校验规则
// =====================================================
const form = reactive({
  email: 'admin@test.com',
  password: '123456',
})

// rules 用 computed 包一层：i18n locale 变了，校验消息也跟着变
// 不用 computed 也能跑，但用户切语言后触发校验会看到旧 locale 的红字
const rules = computed<Record<string, Rule[]>>(() => ({
  email: [
    { required: true, message: t('login.emailRequired'), trigger: 'blur' },
    { type: 'email', message: t('login.emailInvalid'), trigger: 'blur' },
  ],
  password: [
    { required: true, message: t('login.passwordRequired'), trigger: 'blur' },
  ],
}))

const loading = ref(false)

async function handleSubmit() {
  loading.value = true
  try {
    const result = await login({
      email: form.email,
      password: form.password,
    })

    userStore.setAuth(result)
    message.success(t('common.success'))

    const redirect = route.query.redirect
    const target = typeof redirect === 'string' ? redirect : '/dashboard'
    router.replace(target)
  } catch {
    // 错误信息已经被 axios 拦截器统一弹出
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <!-- D11：背景/卡片背景绑 token，暗黑模式自动跟 -->
  <div class="login-page" :style="{ background: token.colorBgLayout }">
    <!-- 右上角语言切换：浮动定位 -->
    <a-button class="lang-switch" type="text" @click="settings.toggleLocale">
      <template #icon><GlobalOutlined /></template>
      {{ settings.locale === 'zh-CN' ? 'EN' : '中' }}
    </a-button>

    <div
      class="login-card"
      :style="{
        background: token.colorBgContainer,
        color: token.colorText,
      }"
    >
      <h2 class="login-title">{{ $t('login.title') }}</h2>
      <p class="login-subtitle">{{ $t('login.subtitle') }}</p>

      <a-form
        :model="form"
        :rules="rules"
        layout="vertical"
        @finish="handleSubmit"
      >
        <a-form-item name="email">
          <a-input
            v-model:value="form.email"
            :placeholder="$t('login.emailPlaceholder')"
            allow-clear
            size="large"
          />
        </a-form-item>

        <a-form-item name="password">
          <a-input-password
            v-model:value="form.password"
            :placeholder="$t('login.passwordPlaceholder')"
            size="large"
          />
        </a-form-item>

        <a-form-item>
          <a-button
            type="primary"
            html-type="submit"
            block
            size="large"
            :loading="loading"
          >
            {{ $t('login.submit') }}
          </a-button>
        </a-form-item>

        <div class="login-hint">
          默认账号 / Default：admin@test.com / 123456
        </div>
      </a-form>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  /* background 走 inline style 的 token.colorBgLayout，亮暗自动跟 */
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.lang-switch {
  position: absolute;
  top: 16px;
  right: 24px;
}

.login-card {
  /* background / color 走 inline style 的 token */
  width: 360px;
  padding: 32px 28px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.login-title {
  text-align: center;
  margin: 0 0 4px;
  font-size: 22px;
}

.login-subtitle {
  text-align: center;
  color: #999;
  font-size: 13px;
  margin: 0 0 24px;
}

.login-hint {
  margin-top: 8px;
  text-align: center;
  font-size: 12px;
  color: #999;
}
</style>
