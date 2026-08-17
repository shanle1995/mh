import { localForage } from "@/utils/localforage";

/**
 * 梦幻消耗统计 - 持久化数据层
 *
 * 存储策略（按优先级）：
 *   1. 绑定的本地文件（File System Access API，真正存磁盘，浏览器清缓存也不丢）
 *   2. 代码内默认值（兜底）
 *
 * 注意：IndexedDB 数据存储已注释停用，仅保留文件句柄的存储（句柄只能存 IndexedDB）
 *
 * 启动时会自动迁移：若旧 localStorage 有数据，会读一次迁移到本地文件再清掉。
 */

// ============ 存储 key ============
// NOTE: 表格数据/账号数据的 IndexedDB 存储已停用，改为只写入绑定的本地文件
// /** 表格数据 IndexedDB key */
// const TABLE_KEY = "menghuan_consume_table";
// /** 账号配置 IndexedDB key */
// const ACCOUNTS_KEY = "menghuan_consume_accounts";
/** 绑定的文件句柄 IndexedDB key（句柄是结构化克隆对象，只能存 IndexedDB） */
const FILE_HANDLE_KEY = "menghuan_consume_file_handle";

// ============ 旧 localStorage key（仅用于一次性迁移） ============
const LEGACY_TABLE_KEY = "menghuan_consume_data";
const LEGACY_ACCOUNTS_KEY = "menghuan_consume_accounts";

/** 完整持久化数据结构（写入本地文件时的 JSON 结构） */
export interface PersistPayload {
  /** 表格数据 */
  tableData: unknown;
  /** 账号配置 */
  accounts: unknown;
  /** 保存时间（ISO 字符串） */
  savedAt: string;
  /** 数据版本号，便于以后升级 */
  version: number;
}

/** 当前数据版本号 */
const DATA_VERSION = 1;

/**
 * 检测当前浏览器是否支持 File System Access API
 * 仅 Chrome/Edge 等 Chromium 内核浏览器支持
 * 注意：此检查仅用于功能开关，真正的可用性以运行时为准
 */
export function isFileSystemAccessSupported(): boolean {
  if (typeof window === "undefined") return false;
  // Chrome 98+ 暴露的是 window.showSaveFilePicker / window.showOpenFilePicker
  // 注意 Vite 的 lib.d.ts 可能未声明这些类型，因此用 (window as any)
  const w = window as any;
  return !!(
    w.showSaveFilePicker ||
    w.showOpenFilePicker ||
    (w.FileSystemHandle && w.showDirectoryPicker)
  );
}

/**
 * 读取已绑定的文件句柄（如果之前绑定过）
 * @returns 文件句柄，未绑定返回 null
 */
export async function getFileHandle(): Promise<FileSystemFileHandle | null> {
  try {
    const handle = await localForage().getItem<FileSystemFileHandle>(
      FILE_HANDLE_KEY
    );
    return handle ?? null;
  } catch {
    return null;
  }
}

/**
 * 弹出系统文件选择框，让用户选择/创建一个 JSON 文件作为持久存储位置
 * 选定后立即写入当前数据，并把句柄存到 IndexedDB（下次打开可免选择，仅需授权）
 *
 * @param initialData 绑定时立即写入文件的初始数据
 * @returns 是否绑定成功（用户取消则返回 false）
 */
export async function bindFile(initialData: PersistPayload): Promise<boolean> {
  if (!isFileSystemAccessSupported()) {
    throw new Error("当前浏览器不支持文件系统访问，请使用 Chrome 或 Edge 浏览器");
  }
  // 弹出保存文件对话框
  const handle = await (window as any).showSaveFilePicker({
    types: [
      {
        description: "JSON 数据文件",
        accept: { "application/json": [".json"] }
      }
    ],
    suggestedName: "mh-consume-data.json"
  });
  // 持久化句柄到 IndexedDB（结构化克隆，下次会话可读取）
  await localForage().setItem(FILE_HANDLE_KEY, handle);
  // 立即写入一次数据（此时处于用户手势上下文，有权限）
  await writeToFile(handle, initialData);
  return true;
}

/**
 * 请求已绑定文件的读写权限（必须在用户交互上下文中调用，如按钮点击）
 * Chrome 刷新页面后会重置权限，需要用户再次授权。
 * 建议在页面加载后的首次用户交互中调用一次，之后自动写入就不再需要请求。
 *
 * @returns 是否已获得权限
 */
export async function requestFilePermission(): Promise<boolean> {
  const handle = await getFileHandle();
  if (!handle) return false;
  return ensurePermission(handle, "readwrite");
}

/**
 * 解除文件绑定（不会删除磁盘文件，只是不再自动写入）
 */
export async function unbindFile(): Promise<void> {
  await localForage().removeItem(FILE_HANDLE_KEY);
}

/**
 * 检查/请求文件句柄的访问权限
 * @param handle 文件句柄
 * @param mode 权限模式：read 只读 / readwrite 读写
 * @returns 是否已获得权限
 */
