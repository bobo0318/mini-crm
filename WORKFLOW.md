# WORKFLOW.md — 开发与部署工作流

> 每次改代码前 / 上线前回来翻一下这个文件。
> 主要解决一个问题：**生产环境 4 个东西（前端 bundle、Workers 代码、Turso schema、Turso 数据）必须同步，少改一个就出诡异现象**。

---

## 0. 架构速览

```
本地开发                                 生产
─────────────────────────────            ─────────────────────────────
前端  Vite dev   :5173                   CF Pages（crm.bobodylan.com）
        ↓ /api proxy                       ↓ HTTPS
后端  Node + tsx :3000                   CF Workers（api.bobodylan.com）
        ↓                                  ↓
数据库 本地 SQLite                       Turso 云 SQLite
       file:./mini-crm.db                libsql://mini-crm-bobo0318...turso.io
```

⭐ **本地和生产是两套完全独立的数据库**，schema 改完必须两边都跑 `db:push`。

---

## 1. 启动本地 dev（每次开始改代码前）

### 终端 1：后端
```bash
cd /Users/bobl/Desktop/mini-crm/api
npm run dev
```
看到这两行就 OK：
```
Server is running on http://localhost:3000
[db] 已连接到 file:./mini-crm.db
```

### 终端 2：前端
```bash
cd /Users/bobl/Desktop/mini-crm/web
npm run dev
```
看到 `Local: http://localhost:5173/` 就 OK。

### 浏览器
http://localhost:5173 → 登录 `admin@test.com` / `123456`。

代码改完 **tsx watch 自动重启 + Vite HMR 自动刷新**，浏览器直接看效果。

---

## 2. 上线流程（按你改了啥分 3 类）

### 类型 A：只改业务逻辑（routes / views / utils），**没动 schema**

| 步骤 | 命令 |
|---|---|
| 1. 本地测 OK | 浏览器看效果 |
| 2. commit | `git add ... && git commit -m "..."` |
| 3. push main | `git push` |
| 4. **前端**：CF Pages 自动 build | 看 https://dash.cloudflare.com/ → Workers & Pages → mini-crm → Deployments |
| 5. **后端**：手动 deploy ⚠️ | `cd api && npx wrangler deploy` |

⚠️ **后端不会自动部署**！CF Pages 监听 main 分支自动 build，但 Workers 是本地 `wrangler deploy` 推上去的。**只 push 不 deploy = 前端在 call 老接口**。

### 类型 B：改了 `api/src/db/schema.ts`（关键 ⚠️ 4 步必走）

```
顺序        本地              生产
────        ────              ────
Step 1     db:push           ·
Step 2     测试 OK            ·
Step 3     commit + push     ·
Step 4     ·                 wrangler deploy   ← 必须先部署新 Workers 代码
Step 5     ·                 Turso db:push     ← 再让 Turso 加新列
Step 6     ·                 Turso db:seed     ← 如有数据迁移
```

#### 为什么这个顺序？

如果**先**给 Turso 加列、再部署 Workers：Workers 跑的还是老代码，老 schema 里没新字段，drizzle 的 `db.select()` 不返回新列 → 前端拿不到新字段 → 渲染异常。

**先**部署新 Workers 再 push Turso：新 Workers 代码 select 新字段时 Turso 里还没列 → 返回 undefined / 500，反而**好排查**（错误明显），且时间窗口短（push schema 几秒就完）。

#### 具体命令

```bash
# Step 1：本地 push schema
cd /Users/bobl/Desktop/mini-crm/api
npm run db:push
# 如有 "Do you still want to push changes?" 看一眼 data-loss 提示，没问题就 y

# Step 2：本地 seed（如有数据初始化）
npm run db:seed

# Step 3：本地测 OK 后 commit + push（同类型 A）
# ...

# Step 4：部署 Workers 新代码
cd /Users/bobl/Desktop/mini-crm/api
npx wrangler deploy

# Step 5：同步 Turso schema
DATABASE_URL="libsql://mini-crm-bobo0318.aws-eu-west-1.turso.io" \
  npm run db:push

# Step 6：Turso seed（如有）
DATABASE_URL="libsql://mini-crm-bobo0318.aws-eu-west-1.turso.io" \
  npm run db:seed
```

#### `DATABASE_URL=...` 前缀的原理

`.env` 里两行 `DATABASE_URL`，dotenv 取最后一行（file:./mini-crm.db）。但 shell 直接传 env var 会**覆盖** dotenv 的值，让 drizzle 连 Turso。

`DATABASE_AUTH_TOKEN` 不用传，dotenv 会从 .env 自动加载（shell 没设这个，所以 dotenv 的值生效）。

