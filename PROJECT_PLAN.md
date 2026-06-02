# Mini CRM —— 项目计划与学习手册

> 这是你回洛阳/郑州找 Vue 3 中后台前端岗位的简历项目。
> 写这个文档的目的是：让你在动手前先看懂全貌，每一步都知道在干什么、为什么这么干。

---

## 一、这个项目是什么？为什么做它？

### 是什么
一个极简的客户关系管理（CRM）系统。用户登录后能管理客户、联系人、跟进记录、销售订单，
有团队角色权限、有数据仪表盘——本质上就是一个**麻雀虽小、五脏俱全的中后台系统**。

### 为什么是它
1. **跟你日常工作 100% 对口**——你在公司就是做中后台业务，面试官一看简历，
   "哦这跟他经验匹配"，不需要解释。
2. **能展示你真正会的能力**：复杂表单、大表格、权限三级控制、图表、Excel 导出、i18n、暗黑模式。
3. **后端轻量、能 hold 住**——后端只是为了让前端能跑通真数据，不需要复杂业务逻辑。
4. **能在本地跑、能部署上线**——简历里能贴一个真实可访问的链接，比口头说强 100 倍。

### 跟"克隆某 ToDo 列表 / 仿淘宝"的区别
克隆项目面试官见烂了，加分很少。这个项目是真业务场景，能讲出"为什么这么设计"的故事。

---

## 二、动手前要懂的几个概念（别被术语吓到）

| 概念 | 一句话解释 | 在本项目里的角色 |
|---|---|---|
| **前后端分离** | 浏览器里的页面 (前端) 和服务器上的程序 (后端) 是两个独立项目，靠 HTTP 接口通信 | 前端 `web/` 后端 `api/` 两个文件夹，独立开发独立部署 |
| **API** | 后端暴露给前端的"功能入口"，比如 `GET /api/customers` 就是"查所有客户" | 你前端 axios 调的就是这些 |
| **REST API** | 一种 API 风格的约定：用 HTTP 动词 (GET/POST/PUT/DELETE) 对应 增删改查 | 本项目用 REST |
| **JSON** | 一种数据格式，前后端之间传数据用这个 | 你公司天天在用 |
| **ORM** | 让你用 JavaScript 对象操作数据库，不用手写 SQL | 我们用 Drizzle，跟你公司一样 |
| **JWT** | 一种登录凭证。用户登录后服务器发一个 token，之后每次请求带上它表示"我已登录" | 登录后存在浏览器里 |
| **SQLite** | 一个超轻量数据库，整个数据库就是一个文件 | 本地开发用它，部署上线再换 |
| **Hono** | 一个 Node.js 的"web 框架"，让你方便地写 API（类似 Express，但更现代） | 后端用它 |
| **Vite** | 前端的构建工具，启动飞快 (你公司在用) | 前端用它 |
| **Pinia** | Vue 3 的状态管理库 (你公司在用) | 存登录信息、全局设置等 |

> 上面如果还有看不懂的，先记住"它干啥用的"就行，写代码时遇到再深入。

---

## 三、项目最终长什么样

### 页面结构

```
┌─────────────────────────────────────────────────┐
│ Logo  Mini CRM       搜索   语言  主题  头像▼   │  ← 顶栏
├──────┬──────────────────────────────────────────┤
│      │                                          │
│ 工作 │   ┌──────────────────────────────────┐   │
│ 台   │   │ 当前页面内容                     │   │
│      │   │                                  │   │
│ 客户 │   │ 比如：客户列表表格               │   │
│      │   │       [新增] [导出] [删除]       │   │
│ 联系 │   │ ┌────────────────────────┐       │   │
│ 人   │   │ │ 表格内容...             │      │   │
│      │   │ └────────────────────────┘       │   │
│ 跟进 │   │                                  │   │
│ 记录 │   └──────────────────────────────────┘   │
│      │                                          │
│ 销售 │                                          │
│ 漏斗 │                                          │
│      │                                          │
│ 团队 │                                          │
│ 权限 │                                          │
│      │                                          │
└──────┴──────────────────────────────────────────┘
```

### 五个核心模块

1. **工作台（仪表盘）** —— 三张图表：本月新增客户、销售漏斗转化率、销售排行榜
2. **客户管理** —— 大表格 + 多字段筛选 + 新增/编辑弹窗 + Excel 导出
3. **联系人管理** —— 一个客户挂多个联系人（主从表）
4. **跟进记录** —— 时间线展示 + Markdown 富文本
5. **销售漏斗 Kanban** —— 拖拽改变商机阶段（线索→沟通→报价→成交/丢失）
6. **团队 & 权限** —— 角色管理 + 用户管理 + 权限矩阵（admin / sales / viewer 三种角色）

