<script setup lang="ts">
// 登录页
// 路径：/login   不需要登录态也能访问（在路由守卫里会放行）

import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import type { Rule } from 'ant-design-vue/es/form'

import { login } from '@/api/auth'
import { useUserStore } from '@/stores/user'

// =====================================================
// 依赖：router 用来跳转，route 用来读 query.redirect
// =====================================================
const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// =====================================================
// 表单数据 & 校验规则
// =====================================================
// reactive 比 ref 更适合"一坨字段"的场景；模板里直接 form.email 用，不用 .value
const form = reactive({
  email: 'admin@test.com', // 默认填好，方便调试；正式项目要去掉
  password: '123456',
})

// a-form 的 rules 写法（你在 Vben 里见过）
// 每个字段一个数组，可以放多条规则
const rules: Record<string, Rule[]> = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
}

// 提交时的 loading 态：防止用户连点 → 重复提交
const loading = ref(false)

// =====================================================
// 提交登录
// =====================================================
// a-form 的 finish 事件回调：在表单校验全部通过后才会触发
async function handleSubmit() {
  loading.value = true
  try {
    // 1. 调登录接口（拦截器统一处理错误，这里只关心成功逻辑）
    const result = await login({
      email: form.email,
      password: form.password,
    })

    // 2. 把 token 和 user 存进 store（persistedstate 插件会自动同步到 localStorage）
    userStore.setAuth(result)

    // 3. 提示一下
    message.success('登录成功')

    // 4. 跳转
    //    - 如果 URL 上有 ?redirect=xxx，说明是从某个受保护页被踢回来的，登录后回到那
    //    - 没有就默认进工作台 /dashboard
    //    redirect 来自 query，可能是 string 或 LocationQueryValue[]，做个兼容
    const redirect = route.query.redirect
    const target = typeof redirect === 'string' ? redirect : '/dashboard'
    router.replace(target)
  } catch {
    // 错误信息已经被 axios 拦截器统一弹出，这里啥都不用做
    // 加 catch 是为了避免控制台出现 unhandled promise rejection
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <!-- 整页居中容器，浅灰背景 -->
  <div class="login-page">
    <div class="login-card">
      <h2 class="login-title">Mini CRM 登录</h2>

      <!--
        a-form 的几个要点：
          - :model 绑定数据对象
          - :rules 绑定校验规则
          - @finish 提交时（校验通过后）触发
          - layout="vertical" 让 label 在输入框上方（中后台常见布局）
      -->
      <a-form
        :model="form"
        :rules="rules"
        layout="vertical"
        @finish="handleSubmit"
      >
        <a-form-item label="邮箱" name="email">
          <a-input
            v-model:value="form.email"
            placeholder="请输入邮箱"
            allow-clear
          />
        </a-form-item>

        <a-form-item label="密码" name="password">
          <a-input-password
            v-model:value="form.password"
            placeholder="请输入密码"
          />
        </a-form-item>

        <a-form-item>
          <a-button
            type="primary"
            html-type="submit"
            block
            :loading="loading"
          >
            登录
          </a-button>
        </a-form-item>

        <div class="login-hint">
          默认账号：admin@test.com / 123456
        </div>
      </a-form>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f2f5;
}

.login-card {
  width: 360px;
  padding: 32px 28px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.login-title {
  text-align: center;
  margin: 0 0 24px;
  font-size: 22px;
  color: #1f1f1f;
}

.login-hint {
  margin-top: 8px;
  text-align: center;
  font-size: 12px;
  color: #999;
}
</style>