### 类型 C：改了 wrangler.toml / secrets / CF Pages env

| 改了啥 | 怎么生效 |
|---|---|
| `api/wrangler.toml`（routes / compatibility_date 等） | 下次 `wrangler deploy` 自动应用 |
| Workers 单个 secret | `echo "新值" \| npx wrangler secret put <KEY>` —— 秒级热重载 |
| CF Pages env（VITE_API_BASE_URL 等） | CF dashboard 改完保存 → **必须重新 build**（push 一个空 commit 触发 / 在 dashboard 点 Redeploy） |
| 本地 `.env` / `.dev.vars` | 直接改文件，重启 dev 即生效 |

---

## 3. 验证清单（上线后 5 分钟内做）

| 检查项 | 命令 / 操作 |
|---|---|
| Workers 用了新代码 | `curl https://api.bobodylan.com/api/health` 看 timestamp |
| Workers 接口返回新字段（如 schema 改了） | `curl -H "Authorization: Bearer <token>" https://api.bobodylan.com/api/<endpoint>` |
| Turso schema 改对了 | 上一条接口能看到新字段就证明 schema 改对了 |
| CF Pages 用了新 bundle | crm.bobodylan.com Cmd+Shift+R → F12 Network → js 文件 hash 跟上次不一样 |
| 端到端业务正常 | 浏览器实际登录 / 操作几下 |

---

## 4. 常见踩坑

| 现象 | 可能原因 | 怎么修 |
|---|---|---|
| 接口报 CORS / preflight 失败 | Workers CORS_ORIGIN 白名单没加访问的域 | `echo "...,新域名" \| npx wrangler secret put CORS_ORIGIN` |
| 前端拿到的对象**缺新字段**（type / adminType 等） | Workers 跑的还是老代码 | `cd api && npx wrangler deploy` |
| Workers 部署后接口 500 / 返回字段是 undefined | Turso schema 还没改 | `DATABASE_URL=... npm run db:push` |
| 前端**显示对了但接口对不上**（或反之） | CF Pages 还在用老 bundle | CF Dashboard 看最后 build 时间；必要时 push 个空 commit |
| 浏览器显示老页面 | CDN / 浏览器缓存 | **Cmd+Shift+R 硬刷新** |
| db:push 报 `Found data-loss statements` | 加了 NOT NULL 列没 default | schema 里加 `.default('xxx')` |
| 登录后接口还是 401 | 旧 token 没含新字段（JWT payload 变了） | 浏览器**重新登录**让前端拿到新 token |

---

## 5. 应急回滚

| 部分 | 怎么回 |
|---|---|
| 前端 | CF Dashboard → mini-crm (Pages) → Deployments → 找上一个 ready → 三点 → **Rollback** |
| 后端 | `cd api && npx wrangler rollback` 回上一版；或 `wrangler rollback <版本ID>` |
| Turso schema | ⚠️ **没有一键回滚** —— SQLite ALTER TABLE 删列 drizzle-kit 不会自动生成。所以 schema 改动尽量**小批量 + 前向兼容**（加列别加 NOT NULL 无 default，加表别先删旧表） |

---

## 6. 速查命令表

```bash
# 本地 dev
cd api && npm run dev          # 后端 :3000（Node + 本地 SQLite）
cd web && npm run dev          # 前端 :5173

# 本地 DB
cd api && npm run db:push      # 同步 schema
cd api && npm run db:seed      # 跑种子（幂等）
cd api && npm run db:studio    # Drizzle Studio（可视化）

# 上线
git push                       # 自动触发 CF Pages 前端 build
cd api && npx wrangler deploy  # 手动部署 Workers 后端

# Turso 生产 DB（要手动指 DATABASE_URL）
cd api && DATABASE_URL="libsql://mini-crm-bobo0318.aws-eu-west-1.turso.io" \
  npm run db:push
cd api && DATABASE_URL="libsql://mini-crm-bobo0318.aws-eu-west-1.turso.io" \
  npm run db:seed

# 改 Workers secret
cd api && echo "<新值>" | npx wrangler secret put <KEY>

# 看 Workers 当前状态
cd api && npx wrangler deployments list      # 看部署历史
cd api && npx wrangler tail                  # 实时日志（监听生产请求）
```

---

## 7. 这套架构的关键约束（一句话总结）

> **任何改动都要问：前端 bundle / Workers 代码 / Turso schema / Turso 数据，这 4 个是不是都一致？**
>
> 不一致就会出诡异问题（接口返回的字段前端拿不到 / 前端要的字段后端没有 / 等等）。