---

## 四、技术栈（精选，不堆砌）

### 前端（你的主战场，要能讲清楚每个的作用）

| 技术 | 作用 | 备注 |
|---|---|---|
| Vue 3 + `<script setup>` | UI 框架 | 必须用组合式 API，不要用 Options API |
| Vite | 构建/启动工具 | 跟你公司一样 |
| TypeScript | 类型系统 | 全程开类型，别为图省事写 any |
| Vue Router 4 | 前端路由 | 要自己实现动态路由 + 权限守卫 |
| Pinia + persistedstate | 全局状态 + 持久化 | 跟你公司一样 |
| Ant Design Vue 4 | UI 组件库 | 跟你公司一样，组件齐全 |
| axios | HTTP 请求 | 要自己封装拦截器 |
| ECharts | 图表 | 仪表盘用 |
| vuedraggable | 拖拽 | 销售漏斗 Kanban 用 |
| md-editor-v3 | Markdown 编辑器 | 跟进记录用 |
| vue-i18n | 国际化 | 中英双语切换 |

### 后端（用最轻量的方案，跑通就行）

| 技术 | 作用 | 备注 |
|---|---|---|
| Hono | Web 框架 | 像 Express 但更现代、TS 友好 |
| Drizzle ORM | 数据库 ORM | 跟你公司一样，能复用认知 |
| SQLite (better-sqlite3) | 数据库 | 本地是个文件，零配置 |
| jsonwebtoken | JWT 鉴权 | 经典方案 |
| bcryptjs | 密码加密 | 别明文存密码 |
| zod | 数据校验 | 跟 Drizzle 配套，类型自动推导 |

### 部署

| 部分 | 平台 | 价格 |
|---|---|---|
| 前端 | Vercel | 免费 |
| 后端 | Railway 或 Render | 免费额度够个人项目 |
| 数据库 | Turso (云上 SQLite) | 免费额度够用 |

---

## 五、数据库设计（6 张表）

```
┌──────────┐       ┌──────────┐       ┌──────────┐
│  roles   │←──────│  users   │──┐    │ customers│
└──────────┘       └──────────┘  │    └──────────┘
                                 │         │
                                 │         │ 1:N
                                 │         │
                                 │    ┌──────────┐
                                 ├───→│ contacts │  (一个客户多个联系人)
                                 │    └──────────┘
                                 │
                                 │    ┌──────────┐
                                 ├───→│follow_ups│  (跟进记录, 谁跟进的)
                                 │    └──────────┘
                                 │
                                 │    ┌──────────┐
                                 └───→│  deals   │  (销售订单/商机)
                                      └──────────┘
```

### 表字段（先看大概，写代码时再细化）

```typescript
// 1. 角色表
roles {
  id, name (admin/sales/viewer), permissions (JSON), created_at
}

// 2. 用户表
users {
  id, email, password_hash, name, avatar, role_id, created_at
}

// 3. 客户表
customers {
  id, name, company, level (A/B/C), industry, source,
  stage (lead/contact/qualified/won/lost),
  tags (JSON array), owner_id (谁的客户), created_at
}

// 4. 联系人表
contacts {
  id, customer_id, name, phone, email, position, is_primary
}

// 5. 跟进记录表
follow_ups {
  id, customer_id, user_id, type (call/visit/email/wechat),
  content (Markdown), next_at, created_at
}

// 6. 销售订单/商机表
deals {
  id, customer_id, title, amount, stage, probability,
  expected_close_at, owner_id, created_at
}
```

---

## 六、项目目录结构（动手前心里有个谱）

