<script setup lang="ts">
import { emitter } from "@/utils/mitt";
import { useNav } from "@/layout/hooks/useNav";
import LaySearch from "../lay-search/index.vue";
import LayNotice from "../lay-notice/index.vue";
import { responsiveStorageNameSpace } from "@/config";
import { ref, nextTick, computed, onMounted } from "vue";
import { storageLocal, isAllEmpty } from "@pureadmin/utils";
import { usePermissionStoreHook } from "@/store/modules/permission";
import LaySidebarItem from "../lay-sidebar/components/SidebarItem.vue";
import LaySidebarFullScreen from "../lay-sidebar/components/SidebarFullScreen.vue";
import { ElMessage } from "element-plus";

import LogoutCircleRLine from "~icons/ri/logout-circle-r-line";
import Setting from "~icons/ri/settings-3-line";
import Upload2Line from "~icons/ri/upload-2-line";
import Download2Line from "~icons/ri/download-2-line";

/** localStorage 存储键（与 consume/hook.tsx 保持一致） */
const STORAGE_KEY = "menghuan_consume_data";

/** 导出梦幻消耗数据到 JSON 文件 */
function exportConsumeData(): void {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    ElMessage.warning("暂无数据可导出");
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    const payload = {
      version: 1,
      exportTime: new Date().toLocaleString("zh-CN"),
      ...parsed
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `梦幻消耗统计_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    ElMessage.success("数据已导出");
  } catch {
    ElMessage.error("导出失败");
  }
}

/** 从 JSON 文件导入梦幻消耗数据 */
function importConsumeData(): void {
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
        // 校验必要字段
        if (!parsed.tableData || !Array.isArray(parsed.tableData)) {
          throw new Error("格式错误");
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        ElMessage.success("数据导入成功，即将刷新");
        // 刷新页面确保各模块状态同步
        setTimeout(() => location.reload(), 800);
      } catch {
        ElMessage.error("导入失败：文件格式不正确");
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

const menuRef = ref();
const showLogo = ref(
  storageLocal().getItem<StorageConfigs>(
    `${responsiveStorageNameSpace()}configure`
  )?.showLogo ?? true
);

const {
  route,
  title,
  logout,
  onPanel,
  getLogo,
  username,
  userAvatar,
  backTopMenu,
  avatarsStyle
} = useNav();

const defaultActive = computed(() =>
  !isAllEmpty(route.meta?.activePath) ? route.meta.activePath : route.path
);

nextTick(() => {
  menuRef.value?.handleResize();
});

onMounted(() => {
  emitter.on("logoChange", key => {
    showLogo.value = key;
  });
});
</script>

<template>
  <div
    v-loading="usePermissionStoreHook().wholeMenus.length === 0"
    class="horizontal-header"
  >
    <div v-if="showLogo" class="horizontal-header-left" @click="backTopMenu">
      <img :src="getLogo()" alt="logo" />
      <span>{{ title }}</span>
    </div>
    <el-menu
      ref="menuRef"
      mode="horizontal"
      popper-class="pure-scrollbar"
      class="horizontal-header-menu"
      :default-active="defaultActive"
    >
      <LaySidebarItem
        v-for="route in usePermissionStoreHook().wholeMenus"
        :key="route.path"
        :item="route"
        :base-path="route.path"
      />
    </el-menu>
    <div class="horizontal-header-right">
      <!-- 菜单搜索 -->
      <!-- <LaySearch id="header-search" /> -->
      <!-- 全屏 -->
      <LaySidebarFullScreen id="full-screen" />
      <!-- 梦幻消耗：导入/导出数据 -->
      <el-tooltip content="导入备份" placement="bottom">
        <span class="header-icon-btn" @click="importConsumeData">
          <IconifyIconOffline :icon="Upload2Line" />
        </span>
      </el-tooltip>
      <el-tooltip content="导出备份" placement="bottom">
        <span class="header-icon-btn" @click="exportConsumeData">
          <IconifyIconOffline :icon="Download2Line" />
        </span>
      </el-tooltip>
      <!-- 消息通知 -->
      <!-- <LayNotice id="header-notice" /> -->
      <!-- 退出登录 -->
      <el-dropdown trigger="click">
        <span class="el-dropdown-link navbar-bg-hover">
          <img :src="userAvatar" :style="avatarsStyle" />
          <p v-if="username" class="dark:text-white">{{ username }}</p>
        </span>
        <template #dropdown>
          <el-dropdown-menu class="logout">
            <el-dropdown-item @click="logout">
              <IconifyIconOffline
                :icon="LogoutCircleRLine"
                style="margin: 5px"
              />
              退出系统
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <!-- <span
        class="set-icon navbar-bg-hover"
        title="打开系统配置"
        @click="onPanel"
      >
        <IconifyIconOffline :icon="Setting" />
      </span> -->
    </div>
  </div>
</template>

<style lang="scss" scoped>
:deep(.el-loading-mask) {
  opacity: 0.45;
}

.logout {
  width: 120px;

  ::v-deep(.el-dropdown-menu__item) {
    display: inline-flex;
    flex-wrap: wrap;
    min-width: 100%;
  }
}

/* 导航栏右侧图标按钮（导入/导出） */
.header-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin: 0 3px;
  font-size: 15px;
  color: var(--el-text-color-regular, #606266);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: #764ba2;
    background: rgb(118 75 162 / 10%);
  }
}
</style>
