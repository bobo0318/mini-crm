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
[x] D4-D5 - 客户管理模块
[x] D6 - 联系人 + 跟进记录
[x] D7-D8 - 销售漏斗 Kanban
[x] D9 - 权限三级控制
[x] D10 - 工作台仪表盘
[x] D11 - i18n + 暗黑模式
[ ] D12 - 部署上线 + README
```

> 完成每个阶段后，**在这里把对应行的 [ ] 改为 [x]**，并在下面"最近进展"加一行简短记录。

### 最近进展

- 2026-05-25：项目立项，PROJECT_PLAN.md 写完，等待开始 D1
- 2026-05-25：GitHub 仓库 https://github.com/bobo0318/mini-crm 创建并首次 push 成功（CLAUDE.md + PROJECT_PLAN.md）
- 2026-05-25：D1 完成 —— Vite + Vue 3 + TS 前端脚手架；Ant Design Vue / Pinia / Pinia persistedstate / Vue Router 已挂载到 main.ts；建立 views/Home + views/About 双页面 + router/index.ts；验证路由切换 + Ant Design Vue 按钮渲染均正常
- 2026-05-26：D2 完成 —— 后端 api/ 脚手架（Hono + tsx + ESM）；SQLite + Drizzle 接入，users 表已通过 db:push 建好；后端 /api/health 接口 + CORS；前端 axios 封装（utils/request.ts）+ api/health.ts + Vite proxy；Home.vue 点按钮成功调通 GET /api/health，全链路打通
- 2026-05-26：D3 完成 —— 登录鉴权全链路打通。后端：bcryptjs 哈希、JWT 工具（.env 配 SECRET）、`POST /api/auth/register`、`POST /api/auth/login`、JWT 中间件、`GET /api/me`；前端：Pinia user store（token + userInfo 持久化、isInitialized 不持久化用于 F5 验签）、axios 请求拦截器自动注入 token + 响应拦截器统一处理 401 跳登录、登录页 + 工作台占位、路由守卫 `beforeEach` 区分 public / 受保护路由。手动测试 6 个 case（含 localStorage 伪造攻击防御）全部通过
- 2026-05-27：D4 完成（D4-D5 客户管理模块的前半）—— 后端：customers 表（含 level/stage 枚举字段用 TS 字面量约束、tags JSON 列、owner_id 外键关联 users）+ CRUD 5 个接口（列表分页/搜索、详情、新增、编辑、删除），owner_id 从 JWT 取防伪造。前端：搭 MainLayout（a-layout-sider 侧栏菜单 + 顶栏用户下拉退出登录），路由改成嵌套结构（受保护页全部挂 MainLayout.children），客户列表页 a-table 真表格 + a-input-search 搜索 + 分页 + level/stage/tags 染色 tag。test.http 加了 ⑧~⑳ 共 13 条用例测后端 CRUD，全过。⚠️ 中途踩坑：REST Client 的 `# @name <名字>` 那行后面不能跟任何字符（之前 D3 写的 `# @name login   ← ...` 把 name 解析坏了），已修
- 2026-05-27：D5 完成（D4-D5 客户管理模块的后半）—— 抽了 BasicForm 通用表单组件（Schema 驱动，支持 Input/InputNumber/Textarea/Select，暴露 validate/resetFields，[components/BasicForm/](web/src/components/BasicForm/)），核心知识点：v-model 代理模式（computed get/set + emit）、`<component :is>` 动态组件、defineExpose；客户新增/编辑共用 CustomerFormModal（基于 BasicForm），open(record?) 一个方法切换两种模式，标签字段用 Select mode=tags 支持任意输入；删除用 a-popconfirm 二次确认 + 删最后一条自动回上一页；Excel 导出用 xlsx (SheetJS)，抽了通用 `utils/excel.ts`（columns 配置 + format 转换 + 自动列宽），导出范围"筛选后全部"（pageSize=9999 拉一次）。约定取舍：表格故意省略 source 列（中后台常见做法：表格只放核心字段，详情/导出含全字段），代码里加注释说明
- 2026-05-27：客户模块拆分 refactor —— 客户视图从单文件拆到 customer.data.ts（columns/stageMap/levelColorMap/formSchemas）+ utils/format.ts（formatTime）；引入"单一数据源派生多视图"模式：STAGE_LIST 是源头，stageMap（表格染色）和 STAGE_OPTIONS（Select 用）从同一份派生，加减枚举只改一处
- 2026-05-27：D6 完成 —— 联系人 + 跟进记录。**后端**：contacts / follow_ups 两张表 + 6 个接口，REST 嵌套资源风格（集合操作走 /customers/:cid/contacts，单体操作走 /contacts/:id），follow_ups 追加 only（只有 GET/POST，无 PUT/DELETE，业务约定 = 接口设计）；user_id / customer_id 从 URL 或 JWT 取，前端不传防伪造。**前端 router 轻拆**：router/ 拆成 index.ts（入口装配）+ routes.ts（路由表）+ guards.ts（守卫），guards 用依赖注入（setupRouterGuards(router)）避免循环 import。**详情页**：/customer/:id，顶部摘要 + 3 Tab（基本信息 / 联系人 / 跟进记录），列表姓名列变链接进详情。**联系人 Tab**：ContactList 设计为"可嵌入组件"（props: customerId），ContactFormModal 复用 BasicForm，主联系人用 a-tag 标"主"。**跟进 Tab**：FollowUpTimeline 用 a-timeline + md-editor-v3 的 MdPreview 渲染 Markdown，FollowUpFormModal 手写 a-form（**有意不复用 BasicForm**——字段少 + Markdown 编辑器特殊，体现"通用组件不是越多越好"的取舍）。**顺手修弹窗 bug**：弹窗校验状态残留导致红字闪烁，给 a-modal 加 :destroy-on-close="true" 彻底解决（CustomerFormModal / ContactFormModal 同步修复），BasicForm 顺便加了 clearValidate 方法。装新依赖：md-editor-v3
- 2026-05-29：D7-D8 完成 —— 销售漏斗看板。**后端**：deals 表（stage 5 枚举 lead/contact/quote/won/lost，amount 用 real，probability 0-100 给 D10 仪表盘加权金额用）+ CRUD 5 接口；列表不分页（看板要一次看完才能拖）+ 默认排除 lost（看板视图）；zod schema 可空字段用 `.nullish()`（同时接受 undefined 和 null —— 之前 `.optional()` 拒 null 导致前端编辑预填 null 字段保存失败）。**前端看板架构**：先 D7 用 dealList 平铺 + computed 分组做静态骨架，D8 改 boardGroups reactive 对象（vuedraggable 要 v-model 可写数组，computed 派生不行）。**vuedraggable@next 拖拽**：4 列同 group="deal" 跨列拖，@change 只处理 added 分支；⭐ **乐观更新 + 失败回滚**：拖完瞬间本地改 deal.stage、再调接口，失败时回滚字段值 + 把卡片从目标列 splice 出来 push 回源列。**DealFormModal**：复用 BasicForm，formSchemas 写成工厂函数 `getFormSchemas(customers)` 让 customerId Select 的 options 动态来自客户列表（首次打开拉一次客户列表缓存到外层 ref，后续打开复用）。**标记丢失**：卡片右上角 × 按钮 hover 显示 + a-popconfirm 二次确认；为防按钮区域被识别成拖拽柄，draggable 加 `filter=".no-drag"` + `prevent-on-filter="false"`，按钮加 class="no-drag" + `@click.stop`（防冒泡触发卡片整体的 handleEdit）。"丢失"不开第 5 列（视觉聚焦），标记后从看板 splice 掉同时 push 到 boardGroups.lost 桶保留数据完整。**装新依赖**：vuedraggable@next（v4，Vue 3 兼容；原版 v2 只支持 Vue 2）。⚠️ 中途踩坑 2 个：(1) vuedraggable 的 `#item` 插槽要求只有一个根节点，**HTML 注释也算节点**，加注释会报 "Item slot must have only one child"，注释只能放在 `<template>` 外或 div 内部；(2) zod `.optional()` 不接受 null（前端编辑时预填的 null 会被拒），改 `.nullish()`
- 2026-05-30：D9 完成 —— 权限三级控制（RBAC）。**数据层**：roles 表（id/name/description/permissions JSON，内置 admin/sales/viewer 三个）+ users 加 roleId 外键；db/seed.ts 种子脚本（幂等）一次性塞角色 + 给老 users 补 admin，加 `npm run db:seed`。**权限码设计**：格式 `resource:action`（如 customer:delete / export:excel / role:read），21 个权限码集中在 seed.ts 定义；admin 全集、sales 减 delete + 减 user/role 管理、viewer 只 read。**后端权限**：(1) authMiddleware 增强 —— 解 JWT 后 leftJoin roles 一次查到 role + permissions 挂 c.get('role')；(2) permission(perm) 工厂中间件，401/403 区分（未登录 vs 权限不足）；(3) 每个受保护接口前挂 permission('customer:delete') 这类；(4) ⭐ **数据权限**：customer/deal 的 update 接口在 permission 之外额外检查 ownerId（admin 全开，sales 必须 existing.ownerId === userId），权限码 + 数据规则双层防御。**前端权限**：(1) UserInfo 加 role+permissions（持久化）+ hasPermission(perm) store 方法；(2) **v-auth 自定义指令**（directives/auth.ts）：mounted 时检查 store.hasPermission，没权限 `el.parentNode.removeChild(el)` 把 DOM 整个移除（比 display:none 彻底）；(3) RouteMeta 加 permission 字段 + 守卫拦截非匹配角色（弹消息 + 跳 dashboard）；(4) MainLayout 菜单按 permission 递归过滤（children 全过滤空 → 父菜单也隐藏）。**注册接口默认 sales 角色** —— 防止任何人注册即拿到 admin。**login/register 接口同步返回 role+permissions** —— 一致 UserInfo 结构，前端登录后 v-auth 立刻可用，不用再调 getMe。**业务页**：角色管理（只读，按 resource 分组展示权限码，配 a-alert 说明"内置不可编辑"）+ 用户管理（CRUD + 改角色 + 密码留空=不改）。**⭐ 自锁防御 2 条**：(1) 不能删自己（自己那行不显示删除按钮 + 后端 DELETE /:id 拦截 id === userId）；(2) 不能改自己的角色（编辑自己时角色 Select disabled + label 提示 + 后端 PUT 拦截 id === userId && roleId 字段在 body）—— 防 admin 把自己改 viewer 后再也回不来。⚠️ 中途踩坑 1 个：drizzle 的 `references(() => roles.id)` 虽然运行时延迟引用，但 TS 编译时仍要求 roles 标识符已声明，所以 schema.ts 里 roles 表必须定义在 users 之前。
- 2026-05-30：D10 完成 —— 工作台仪表盘。**后端**：4 个 stats 接口（/api/stats/overview, /customer-trend, /deal-funnel, /sales-rank），用 drizzle 的 sql\`\` 模板写聚合查询（count/sum/group by/date(...)）；⭐ **角色差异化数据**：抽 ownerFilter(role, userId, column) 工具函数 —— sales 角色返回 `eq(列, userId)` 限自己，admin/viewer 返回 undefined 等于不加 where（drizzle 的 where(undefined) 自动忽略），权限码不变但 SQL 维度按角色变。指标设计：总客户数 / 本月新增 / 进行中商机（stage 非 won/lost）/ ⭐ **加权预期金额** = sum(amount × probability / 100) 仅未结束商机 —— 销售管线常用指标，给 D10 留的 probability 字段在 D7 就埋好了。SQLite 的 `date(created_at, 'unixepoch')` 把 unix 时间戳列按天分组（mode:'timestamp' 存的是秒数）。**前端**：(1) **useChart composable**（composables/useChart.ts）封装 ECharts 生命周期 —— onMounted echarts.init、暴露 setOption、window resize 监听 + onBeforeUnmount 移除监听 + dispose，⭐ ECharts 实例用 **shallowRef** 不用 ref（ECharts 内部对象巨大，深度响应式会严重拖性能）；(2) Dashboard.vue 重写：4 个 a-statistic 卡片 + 3 张图（折线/漏斗/横柱）；(3) ⭐ **Promise.all** 并发拉 4 接口（比串行快 4 倍，F12 Network 能看到 4 个请求同时发出）。**图表细节**：漏斗图 sort='none' 保留后端固定顺序（默认 descending 会按数量重排导致 lead=0 排到底层，漏斗倒过来）；横柱图 reverse 让金额高的在最上面（ECharts 横柱默认从下往上画）；折线图 minInterval:1 防 y 轴出现小数刻度。**ECharts 引入**：用全量 `import * as echarts from 'echarts'`，生产环境推荐按需引入（echarts/core + 单独 import 用到的组件），bundle 能减 60%+，D10 先不优化。
- 2026-05-30：D11 完成 —— i18n 中英双语 + 暗黑模式（范围取舍：i18n 只做框架 + 顶栏/菜单/登录页，业务页中文不抽）。**i18n**：vue-i18n 11.x，locales/ 拆 zh-CN.ts / en.ts / index.ts（嵌套结构 common/layout/menu/login）；createI18n 用 legacy:false + globalInjection:true（Composition API + 模板 $t 全局）；默认 locale 从 localStorage 直读（i18n 创建时 Pinia 还没 hydrate）。**settings store**：locale + theme 两件事，persistedstate 持久化；提供 toggleLocale / toggleTheme 工具方法。**联动**：(1) App.vue 用 a-config-provider 包 router-view，把 settings.locale 映射 AD Vue 自带 zhCN/enUS locale（让"上一页/下一页"等内置文案跟着切），(2) MainLayout/Login 各自 watch settings.locale → i18nLocale.value 同步，(3) Login 校验 rules 用 computed 包让红字校验信息也跟着 locale 变。**暗黑模式**：用 AD Vue 4 内置 `theme.darkAlgorithm`（一行配置整套组件库变暗），手写 div 的背景/文字色用 `theme.useToken()` 拿到 token 绑 inline style（MainLayout 顶栏/内容区/user-trigger；Login 卡片+背景；DealBoard 列 colorFillSecondary + 卡片 colorBgContainer；CustomerDetail.tabs；FollowUpTimeline.content）—— token 是 reactive ref，主题切了 inline style 自动变。**第三方组件主题**：md-editor-v3 MdEditor / MdPreview 都接受 :theme prop，绑 settings.theme 让编辑器跟着切。**全局 webkit autofill 修复**：style.css 加 `html.theme-dark` 类切换 + `input:-webkit-autofill` 用 `-webkit-box-shadow inset` hack 强制覆盖 Chrome 自动填充背景（autofill 优先级超高，普通 background-color 改不掉）。**新增用户表单防 autofill**：邮箱 autocomplete="off" + 密码 autocomplete="new-password"。⚠️ **中途踩坑 1 个大的**：vue-i18n 11.x + Vite 8 报 "init_runtime_dom_esm_bundler is not defined" —— vue-i18n 11.x 默认入口被 Vite esbuild 处理后 init helper 被错位 hoist；fix：vite.config.ts 加 `optimizeDeps.exclude: [vue-i18n]`（不预构建走原生 ESM）+ `resolve.dedupe: [vue]`（强制单一 vue runtime 实例）。

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
