<script setup lang="ts">
import { ref } from "vue";
import { useConsume } from "./utils/hook";

defineOptions({
  name: "MenghuanConsume"
});

// 获取页面所需的账号、花费数据及统计函数
const {
  accounts,
  tableData,
  rowTotal,
  accountTotal,
  grandTotal,
  formatMoney,
  percentOf,
  getSummaries,
  updateAccountName
} = useConsume();

/** 正在编辑的账号 id（卡片上），null 表示未编辑 */
const editingCardId = ref<string | null>(null);
/** 卡片编辑输入框内容 */
const editingCardValue = ref("");

/** 正在编辑的账号 id（表头列上），null 表示未编辑 */
const editingHeaderId = ref<string | null>(null);
/** 表头编辑输入框内容 */
const editingHeaderValue = ref("");

/** 卡片名称输入框引用 */
const cardInputRef = ref<any>(null);
/** 表头名称输入框引用 */
const headerInputRef = ref<any>(null);

/**
 * 双击卡片上的名称，进入编辑状态
 * @param accountId 账号 id
 * @param currentName 当前名称
 */
function startEditCardName(accountId: string, currentName: string): void {
  editingCardId.value = accountId;
  editingCardValue.value = currentName;
  // 等 DOM 更新后聚焦输入框
  setTimeout(() => {
    cardInputRef.value?.focus?.();
    cardInputRef.value?.select?.();
  }, 0);
}

/**
 * 卡片编辑失焦或回车时提交修改
 */
function commitCardEdit(): void {
  if (editingCardId.value) {
    updateAccountName(editingCardId.value, editingCardValue.value);
    editingCardId.value = null;
    editingCardValue.value = "";
  }
}

/**
 * 卡片编辑按 Esc 取消
 */
function cancelCardEdit(): void {
  editingCardId.value = null;
  editingCardValue.value = "";
}

/**
 * 双击表头列的名称，进入编辑状态
 * @param accountId 账号 id
 * @param currentName 当前名称
 */
function startEditHeaderName(accountId: string, currentName: string): void {
  editingHeaderId.value = accountId;
  editingHeaderValue.value = currentName;
  setTimeout(() => {
    headerInputRef.value?.focus?.();
    headerInputRef.value?.select?.();
  }, 0);
}

/**
 * 表头编辑失焦或回车时提交修改
 */
function commitHeaderEdit(): void {
  if (editingHeaderId.value) {
    updateAccountName(editingHeaderId.value, editingHeaderValue.value);
    editingHeaderId.value = null;
    editingHeaderValue.value = "";
  }
}

/**
 * 表头编辑按 Esc 取消
 */
function cancelHeaderEdit(): void {
  editingHeaderId.value = null;
  editingHeaderValue.value = "";
}
</script>

