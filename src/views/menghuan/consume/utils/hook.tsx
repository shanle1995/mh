import { ref, computed, watch } from "vue";
import { ElMessage } from "element-plus";

/** 账号信息接口 */
interface Account {
  /** 账号唯一标识 */
  id: string;
  /** 账号显示名称 */
  name: string;
  /** 账号角色 */
  role: string;
  /** 角色图标（Iconify 图标名） */
  icon: string;
  /** 渐变起始色 */
  from: string;
  /** 渐变结束色 */
  to: string;
}

/** 花费明细行接口（每行对应一个花费项目） */
interface CostRow {
  /** 花费项目名称 */
  category: string;
  /** 无底洞花费 */
  a1: number;
  /** 女儿村花费 */
  a2: number;
  /** 普陀①花费 */
  a3: number;
  /** 普陀②花费 */
  a4: number;
  /** 普陀③花费 */
  a5: number;
}

/** 账号本地存储中持久化的字段结构 */
interface AccountStorageItem {
  id: string;
  name: string;
  role: string;
}

/**
 * 梦幻消耗统计页面逻辑
 * 集中管理账号、花费项目声明及所有统计计算函数
 */
export function useConsume() {
  // 账号默认值（用于初始化及兜底）
  const defaultAccounts: Account[] = [
    {
      id: "a1",
      name: "无底洞",
      role: "无底洞",
      icon: "ri/shield-flash-line",
      from: "#6366f1",
      to: "#818cf8"
    },
    {
      id: "a2",
      name: "女儿村",
      role: "女儿村",
      icon: "ri/women-line",
      from: "#ec4899",
      to: "#f472b6"
    },
    {
      id: "a3",
      name: "普陀①",
      role: "普陀",
      icon: "ri/leaf-line",
      from: "#14b8a6",
      to: "#2dd4bf"
    },
    {
      id: "a4",
      name: "普陀②",
      role: "普陀",
      icon: "ri/leaf-line",
      from: "#0ea5e9",
      to: "#38bdf8"
    },
    {
      id: "a5",
      name: "普陀③",
      role: "普陀",
      icon: "ri/leaf-line",
      from: "#22c55e",
      to: "#4ade80"
    }
  ];

  // 账号本地存储 key（保存 name / role）
  const ACCOUNT_STORAGE_KEY = "menghuan_consume_accounts";

  /**
   * 从 localStorage 读取已保存的账号名称与角色
   * 兼容两种格式：
   *   1. [...]（直接数组）
   *   2. { accounts: [...] }（对象包裹）
   * @returns 保存的账号精简数据，读取失败返回 null
   */
  function loadAccountsFromStorage(): AccountStorageItem[] | null {
    try {
      const raw = localStorage.getItem(ACCOUNT_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // 格式1：直接数组
      if (Array.isArray(parsed)) {
        return parsed;
      }
      // 格式2：对象中包含 accounts 字段
      if (parsed && Array.isArray(parsed.accounts)) {
        return parsed.accounts;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * 将账号名称与角色保存到 localStorage
   * @param accList 当前账号列表
   */
  function saveAccountsToStorage(accList: Account[]): void {
    try {
      const payload: AccountStorageItem[] = accList.map(a => ({
        id: a.id,
        name: a.name,
        role: a.role
      }));
      localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // localStorage 写入失败时静默忽略
    }
  }

  /**
   * 使用本地存储中的 name / role 覆盖默认账号
   * @returns 合并后的账号列表
   */
  function buildAccounts(): Account[] {
    const saved = loadAccountsFromStorage();
    if (!saved) return defaultAccounts.map(a => ({ ...a }));
    return defaultAccounts.map(def => {
      const found = saved.find(s => s.id === def.id);
      return {
        ...def,
        name: found?.name ?? def.name,
        role: found?.role ?? def.role
      };
    });
  }

  // 账号列表（响应式，支持修改后持久化）
  const accounts = ref<Account[]>(buildAccounts());

  // 监听账号变化，自动持久化名称与角色
  watch(
    accounts,
    accList => {
      saveAccountsToStorage(accList);
    },
    { deep: true }
  );

  /**
   * 更新某个账号的显示名称（卡片、表头、本地存储同步更新）
   * @param accountId 账号 id，如 a1/a2/a3/a4/a5
   * @param newName 新的显示名称
   */
  function updateAccountName(accountId: string, newName: string): void {
    const acc = accounts.value.find(a => a.id === accountId);
    if (!acc) return;
    const trimmed = newName.trim();
    if (!trimmed) {
      ElMessage.warning("账号名称不能为空");
      return;
    }
    acc.name = trimmed;
    acc.role = trimmed;
    ElMessage.success("名称已更新");
  }

  // 花费项目列表（共18项）
  const costCategories: string[] = [
    "角色购买",
    "头盔",
    "武器",
    "腰带",
    "项链",
    "衣服",
    "鞋子",
    "戒指",
    "耳饰",
    "手镯",
    "配饰",
    "宝宝",
    "宝宝装备",
    "高级兽决",
    "游戏币",
    "游戏点数",
    "上古玉阳",
    "上古玉阴"
  ];

  // localStorage 存储 key
  const STORAGE_KEY = "menghuan_consume_data";

  // 默认表格数据构造
  function createDefaultTableData(): CostRow[] {
    return costCategories.map(category => ({
      category,
      a1: 0,
      a2: 0,
      a3: 0,
      a4: 0,
      a5: 0
    }));
  }

  /**
   * 从 localStorage 读取已保存的数据
   * 兼容三种格式：
   *   1. { tableData: [...] }
   *   2. [...]（直接数组）
   *   3. { tableData: [...], ...其他字段 }
   * @returns 保存的表格数据，读取失败返回 null
   */
  function loadFromStorage(): CostRow[] | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // 格式1/3：对象中包含 tableData 字段
      if (parsed && Array.isArray(parsed.tableData)) {
        return parsed.tableData;
      }
      // 格式2：直接就是数组
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * 将当前数据保存到 localStorage
   * @param tData 表格数据
   */
  function saveToStorage(tData: CostRow[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ tableData: tData }));
    } catch {
      // localStorage 写入失败（如超出配额）时静默忽略
    }
  }

  /**
   * 将本地存储中的旧数据与当前默认结构合并
   * 按 category 名称匹配，缺失的账号字段补 0
   * 避免旧数据缺少字段或字段名不一致导致显示为空
   * @param saved 已保存的表格数据
   * @returns 与当前 costCategories 对齐的完整数据
   */
  function mergeSavedData(saved: CostRow[]): CostRow[] {
    return createDefaultTableData().map(row => {
      // 按 category 名称匹配旧数据
      const found = saved.find(r => r.category === row.category);
      if (!found) return row;
      // 按当前账号 id 逐个取值，缺失或非数字补 0
      accounts.value.forEach(a => {
        const v = (found as any)[a.id];
        (row as any)[a.id] = Number(v) || 0;
      });
      return row;
    });
  }

  // 初始化：优先从 localStorage 读取，否则使用默认值
  const saved = loadFromStorage();
  const tableData = ref<CostRow[]>(
    saved && saved.length > 0 ? mergeSavedData(saved) : createDefaultTableData()
  );

  // 监听数据变化，自动持久化到 localStorage
  watch(
    tableData,
    tData => {
      saveToStorage(tData);
    },
    { deep: true }
  );

  /**
   * 计算某项花费的合计（5个账号相加）
   * @param row 当前行数据
   * @returns 该项目所有账号花费总和
   */
  function rowTotal(row: CostRow): number {
    return accounts.value.reduce(
      (sum, a) => sum + (Number(row[a.id as keyof CostRow]) || 0),
      0
    );
  }

  /**
   * 计算某个账号的总花费
   * @param accountId 账号唯一标识
   * @returns 该账号所有花费项目总和
   */
  function accountTotal(accountId: string): number {
    return tableData.value.reduce(
      (sum, row) => sum + (Number(row[accountId as keyof CostRow]) || 0),
      0
    );
  }

  // 总合计：所有账号所有花费项目之和
  const grandTotal = computed(() =>
    tableData.value.reduce((sum, row) => sum + rowTotal(row), 0)
  );

  /**
   * 金额格式化：千分位分隔，保留两位小数
   * @param value 原始数值
   * @returns 格式化后的字符串
   */
  function formatMoney(value: number): string {
    return value.toLocaleString("zh-CN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  /**
   * 计算某账号花费占总花费的百分比
   * @param accountId 账号唯一标识
   * @returns 百分比字符串（如 "23.5%"）
   */
  function percentOf(accountId: string): string {
    if (grandTotal.value === 0) return "0%";
    return (
      ((accountTotal(accountId) / grandTotal.value) * 100).toFixed(1) + "%"
    );
  }

  /**
   * 表格底部合计行计算方法
   * @param param0 el-table 提供的列信息
   * @returns 每列对应的合计值数组
   */
  function getSummaries({ columns }: { columns: any[] }): string[] {
    return columns.map((col, idx) => {
      // 第一列显示"总计"
      if (idx === 0) return "总计";
      const accId = col.property;
      // 账号列：显示该账号总花费（千分位）
      if (accId && accounts.value.find(a => a.id === accId)) {
        return formatMoney(accountTotal(accId));
      }
      // 合计列：显示总合计（千分位）
      if (col.label === "合计") {
        return formatMoney(grandTotal.value);
      }
      return "";
    });
  }

  /**
   * 导出当前数据为 JSON 文件下载，用于备份/迁移
   * 重新打包或换机后可通过 importData 导入恢复
   */
  function exportData(): void {
    const payload = {
      version: 1,
      exportTime: new Date().toLocaleString("zh-CN"),
      tableData: tableData.value
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `梦幻西游统计_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    ElMessage.success("数据已导出");
  }

  /**
   * 导入 JSON 文件恢复数据
   * 内部动态创建文件选择框，按花费项目名称匹配覆盖，旧数据中没有的新项目置 0
   * 重新打包或换机后可用导出的备份文件恢复数据
   */
  function triggerImport(): void {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const parsed = JSON.parse(e.target?.result as string);
          // 兼容两种格式：直接数组 或 { tableData: [] }
          const imported: any[] = Array.isArray(parsed)
            ? parsed
            : parsed?.tableData;
          if (!Array.isArray(imported)) throw new Error("格式错误");
          // 基于当前项目重建，按 category 名称匹配覆盖
          const next = createDefaultTableData();
          next.forEach(row => {
            const found = imported.find(
              (r: any) => r.category === row.category
            );
            if (found) {
              accounts.value.forEach(a => {
                (row as any)[a.id] = Number(found[a.id]) || 0;
              });
            }
          });
          tableData.value = next;
          ElMessage.success("数据导入成功");
        } catch {
          ElMessage.error("导入失败：文件格式不正确");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  return {
    accounts,
    tableData,
    rowTotal,
    accountTotal,
    grandTotal,
    formatMoney,
    percentOf,
    getSummaries,
    exportData,
    triggerImport,
    updateAccountName
  };
}