```
mini-crm/
├── PROJECT_PLAN.md              ← 你正在看的这个文档
├── README.md                    ← 给 GitHub 看的简介（最后写）
├── .gitignore                   ← 不提交 node_modules 等
│
├── web/                         ← 前端（你的主战场）
│   ├── src/
│   │   ├── api/                 ← 所有调后端的函数集中放这
│   │   ├── assets/              ← 图片、字体
│   │   ├── components/          ← 通用组件 (封装的表格/表单)
│   │   ├── composables/         ← 组合式函数 (useXxx)
│   │   ├── directives/          ← 自定义指令 (v-auth)
│   │   ├── layouts/             ← 布局组件 (顶栏+侧栏+内容)
│   │   ├── locales/             ← i18n 多语言文件
│   │   ├── router/              ← 路由配置 + 权限守卫
│   │   ├── stores/              ← Pinia stores
│   │   ├── utils/               ← 工具函数 (axios 封装放这)
│   │   ├── views/               ← 页面 (按模块分目录)
│   │   │   ├── login/
│   │   │   ├── dashboard/
│   │   │   ├── customer/
│   │   │   ├── contact/
│   │   │   ├── followUp/
│   │   │   ├── deal/
│   │   │   └── system/
│   │   ├── App.vue
│   │   └── main.ts
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
└── api/                         ← 后端（轻量）
    ├── src/
    │   ├── db/
    │   │   ├── schema.ts        ← Drizzle 表结构定义
    │   │   ├── client.ts        ← 数据库连接
    │   │   └── seed.ts          ← 初始化测试数据
    │   ├── routes/
    │   │   ├── auth.ts          ← 登录注册
    │   │   ├── customer.ts      ← 客户增删改查
    │   │   ├── contact.ts
    │   │   ├── followUp.ts
    │   │   ├── deal.ts
    │   │   └── system.ts        ← 角色用户管理
    │   ├── middlewares/
    │   │   ├── auth.ts          ← JWT 校验
    │   │   └── permission.ts    ← 角色权限校验
    │   ├── utils/
    │   │   ├── jwt.ts
    │   │   └── password.ts
    │   └── index.ts             ← 入口文件
    ├── drizzle.config.ts
    ├── package.json
    └── tsconfig.json
```

---

## 七、14 天开发节奏

> 每个阶段都列了"做什么 / 学到什么 / 产出什么"，你可以照着每天打勾。

### D1-D2 ｜ 脚手架（2 天）
- **做什么**：建前端项目、建后端项目、装好所有依赖、跑通 hello world
- **学到什么**：Vite 项目结构、Hono 怎么写一个最简单的 GET 接口、Drizzle 怎么建表
- **产出**：前端跑在 `http://localhost:5173`，后端跑在 `http://localhost:3000`，前端能调通后端一个 `/api/health` 接口

### D3 ｜ 登录鉴权全链路（1 天）⭐ 关键
- **做什么**：注册/登录 API、JWT 生成与校验、前端登录页、axios 拦截器、动态路由守卫
- **学到什么**：JWT 完整流程、axios 拦截器的标准写法、Vue Router beforeEach 怎么用
- **产出**：从登录到进入工作台全流程跑通；F5 刷新登录态不丢

### D4-D5 ｜ 客户管理模块（2 天）
- **做什么**：客户列表大表格（搜索/排序/分页）、新增/编辑弹窗、Schema 配置驱动的表单、Excel 导出
- **学到什么**：Ant Design Vue Table + Form 的标准用法、表格组件二次封装思路
- **产出**：能完整操作客户数据；为后续模块沉淀通用 BasicTable / BasicForm 组件

### D6 ｜ 联系人 + 跟进记录（1 天）
- **做什么**：主从表（客户详情页里展示联系人列表）、时间线展示跟进记录、Markdown 编辑器
- **学到什么**：路由参数传递、详情页布局、富文本编辑器集成
- **产出**：能在客户详情页加联系人、记跟进

### D7-D8 ｜ 销售漏斗 Kanban（2 天）
- **做什么**：四列看板（线索/沟通/报价/成交）、拖拽改变阶段、拖动时乐观更新+失败回滚
- **学到什么**：vuedraggable 用法、乐观更新模式、状态机思维
- **产出**：拖一张卡片，后端数据同步变化

### D9 ｜ 权限三级控制（1 天）⭐ 关键
- **做什么**：角色管理页、用户管理页、按钮级 v-auth 指令、接口级权限中间件
- **学到什么**：RBAC 模型、自定义指令、Vue 渲染时如何按权限隐藏 DOM
- **产出**：admin 看到所有按钮，sales 只能看不能删，viewer 只能看；面试硬通货

### D10 ｜ 工作台仪表盘（1 天）
- **做什么**：三张 ECharts 图表 + 数据卡片
- **学到什么**：ECharts 跟 Vue 的整合、响应式 resize、组件销毁时 dispose
- **产出**：登录后第一眼就能看到漂亮仪表盘（截图能放简历）

### D11 ｜ i18n 中英双语 + 暗黑模式（1 天）
- **做什么**：vue-i18n 集成、所有文案抽 key、Ant Design Vue locale 联动切换、CSS 变量方案的主题切换
- **学到什么**：i18n 工程化、CSS 变量在大型应用里的优势
- **产出**：点一下能切语言、能切暗黑

