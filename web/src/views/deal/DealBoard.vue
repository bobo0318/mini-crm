<script setup lang="ts">
// 销售漏斗看板 —— D8 拖拽版
//
// 当前能力：
//   - 拉取所有非 lost 的商机
//   - 按 stage 分 4 列展示
//   - ⭐ 拖拽卡片改 stage（乐观更新 + 失败回滚）
//
// 待办（D8 后续）：
//   - 新建 / 编辑商机弹窗
//   - 卡片"标记丢失"按钮

import { onMounted, reactive, ref } from 'vue'
import { message, theme as antTheme } from 'ant-design-vue'
import { CloseOutlined } from '@ant-design/icons-vue'
import draggable from 'vuedraggable'

// D11：拿主题 token，给看板列背景 + 卡片背景用
const { token } = antTheme.useToken()

import { getDealList, updateDeal, type Deal, type DealStage } from '@/api/deal'
import { BOARD_STAGES, stageMap } from './deal.data'
import DealFormModal from './DealFormModal.vue'

// =====================================================
// 状态
// =====================================================
const loading = ref(false)

// 看板数据：4 列各一个数组
//
// 为什么用 reactive 对象 + 4 个独立数组，不用 dealList 平铺 + computed 分组？
//   vuedraggable 要 v-model / :list 一个可写数组，computed 是只读派生数据不能传给它。
//   每列必须是一个独立的可写数组。
//
// 为什么用 reactive 不用 ref？
//   ref 包对象的话访问要写 boardGroups.value.lead，写起来啰嗦
//   reactive 直接 boardGroups.lead，模板里也直接 boardGroups[stage.value]
const boardGroups = reactive<Record<DealStage, Deal[]>>({
  lead: [],
  contact: [],
  quote: [],
  won: [],
  lost: [], // 占位，看板不显示但保留键便于回滚 / 未来扩展
})

