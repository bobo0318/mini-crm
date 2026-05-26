// 健康检查接口
// 按"业务模块"组织：每类接口一个文件（health / auth / customer / contact ...）

import request from '../utils/request'

// 后端 /api/health 返回的数据结构
// 跟 api/src/index.ts 里 c.json({...}) 的字段一一对应
// 加 export 是因为页面组件里可能要用这个类型
export interface HealthResponse {
  status: string
  message: string
  timestamp: string
}

// 调用健康检查接口
// 注意：
//   - request.get 的泛型 <HealthResponse> 让 TS 知道返回类型
//   - 路径写 '/health'（不带 /api），因为 request 实例的 baseURL 已经是 '/api'
//   - async 函数自动返回 Promise，方便业务代码用 await
export async function getHealth(): Promise<HealthResponse> {
  const res = await request.get<HealthResponse>('/health')
  // 拦截器没解包 response.data，所以这里手动取
  return res.data
}