### D12 ｜ 部署上线 + 写 README（1 天）⭐ 简历关键
- **做什么**：前端推 Vercel、后端推 Railway、写体面的 README（带项目截图、技术栈说明、本地启动说明、在线 demo 链接）
- **学到什么**：CI/CD 入门、生产环境变量管理
- **产出**：GitHub 上有一个能让面试官点开就玩的项目

### D13-D14 ｜ 缓冲（2 天）
- 修 bug、补遗漏
- 录一段操作 GIF 放 README 头
- 可选：写一篇"我从 0 做完这个项目学到了什么"的博客（掘金/语雀）

---

## 八、简历上能讲的故事（每完成一块就回来加一条）

### 已经能写的（项目立项就有的）
- 独立完成的全栈中后台项目，前端 Vue 3 + Vite + TS + Ant Design Vue，后端 Hono + Drizzle + SQLite
- 不依赖任何中后台模板，路由权限、菜单生成、按钮鉴权、axios 封装等核心机制全部自己实现

### 完成 D3 后能加
- 实现 JWT 完整鉴权流程：登录获取 token、axios 自动注入、401 时跳登录页并保留来源 URL
- axios 拦截器统一处理 loading 聚合、业务错误码、网络错误，业务调用代码量减少 50%

### 完成 D9 后能加
- 设计三级权限控制：路由 meta + 自定义 v-auth 指令 + 接口中间件，覆盖页面/按钮/接口三层
- RBAC 角色模型：admin / sales / viewer 三种角色，权限矩阵化管理

### 完成 D11 后能加
- 国际化方案：基于 vue-i18n 实现中英双语，Ant Design Vue locale 同步联动
- 主题方案：基于 CSS 变量实现暗黑模式切换，无闪屏

### 完成 D12 后能加
- 项目部署：前端 Vercel + 后端 Render + 数据库 Turso（云上 SQLite），监听 main 分支 push 自动构建发布；提供在线 demo
- 在线访问：[https://mini-crm-seven-steel.vercel.app](https://mini-crm-seven-steel.vercel.app)
- 跨环境兼容：后端用 @libsql/client 替换 better-sqlite3 原生模块，一份代码本地走 `file:` 协议、生产走 `libsql://` 协议，仅 DATABASE_URL 一个环境变量切换

---

## 九、动手流程（明天开工时照着做）

```bash
# 第 1 步：在 GitHub 网页上创建空仓库
#   - 仓库名：mini-crm
#   - 公开 (Public)
#   - 不勾任何初始化选项（README/.gitignore/license 都不要）

# 第 2 步：在终端进入桌面这个文件夹
cd ~/Desktop/mini-crm

# 第 3 步：初始化 git 并关联远程
git init
git add PROJECT_PLAN.md
git commit -m "docs: 初始化项目计划文档"
git branch -M main
git remote add origin https://github.com/<你的用户名>/mini-crm.git
git push -u origin main

# 第 4 步：建前端
npm create vite@latest web -- --template vue-ts
cd web
npm install
npm install ant-design-vue@4 pinia pinia-plugin-persistedstate vue-router@4 axios echarts vue-i18n
npm run dev   # 应该能看到 Vite 默认页面

# 第 5 步：建后端 (开新终端)
cd ~/Desktop/mini-crm
mkdir api && cd api
npm init -y
npm install hono @hono/node-server drizzle-orm better-sqlite3 jsonwebtoken bcryptjs zod
npm install -D drizzle-kit @types/better-sqlite3 @types/jsonwebtoken @types/bcryptjs tsx typescript

# 然后就可以开始 D1 了
```

---

## 十、遇到问题怎么办？

1. **先自己想 5 分钟**，看错误信息、看相关文档
2. **再 Google 5 分钟**（搜英文 + 错误信息原文）
3. **再问 AI（Claude/ChatGPT）**，把错误信息和你的代码一起贴上
4. **最后回来问我**——把卡住的具体点告诉我，越具体越好

> 一定要走完前三步再问我，因为找工作时你身边没有我，必须练独立排查能力。

---

## 十一、心态提示

- **慢就是快**：14 天不是死线，理解比速度重要
- **每天 commit**：哪怕只改了一行也 commit，GitHub 上的绿格子是简历加分项
- **不追求完美**：能跑通比好看重要，先 ship 再优化
- **记笔记**：碰到不懂的概念记下来，每周回顾一次
- **真理只有一个**：写完简历能在面试时把每个功能讲 3 分钟，就是成功

---

加油。等你建好桌面文件夹（已建好）后跟我说 "开始 D1"，我就给你写脚手架代码。