// =====================================================
// 拉数据
// =====================================================
async function fetchDeals() {
  loading.value = true
  try {
    const res = await getDealList()

    // 重置 4 列（避免第二次 fetch 时数据叠加）
    // 注意：reactive 数组不能直接赋值替换（会断响应式），要用 .splice(0) 清空
    for (const stage of BOARD_STAGES) {
      boardGroups[stage.value].splice(0)
    }

    // 按 stage 把数据分到 4 列
    for (const deal of res.data) {
      if (boardGroups[deal.stage]) {
        boardGroups[deal.stage].push(deal)
      }
    }
  } catch {
    message.error('加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(fetchDeals)

// =====================================================
// 拖拽处理（乐观更新 + 失败回滚）
// =====================================================
//
// vuedraggable @change 事件的 evt 对象有 3 种形态（互斥）：
//   { added:   { element, newIndex } }  目标列收到：有卡片被拖进来
//   { removed: { element, oldIndex } }  源列触发：有卡片被拖出去
//   { moved:   { element, oldIndex, newIndex } }  同列内重排
//
// 我们只处理 added：
//   - removed 不用处理（一次拖拽源/目标都会触发，处理一边就够）
//   - moved 业务上不改 stage，忽略

type ChangeEvent = {
  added?: { element: Deal; newIndex: number }
  removed?: { element: Deal; oldIndex: number }
  moved?: { element: Deal; oldIndex: number; newIndex: number }
}

async function handleDragChange(evt: ChangeEvent, newStage: DealStage) {
  // 只处理"拖入"事件
  if (!evt.added) return

  const deal = evt.added.element

  // vuedraggable 只重排数组、不会自动改 element 内部字段，
  // 所以这时 deal.stage 还是旧值，我们手动取下来留着回滚用
  const oldStage = deal.stage

  // 防御性：同 stage 不该触发 added，但万一触发了直接返回
  if (oldStage === newStage) return

  // ⭐ 乐观更新第 1 步：本地立即改 deal.stage，让卡片数据跟所在列对应上
  // 注意 deal 是 reactive 数组里的元素，本身就是 reactive 的，改字段会触发响应式更新
  deal.stage = newStage

  try {
    // ⭐ 乐观更新第 2 步：背景发请求
    await updateDeal(deal.id, { stage: newStage })
    message.success(`已移至「${stageMap[newStage].label}」`)
  } catch {
    // ⭐ 失败回滚：把所有改动撤回
    // 1. stage 字段改回去
    deal.stage = oldStage
    // 2. 从目标列里删除（找到这张卡片的 index 再 splice）
    const idxInNew = boardGroups[newStage].findIndex((d) => d.id === deal.id)
    if (idxInNew >= 0) {
      boardGroups[newStage].splice(idxInNew, 1)
    }
    // 3. 放回源列（位置丢了，简化处理：直接 push 到末尾）
    boardGroups[oldStage].push(deal)
    message.error('更新失败，已回滚')
  }
}

// =====================================================
// 弹窗
// =====================================================
//
// modalRef 拿到 DealFormModal 实例，调 .open() 打开
// InstanceType<typeof DealFormModal> 让 TS 知道 modalRef 上有哪些方法（defineExpose 暴露的）
const modalRef = ref<InstanceType<typeof DealFormModal>>()

function handleCreate() {
  // 不传参 = 新建模式
  modalRef.value?.open()
}

function handleEdit(deal: Deal) {
  // 传 record = 编辑模式
  // SortableJS 会区分"拖动"和"点击"：按下没动直接松手才算 click，所以拖完不会误触发编辑
  modalRef.value?.open(deal)
}

// 弹窗保存成功 → 刷新看板数据
function handleModalSuccess() {
  fetchDeals()
}

// =====================================================
// 标记丢失（点卡片右上角的 × 按钮）
// =====================================================
//
// 业务：把 deal 的 stage 改成 'lost'，从看板隐藏（看板默认只展示前 4 个 stage）
// 实现：
//   1. 调接口 PUT /deals/:id { stage: 'lost' }
//   2. 成功后从当前列 splice 掉这张卡片
//   3. 也 push 到 boardGroups.lost 数组保留完整数据（看板不渲染 lost 列，但有人想"显示丢失"时数据还在）
async function handleMarkLost(deal: Deal) {
  const oldStage = deal.stage
  try {
    await updateDeal(deal.id, { stage: 'lost' })
    // 从原列移除
    const idx = boardGroups[oldStage].findIndex((d) => d.id === deal.id)
    if (idx >= 0) boardGroups[oldStage].splice(idx, 1)
    // 数据完整性：放到 lost 桶（看板不显示，但内存里保留）
    deal.stage = 'lost'
    boardGroups.lost.push(deal)
    message.success(`「${deal.title}」已标记为丢失`)
  } catch {
    // axios 拦截器统一处理错误，这里吞掉
  }
}

// =====================================================
// 工具函数
// =====================================================
function formatAmount(amount: number | null): string {
  if (amount == null) return '—'
  return '¥' + amount.toLocaleString('zh-CN')
}
</script>

<template>
  <div class="deal-board">
    <!-- 顶部操作栏 -->
    <div class="board-header">
      <h2>销售漏斗</h2>
      <!-- D9：viewer 看不到新建按钮 -->
      <a-button v-auth="'deal:create'" type="primary" @click="handleCreate">新建商机</a-button>
    </div>

    <!-- 4 列看板 -->
    <a-spin :spinning="loading">
      <div class="board-columns">
        <div
          v-for="stage in BOARD_STAGES"
          :key="stage.value"
          class="board-column"
          :style="{ background: token.colorFillSecondary }"
        >
          <!-- 列头 -->
          <div class="column-header">
            <a-tag :color="stage.color">{{ stage.label }}</a-tag>
            <span class="count">{{ boardGroups[stage.value].length }}</span>
          </div>

          <!-- ⭐ 拖拽卡片列表
               :list 而不是 v-model：vuedraggable 推荐 :list（直接 mutate 数组，跟 reactive 配合更稳）
               group="deal"：4 列共用一个 group 名，才能跨列拖
               item-key="id"：拖拽内部用什么字段做 key（跟 v-for 的 key 一回事）
               :animation="150"：拖动时其他卡片让位的动画时长（ms）
               ghost-class：被拖动卡片的占位元素的 class，用来加半透明样式
               drag-class：拖动中那个跟手的元素的 class -->
          <draggable
            :list="boardGroups[stage.value]"
            group="deal"
            item-key="id"
            :animation="150"
            ghost-class="ghost-card"
            class="card-list"
            filter=".no-drag"
            :prevent-on-filter="false"
            @change="(evt: ChangeEvent) => handleDragChange(evt, stage.value)"
          >
            <!-- ⚠️ #item 插槽必须只有一个子节点（vuedraggable 强约束），
                 连 HTML 注释都算"额外子节点"，所以解释性注释只能写在 div 内部或这种"包在外层"的位置 -->
            <template #item="{ element: deal }">
              <div
                class="deal-card"
                :style="{ background: token.colorBgContainer, color: token.colorText }"
                @click="handleEdit(deal)"
              >
                <!-- 标记丢失按钮（hover 卡片时才显示）
                     class="no-drag" 让 vuedraggable 的 filter 跳过它，按钮区域不触发拖拽
                     @click.stop 阻止冒泡：否则点按钮会同时打开编辑弹窗 -->
                <a-popconfirm
                  title="确定将这条商机标记为丢失？"
                  description="标记后将从看板隐藏"
                  ok-text="确定"
                  cancel-text="取消"
                  placement="topRight"
                  @confirm="handleMarkLost(deal)"
                >
                  <span class="lost-btn no-drag" @click.stop>
                    <CloseOutlined />
                  </span>
                </a-popconfirm>

                <div class="card-title">{{ deal.title }}</div>
                <div class="card-meta">
                  <span class="amount">{{ formatAmount(deal.amount) }}</span>
                  <span v-if="deal.probability != null" class="probability">
                    成交率 {{ deal.probability }}%
                  </span>
                </div>
              </div>
            </template>

            <!-- footer 插槽：放在卡片列表底部 -->
            <!-- 空状态：通过这个插槽渲染（draggable 内部没有"列表为空时"的钩子） -->
            <template #footer>
              <div
                v-if="boardGroups[stage.value].length === 0"
                class="empty"
              >
                拖卡片到这里
              </div>
            </template>
          </draggable>
        </div>
      </div>
    </a-spin>

    <!-- 新增/编辑商机弹窗 -->
    <DealFormModal ref="modalRef" @success="handleModalSuccess" />
  </div>
</template>

<style scoped>
.board-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.board-header h2 {
  margin: 0;
}

.board-columns {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.board-column {
  /* D11：background 走 inline style 的 token.colorFillSecondary，亮暗自动跟 */
  border-radius: 6px;
  padding: 12px;
  min-height: 400px;
  display: flex;
  flex-direction: column;
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 0 4px;
}

.column-header .count {
  font-size: 12px;
  color: #999;
}

/* 注意 card-list 现在是 <draggable> 的根元素，flex: 1 让它撑满列剩余高度，
   这样拖卡片到空列的下半部分也能松手 */
.card-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  /* 没有卡片时也要有最小高度，否则空列没法接收拖拽 */
  min-height: 100px;
}

.deal-card {
  /* D11：background/color 走 inline style 的 token，亮暗自动跟 */
  position: relative;
  border-radius: 4px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  /* 拖拽手势：默认 grab，按下变 grabbing */
  cursor: grab;
  transition: box-shadow 0.2s;
}
.deal-card:active {
  cursor: grabbing;
}
.deal-card:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
}

/* 标记丢失按钮 */
.lost-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 10px;
  color: #999;
  background: rgba(0, 0, 0, 0.04);
  cursor: pointer;
  /* 默认隐藏，hover 卡片时淡入 */
  opacity: 0;
  transition: opacity 0.2s, color 0.2s, background 0.2s;
}
.deal-card:hover .lost-btn {
  opacity: 1;
}
.lost-btn:hover {
  color: #fff;
  background: #ff4d4f;
}

/* 被拖动的占位卡片：半透明 + 虚线边框，区分于真实卡片 */
.ghost-card {
  opacity: 0.5;
  background: #fff;
  border: 1px dashed #1677ff;
}

.card-title {
  font-weight: 500;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  /* 列窄时金额和成交率会挤在一起换行，flex-wrap 让它们自然换行 */
  flex-wrap: wrap;
  gap: 4px 12px;
  font-size: 12px;
  color: #666;
}

.card-meta .amount {
  color: #1677ff;
  font-weight: 500;
}

.empty {
  color: #ccc;
  text-align: center;
  padding: 16px;
  font-size: 12px;
}
</style>