async function ensurePermission(
  handle: FileSystemFileHandle,
  mode: "read" | "readwrite" = "readwrite"
): Promise<boolean> {
  const opts = { mode };
  const anyHandle = handle as any;
  // 先查询，已有权限直接通过
  if ((await anyHandle.queryPermission(opts)) === "granted") return true;
  // 没有则请求（会触发浏览器权限提示）
  if ((await anyHandle.requestPermission(opts)) === "granted") return true;
  return false;
}

/**
 * 从指定文件句柄读取并解析 JSON 数据
 * @param handle 文件句柄
 * @returns 解析后的数据，读取或解析失败返回 null
 */
async function readFromFile<T = unknown>(
  handle: FileSystemFileHandle
): Promise<T | null> {
  try {
    if (!(await ensurePermission(handle, "read"))) return null;
    const file = await handle.getFile();
    const text = await file.text();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * 将数据写入指定的文件句柄（覆盖写入）
 * @param handle 文件句柄
 * @param data 任意可序列化数据
 */
async function writeToFile(
  handle: FileSystemFileHandle,
  data: unknown
): Promise<void> {
  if (!(await ensurePermission(handle, "readwrite"))) {
    throw new Error("未获得文件写入权限");
  }
  const writable = await (handle as any).createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
}

/**
 * 从旧 localStorage 迁移数据（仅迁移一次）
 * 用于兼容用户已有的旧数据：读出来暂存到内存，由调用方决定是否写入绑定的本地文件
 * @returns 旧数据（如果有），否则返回 null
 */
async function migrateFromLegacy(): Promise<{
  tableData: unknown;
  accounts: unknown;
} | null> {
  try {
    // 读旧 localStorage
    const legacyTableRaw = localStorage.getItem(LEGACY_TABLE_KEY);
    const legacyAccountsRaw = localStorage.getItem(LEGACY_ACCOUNTS_KEY);
    if (!legacyTableRaw && !legacyAccountsRaw) return null;
    let tableData: unknown = null;
    let accounts: unknown = null;
    if (legacyTableRaw) {
      const parsed = JSON.parse(legacyTableRaw);
      if (parsed?.tableData) tableData = parsed.tableData;
    }
    if (legacyAccountsRaw) {
      accounts = JSON.parse(legacyAccountsRaw);
    }
    // 清理旧 localStorage（避免下次重复迁移）
    localStorage.removeItem(LEGACY_TABLE_KEY);
    localStorage.removeItem(LEGACY_ACCOUNTS_KEY);
    return { tableData, accounts };
  } catch {
    // 迁移失败静默忽略，不影响主流程
    return null;
  }
}

// 用于跨函数传递迁移数据（仅在本次会话内有效）
let migratedData: { tableData: unknown; accounts: unknown } | null = null;

/**
 * 加载完整持久化数据（表格 + 账号）
 * 加载优先级：绑定的本地文件 > 旧 localStorage 迁移数据 > 传入的默认值
 *
 * @param defaultTableData 默认表格数据
 * @param defaultAccounts 默认账号列表
 * @returns 加载到的表格数据和账号数据
 */
export async function loadPersistedData<TTable, TAccounts>(
  defaultTableData: TTable,
  defaultAccounts: TAccounts
): Promise<{ tableData: TTable; accounts: TAccounts; fromFile: boolean }> {
  // 先尝试从旧 localStorage 迁移（仅一次，存到内存待用）
  if (!migratedData) {
    migratedData = await migrateFromLegacy();
  }

  // 1. 优先尝试从绑定的本地文件读取
  const handle = await getFileHandle();
  if (handle) {
    const fromFile = await readFromFile<PersistPayload>(handle);
    if (fromFile && fromFile.tableData) {
      return {
        tableData: fromFile.tableData as TTable,
        accounts: (fromFile.accounts as TAccounts) ?? defaultAccounts,
        fromFile: true
      };
    }
  }

  // 2. 从旧 localStorage 迁移数据读取（如果上一步有读到）
  if (migratedData?.tableData) {
    return {
      tableData: migratedData.tableData as TTable,
      accounts: (migratedData.accounts as TAccounts) ?? defaultAccounts,
      fromFile: false
    };
  }

  // 3. 使用默认值兜底
  return { tableData: defaultTableData, accounts: defaultAccounts, fromFile: false };
}

/**
 * 保存数据（只写入绑定的本地文件）
 * 注意：IndexedDB 存储已停用，仅写入文件。未绑定文件时数据不持久化。
 * @param tableData 表格数据
 * @param accounts 账号列表
 */
export async function savePersistedData(
  tableData: unknown,
  accounts: unknown
): Promise<{ fileWritten: boolean; fileError?: string }> {
  // 尝试写入绑定的本地文件（如果绑定了）
  const handle = await getFileHandle();
  if (!handle) return { fileWritten: false };
  try {
    const payload: PersistPayload = {
      tableData,
      accounts,
      savedAt: new Date().toISOString(),
      version: DATA_VERSION
    };
    await writeToFile(handle, payload);
    return { fileWritten: true };
  } catch (e: any) {
    return { fileWritten: false, fileError: e?.message ?? "写入文件失败" };
  }
}

/**
 * 查询当前是否已绑定本地文件（不触发权限请求）
 */
export async function isFileBound(): Promise<boolean> {
  const handle = await getFileHandle();
  return handle != null;
}
