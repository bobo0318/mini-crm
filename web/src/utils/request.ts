// HTTP 请求封装
// 整个前端共用同一个 axios 实例 + 统一的拦截器
// 后续所有 api/xxx.ts 文件都从这里 import request 来发请求

import axios from 'axios'
import { message } from 'ant-design-vue'

// 创建一个 axios 实例
// 不用全局 axios，是为了项目专属配置（baseURL、拦截器）不污染全局
const request = axios.create({
  // 所有请求都自动加上 /api 前缀
  // 比如调 request.get('/health')，实际请求路径是 /api/health
  // 配合 vite.config.ts 的 proxy，Vite 会把 /api/health 转发到后端 http://localhost:3000/api/health
  baseURL: '/api',

  // 超时：10 秒还没回应就自动取消
  // 业务上有意义：用户不会傻等无限久；同时防止僵尸请求占资源
  timeout: 10000,
})

// =====================================================
// 请求拦截器：所有请求"发出去前"会经过这里
// =====================================================
//
// 用途：
//   - 注入 token（D3 会在这里加 JWT，让每个请求自动带认证头）
//   - 加全局 loading 计数（D4+ 可选）
//   - 改造请求（比如统一编码 / 加时间戳）
request.interceptors.request.use(
  (config) => {
    // D3 我们会在这里加入：
    //   const token = useUserStore().token
    //   if (token) config.headers.Authorization = `Bearer ${token}`
    // 现在 D2 阶段还没登录，先空着
    return config
  },
  (error) => {
    // 请求还没发出去就报错（极少见，比如配置错了）
    return Promise.reject(error)
  },
)

// =====================================================
// 响应拦截器：所有响应"回到业务代码前"会经过这里
// =====================================================
//
// 用途：
//   - 成功响应：统一处理（比如解包 response.data）
//   - 失败响应：统一弹错误提示，让业务代码不用每个 catch 都写 message.error
request.interceptors.response.use(
  // 第 1 个回调：HTTP 状态 2xx 走这里
  (response) => {
    // 这里直接 return response（不解包），业务代码自己取 .data
    // 也可以 return response.data 解包，但那样 TS 类型推导更麻烦
    // 我们选简单清晰的写法
    return response
  },

  // 第 2 个回调：HTTP 状态非 2xx，或网络错误走这里
  (error) => {
    const status = error.response?.status

    // 用 Ant Design Vue 的全局消息提示，统一弹错误
    if (status === 401) {
      // 未登录或 token 过期
      // D3 会在这里跳转登录页
      message.error('未登录或登录已过期')
    } else if (status === 403) {
      // 已登录但没权限
      message.error('没有权限访问该资源')
    } else if (status && status >= 500) {
      // 后端报错
      message.error('服务器错误，请稍后重试')
    } else {
      // 兜底：用后端返回的错误信息（如果有），否则用 axios 的错误信息
      message.error(error.response?.data?.message || error.message || '请求失败')
    }

    // 继续抛出，让业务代码的 catch 还能拿到错误（如果它想做额外处理）
    return Promise.reject(error)
  },
)

// 导出供 api/xxx.ts 使用
export default request