<template>
  <div class="consume-page">
    <!-- 账号概览卡片 -->
    <div class="overview-grid">
      <div
        v-for="a in accounts"
        :key="a.id"
        class="overview-card"
        :style="{
          '--from': a.from,
          '--to': a.to
        }"
      >
        <div class="card-glow" />
        <div class="card-top">
          <IconifyIconOffline :icon="a.icon" class="card-icon" />
          <div class="card-meta">
            <!-- 角色/名称：双击任意一处都可编辑，进入编辑态只显示一个输入框 -->
            <el-input
              v-if="editingCardId === a.id"
              ref="cardInputRef"
              v-model="editingCardValue"
              size="small"
              class="edit-name-input"
              @blur="commitCardEdit"
              @keyup.enter="commitCardEdit"
              @keyup.esc="cancelCardEdit"
            />
            <template v-else>
              <div
                class="card-role"
                title="双击编辑名称"
                @dblclick="startEditCardName(a.id, a.name)"
              >
                {{ a.role }}
              </div>
              <div
                class="card-name"
                title="双击编辑名称"
                @dblclick="startEditCardName(a.id, a.name)"
              >
                {{ a.name }}
              </div>
            </template>
          </div>
        </div>
        <div class="card-amount">{{ formatMoney(accountTotal(a.id)) }}</div>
        <div class="card-percent">
          <div class="percent-bar">
            <div class="percent-fill" :style="{ width: percentOf(a.id) }" />
          </div>
          <span class="percent-text">占比 {{ percentOf(a.id) }}</span>
        </div>
      </div>

      <!-- 全部账号合计卡片 -->
      <div class="overview-card overview-total">
        <div class="card-glow" />
        <div class="card-top">
          <IconifyIconOffline icon="ri/summit-line" class="card-icon" />
          <div class="card-meta">
            <div class="card-role">合计</div>
            <div class="card-name">全部账号</div>
          </div>
        </div>
        <div class="card-amount">{{ formatMoney(grandTotal) }}</div>
        <div class="card-percent">
          <div class="percent-bar">
            <div class="percent-fill percent-fill-full" />
          </div>
          <span class="percent-text">共 {{ accounts.length }} 个账号</span>
        </div>
      </div>
    </div>

    <!-- 花费明细表 -->
    <el-card shadow="never" class="table-card">
      <el-table
        :data="tableData"
        border
        show-summary
        :summary-method="getSummaries"
        class="consume-table"
      >
        <!-- 花费项目列（固定） -->
        <el-table-column prop="category" label="花费项目" fixed width="120">
          <template #default="{ row }">
            <div class="cell-category">{{ row.category }}</div>
          </template>
        </el-table-column>
        <!-- 账号列（动态生成，可编辑金额，表头双击可改名称） -->
        <el-table-column
          v-for="a in accounts"
          :key="a.id"
          :prop="a.id"
          :label="a.name"
          min-width="130"
          align="center"
        >
          <template #header>
            <div
              class="header-account"
              :style="{ '--c': a.from }"
              title="双击编辑名称"
              @dblclick="startEditHeaderName(a.id, a.name)"
            >
              <IconifyIconOffline :icon="a.icon" class="header-icon-small" />
              <el-input
                v-if="editingHeaderId === a.id"
                ref="headerInputRef"
                v-model="editingHeaderValue"
                size="small"
                class="edit-header-input"
                @blur="commitHeaderEdit"
                @keyup.enter="commitHeaderEdit"
                @keyup.esc="cancelHeaderEdit"
                @click.stop
              />
              <span v-else>{{ a.name }}</span>
            </div>
          </template>
          <template #default="{ row }">
            <el-input-number
              v-model="row[a.id]"
              :controls="false"
              :min="0"
              class="amount-input"
            />
          </template>
        </el-table-column>
        <!-- 行合计列（固定） -->
        <el-table-column label="合计" fixed="right" width="110" align="center">
          <template #default="{ row }">
            <span class="cell-total">{{ formatMoney(rowTotal(row)) }}</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.consume-page {
  position: relative;
  padding: 6px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow: hidden;
  background: var(--el-bg-color-page, #f2f3f5);
}

/* 页头 */
.page-header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
  box-shadow: 0 4px 16px rgb(102 126 234 / 25%);
  flex-shrink: 0;

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;

    .header-icon {
      font-size: 22px;
      color: #fde68a;
      filter: drop-shadow(0 0 6px rgb(253 230 138 / 60%));
    }

    .header-text {
      display: flex;
      flex-direction: column;
      line-height: 1.2;

      .header-title {
        font-size: 16px;
        font-weight: 700;
        color: #fff;
        letter-spacing: 2px;
      }

      .header-sub {
        margin-top: 2px;
        font-size: 9px;
        letter-spacing: 2px;
        color: rgb(255 255 255 / 70%);
      }
    }
  }

  .header-total {
    display: flex;
    align-items: baseline;
    gap: 8px;

    .total-label {
      font-size: 11px;
      color: rgb(255 255 255 / 75%);
    }

    .total-value {
      font-size: 20px;
      font-weight: 800;
      color: #fff;
      text-shadow: 0 2px 8px rgb(0 0 0 / 20%);
    }
  }
}

/* 概览卡片网格 */
.overview-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 6px;
  flex-shrink: 0;
}

