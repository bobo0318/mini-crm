# CLAUDE.md — 项目交接文件

> 这份文件每次新对话都会自动加载。
> **新对话第一件事：读完这份文件 + 读 [PROJECT_PLAN.md](PROJECT_PLAN.md)，再开始任何动作。**

---

## 一句话项目说明

Mini CRM —— 一个 Vue 3 + Vite + TS 全栈中后台 demo 项目。
作者本人正在学习中，最终用于求职作品集（目标：洛阳/郑州 Vue 中后台前端岗）。

## 用户画像（重要）

- **目前真会的**：Vue 3 + TS + Vite + Ant Design Vue + Pinia + Vue Router + 中后台业务（基于 Vben Admin 模板做过大量业务）
- **目前不会的**：Node.js 后端、Drizzle ORM、Hono、JWT、SQLite、数据库设计 —— 本项目里的后端部分是边做边学
- **熟悉公司栈但不会从 0 搭**：之前所有项目都是基于 Vben Admin 模板二次开发，没自己 Vite 从零搭过
- **不要假设他懂任何后端术语**：JWT、middleware、cookie/session 区别、CORS 这些都要讲清楚

## 协作约定（必须遵守）

1. **全程用中文** —— 包括代码注释、解释、提交信息
2. **慢就是快** —— 每一步代码都要讲清楚"在干什么、为什么这么干"，他要能理解才往下走
3. **不要一次性甩大段代码** —— 按文件分批给，每段写完先解释，等他确认再下一段
4. **不要替他做决策** —— 关键技术选择（比如要不要加某个库）先问他
5. **遇到 bug 不要直接修** —— 先解释 bug 原因，让他理解后再动手
6. **不要主动重构 / 优化**已经在跑的代码 —— 他要的是逐步理解，不是看你炫技
7. **不要写多余的注释 / 文档** —— 但本项目是学习项目，**核心机制（如路由守卫、axios 拦截器、JWT 流程）的注释要详细**，对他来说每行注释都是教材
8. **不要主动用 emoji**

## 当前进度

```
[x] D0 - 项目立项 + PROJECT_PLAN.md + CLAUDE.md
[x] D1 - 前端脚手架（Vite + Vue 3 + TS）
[x] D2 - 后端脚手架（Hono + Drizzle + SQLite）+ 前后端 hello world 打通
[x] D3 - 登录鉴权全链路（JWT + 拦截器 + 路由守卫）
[ ] D4-D5 - 客户管理模块
[ ] D6 - 联系人 + 跟进记录
[ ] D7-D8 - 销售漏斗 Kanban
[ ] D9 - 权限三级控制
[ ] D10 - 工作台仪表盘
[ ] D11 - i18n + 暗黑模式
[ ] D12 - 部署上线 + README
```

> 完成每个阶段后，**在这里把对应行的 [ ] 改为 [x]**，并在下面"最近进展"加一行简短记录。

### 最近进展

- 2026-05-25：项目立项，PROJECT_PLAN.md 写完，等待开始 D1
- 2026-05-25：GitHub 仓库 https://github.com/bobo0318/mini-crm 创建并首次 push 成功（CLAUDE.md + PROJECT_PLAN.md）
- 2026-05-25：D1 完成 —— Vite + Vue 3 + TS 前端脚手架；Ant Design Vue / Pinia / Pinia persistedstate / Vue Router 已挂载到 main.ts；建立 views/Home + views/About 双页面 + router/index.ts；验证路由切换 + Ant Design Vue 按钮渲染均正常
- 2026-05-26：D2 完成 —— 后端 api/ 脚手架（Hono + tsx + ESM）；SQLite + Drizzle 接入，users 表已通过 db:push 建好；后端 /api/health 接口 + CORS；前端 axios 封装（utils/request.ts）+ api/health.ts + Vite proxy；Home.vue 点按钮成功调通 GET /api/health，全链路打通
- 2026-05-26：D3 完成 —— 登录鉴权全链路打通。后端：bcryptjs 哈希、JWT 工具（.env 配 SECRET）、`POST /api/auth/register`、`POST /api/auth/login`、JWT 中间件、`GET /api/me`；前端：Pinia user store（token + userInfo 持久化、isInitialized 不持久化用于 F5 验签）、axios 请求拦截器自动注入 token + 响应拦截器统一处理 401 跳登录、登录页 + 工作台占位、路由守卫 `beforeEach` 区分 public / 受保护路由。手动测试 6 个 case（含 localStorage 伪造攻击防御）全部通过

---

## 技术栈（锁定，不要擅自换）

### 前端 `web/`
Vue 3 + Vite + TypeScript + `<script setup>` + 组合式 API
+ Ant Design Vue 4 + Pinia + pinia-plugin-persistedstate
+ Vue Router 4 + axios + ECharts + vuedraggable + md-editor-v3 + vue-i18n

### 后端 `api/`
Hono + @hono/node-server + Drizzle ORM + better-sqlite3
+ jsonwebtoken + bcryptjs + zod

### 部署（D12 再用）
前端 Vercel + 后端 Railway + 数据库 Turso（云上 SQLite）

---

## 项目结构

```
mini-crm/
├── PROJECT_PLAN.md       ← 完整项目计划与学习手册
├── CLAUDE.md             ← 本文件
├── README.md             ← D12 才写
├── web/                  ← 前端
└── api/                  ← 后端
```

详细子目录结构见 PROJECT_PLAN.md 第六部分。

---

## 常用命令速查

```bash
# 前端开发
cd web && npm run dev          # 启动前端 http://localhost:5173
cd web && npm run build        # 生产构建

# 后端开发
cd api && npm run dev          # 启动后端 http://localhost:3000
cd api && npm run db:push      # 推送 Drizzle schema 到 SQLite
cd api && npm run db:studio    # 打开 Drizzle Studio (可视化查数据库)

# Git
git add . && git commit -m "..." && git push
```

> 注意：dev 命令的具体写法以 package.json 为准（D1/D2 设置时定）

---

## 给新对话的开场指令

**当用户说"开始 D1"或类似话**，请按这个顺序：
1. 先 Read PROJECT_PLAN.md 第七部分对应阶段的描述
2. 跟用户口头确认要做的具体范围
3. 一个文件一个文件地写，每写一个先解释这个文件的作用
4. 写完一批后，给清楚的下一步指引（"现在请你跑 `npm run dev` 看效果"）
5. 等用户确认看到效果，再进下一批

**当用户说"我卡住了 / 报错了"**：
1. 先让他贴完整错误信息和相关代码
2. 解释错误原因（不是只说怎么修）
3. 给修复方案，让他自己改一遍
4. 改完确认能跑通，再继续

**当用户问"为什么这么写 / 还有别的写法吗"**：
- 鼓励这种问题，详细解答，必要时对比 2-3 种方案的取舍

---

## 不要做的事

- ❌ 不要建议他换技术栈（除非他主动要求）
- ❌ 不要建议他用 Vben Admin 模板（本项目就是要练从 0 搭）
- ❌ 不要写测试代码（学习阶段不必要，会增加他的认知负担）
- ❌ 不要引入复杂的设计模式（DDD、Clean Architecture 等都不需要）
- ❌ 不要建议加 ESLint / Prettier / husky 等工具链（D1 先专注跑通，工程化最后再加）
- ❌ 不要 push 到 GitHub —— 由用户自己 git push，AI 只 commit
