<script setup lang="ts">
// 从 Vue 引入响应式 API
import { ref } from 'vue'

// 引入我们刚封装的健康检查 API 函数 + 它的返回类型
// 注意：type HealthResponse 这种写法叫"仅类型导入"，编译后不会进 bundle
import { getHealth, type HealthResponse } from '../api/health'

// =====================================================
// 响应式状态（Composition API 的核心）
// =====================================================

// 按钮 loading 状态
// ref() 把一个普通值包装成响应式：模板里读 loading 自动跟踪，改 loading.value 自动触发重渲染
const loading = ref(false)

// 后端返回的数据
// 类型 HealthResponse | null：开始为 null，调通后变成接口返回的对象
const result = ref<HealthResponse | null>(null)

// =====================================================
// 事件处理函数
// =====================================================

// 点击按钮时执行
async function handleTest() {
  loading.value = true
  try {
    // 调健康检查接口
    // 整条链路：getHealth() → request.get('/health') → Vite proxy → 后端 → 返回 JSON
    result.value = await getHealth()
  } finally {
    // 不管成功失败都关 loading
    // 失败时 message.error 已经被 request.ts 的响应拦截器自动弹了，
    // 业务代码不用再 catch + 弹错（这就是拦截器的价值）
    loading.value = false
  }
}
</script>

<template>
  <div class="home">
    <h1>Mini CRM 工作台</h1>
    <p>
      D2 阶段：测试前后端连通性。点下面按钮，前端会调后端的
      <code>/api/health</code> 接口，把结果显示出来。
    </p>

    <a-space direction="vertical" size="large" style="width: 100%; max-width: 600px;">
      <!-- 按钮 -->
      <!-- :loading="loading" 是 v-bind 简写，把变量绑定到组件 prop -->
      <!-- @click="handleTest" 是 v-on 简写，绑定点击事件 -->
      <a-button type="primary" :loading="loading" @click="handleTest">
        测试后端连接（调 /api/health）
      </a-button>

      <!-- 有数据时显示后端返回的 JSON -->
      <!-- v-if 是条件渲染：result 不为 null 时这个块才存在 -->
      <a-card v-if="result" title="后端返回的数据" size="small">
        <pre>{{ JSON.stringify(result, null, 2) }}</pre>
      </a-card>

      <!-- 没数据时显示提示 -->
      <!-- v-else 跟在 v-if 后面，只在前面那个 v-if 不成立时显示 -->
      <a-alert
        v-else
        type="info"
        message="还没调过，点上面按钮试试"
        show-icon
      />
    </a-space>
  </div>
</template>

<style scoped>
.home {
  padding: 24px;
}

pre {
  margin: 0;
  background: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  font-family: ui-monospace, Menlo, monospace;
  font-size: 14px;
}
</style>