@media (max-width: 1280px) {
  .overview-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .overview-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* 概览卡片 */
.overview-card {
  position: relative;
  padding: 8px 10px;
  color: #fff;
  background: linear-gradient(135deg, var(--from, #6366f1), var(--to, #818cf8));
  border-radius: 10px;
  box-shadow:
    0 4px 14px rgb(0 0 0 / 15%),
    inset 0 1px 0 rgb(255 255 255 / 25%);
  overflow: hidden;
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease;

  .card-glow {
    position: absolute;
    top: -20px;
    right: -20px;
    width: 60px;
    height: 60px;
    background: radial-gradient(
      circle,
      rgb(255 255 255 / 25%),
      transparent 70%
    );
    border-radius: 50%;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow:
      0 8px 20px rgb(0 0 0 / 20%),
      inset 0 1px 0 rgb(255 255 255 / 30%);
  }

  .card-top {
    position: relative;
    display: flex;
    align-items: center;
    gap: 6px;

    .card-icon {
      font-size: 18px;
      color: rgb(255 255 255 / 95%);
      filter: drop-shadow(0 1px 3px rgb(0 0 0 / 15%));
    }

    .card-meta {
      .card-role {
        font-size: 10px;
        color: rgb(255 255 255 / 85%);
        cursor: pointer;
        user-select: none;
      }

      .card-name {
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.5px;
        cursor: pointer;
        user-select: none;
      }
    }
  }

  .card-amount {
    position: relative;
    margin-top: 4px;
    font-size: 16px;
    font-weight: 800;
    letter-spacing: 0.5px;
    text-shadow: 0 2px 6px rgb(0 0 0 / 15%);
  }

  .card-percent {
    position: relative;
    margin-top: 4px;

    .percent-bar {
      height: 3px;
      background: rgb(0 0 0 / 18%);
      border-radius: 2px;
      overflow: hidden;

      .percent-fill {
        height: 100%;
        background: linear-gradient(90deg, #fff, rgb(255 255 255 / 55%));
        border-radius: 2px;
        transition: width 0.4s ease;
      }

      .percent-fill-full {
        width: 100%;
        background: linear-gradient(90deg, #fff, #fde68a);
      }
    }

    .percent-text {
      display: block;
      margin-top: 2px;
      font-size: 9px;
      color: rgb(255 255 255 / 80%);
    }
  }
}

/* 卡片名称编辑输入框 */
.edit-name-input {
  width: 100%;

  :deep(.el-input__wrapper) {
    padding: 0 4px;
    background: rgb(255 255 255 / 90%);
    border-radius: 4px;
    box-shadow: none;

    &.is-focus {
      box-shadow: 0 0 0 2px #fff;
    }
  }

  :deep(.el-input__inner) {
    height: 20px;
    font-size: 11px;
    color: #303133;
  }
}

/* 合计卡片特殊样式 */
.overview-total {
  background: linear-gradient(135deg, #f97316, #fb923c, #fbbf24);
}

/* 表格卡片 */
.table-card {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  border-radius: 10px;
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  background: var(--el-bg-color, #fff);
  box-shadow: 0 2px 10px rgb(0 0 0 / 5%);
  display: flex;
  flex-direction: column;

  :deep(.el-card__body) {
    flex: 1;
    min-height: 0;
    padding: 8px;
    display: flex;
    flex-direction: column;
  }
}

/* 区块标题 */
.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--el-text-color-primary, #303133);
  flex-shrink: 0;

  .section-icon {
    font-size: 16px;
    color: #764ba2;
  }

  .section-tip {
    margin-left: auto;
    padding: 1px 6px;
    font-size: 9px;
    font-weight: 400;
    color: #764ba2;
    background: rgb(118 75 162 / 10%);
    border: 1px solid rgb(118 75 162 / 20%);
    border-radius: 8px;
  }
}

/* 表格美化 */
.consume-table {
  --el-table-border-color: var(--el-border-color-lighter, #ebeef5);
  --el-table-header-bg-color: #f5f7fa;
  --el-table-bg-color: var(--el-bg-color, #fff);
  --el-table-tr-bg-color: var(--el-bg-color, #fff);
  --el-table-row-hover-bg-color: rgb(118 75 162 / 8%);
  flex: 1;
  min-height: 0;
  border-radius: 8px;
  overflow: hidden;

  :deep(.el-table__header-wrapper) {
    th {
      padding: 2px 0;
      font-size: 13px;
      font-weight: 600;
      color: var(--el-text-color-regular, #606266);
      background: #f5f7fa !important;
      border-bottom: 1px solid var(--el-border-color-lighter, #ebeef5) !important;
    }
  }

  :deep(.el-table__body-wrapper) {
    td {
      padding: 8px 0;
      border-bottom: 1px solid var(--el-border-color-lighter, #ebeef5) !important;
      background: transparent !important;
    }

    tr:nth-child(odd) td {
      background: var(--el-bg-color, #fff) !important;
    }

    tr:nth-child(even) td {
      background: #fafbfc !important;
    }

    tr:hover td {
      background: rgb(118 75 162 / 8%) !important;
    }
  }

  /* 合计行 */
  :deep(.el-table__footer-wrapper) {
    td {
      padding: 6px 0;
      font-size: 13px;
      font-weight: 700;
      color: #d97706;
      background: #fffbeb !important;
      border-top: 1px solid rgb(217 119 6 / 20%) !important;
    }
  }
}

/* 花费项目单元格 */
.cell-category {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
}

/* 表头账号 */
.header-account {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--c, #606266);
  cursor: pointer;
  user-select: none;

  .header-icon-small {
    font-size: 12px;
    color: var(--c, #909399);
  }
}

/* 表头名称编辑输入框 */
.edit-header-input {
  width: 100px;

  :deep(.el-input__wrapper) {
    padding: 0 6px;
    background: #fff;
    border-radius: 4px;
    box-shadow: 0 0 0 1px var(--c, #6366f1);

    &.is-focus {
      box-shadow: 0 0 0 2px var(--c, #6366f1);
    }
  }

  :deep(.el-input__inner) {
    height: 26px;
    font-size: 12px;
    font-weight: 600;
    color: var(--c, #606266);
    text-align: center;
  }
}

/* 合计单元格 */
.cell-total {
  font-size: 12px;
  font-weight: 700;
  color: #d97706;
}

/* 花费金额输入框美化 */
.amount-input {
  width: 100%;

  :deep(.el-input__wrapper) {
    padding: 0 4px;
    background: #fff;
    box-shadow: 0 0 0 1px var(--el-border-color, #dcdfe6);
    border-radius: 5px;
    transition: all 0.2s ease;

    &:hover {
      box-shadow: 0 0 0 1px var(--c, #6366f1);
    }

    &.is-focus {
      box-shadow: 0 0 0 2px rgb(118 75 162 / 40%);
    }
  }

  :deep(.el-input__inner) {
    height: 24px;
    text-align: center;
    font-size: 12px;
    font-weight: 500;
    color: var(--el-text-color-primary, #303133);
  }
}
</style>
