// Cloudflare Workers 入口
//
// Workers runtime 期望模块 export default 一个有 fetch 方法的对象（叫"模块 worker"语法）
// Hono app 本身就是这样的对象（app.fetch 是处理请求的函数），所以直接 re-export 即可
//
// 这个文件极简到只有 2 行：
//   1. 导入 app 定义
//   2. export default 给 Workers runtime
//
// 真正的业务逻辑（路由 / CORS / 中间件）全在 app.ts 里
// 真正的"启动 server"逻辑由 Workers runtime 自己完成（不像 Node 要手动 listen 端口）
//
// 对应的 Node 模式入口在 node-dev.ts —— 那个文件用 @hono/node-server 显式 listen 3000

import app from './app'

export default app
