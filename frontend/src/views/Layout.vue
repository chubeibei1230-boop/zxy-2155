<template>
  <el-container class="layout-container">
    <el-aside width="220px" class="aside">
      <div class="logo">
        <el-icon><Refresh /></el-icon>
        <span>座席垫管理平台</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        router
        background-color="#001529"
        text-color="#b7c0cc"
        active-text-color="#fff"
        class="menu"
      >
        <template v-for="route in menuRoutes" :key="route.path">
          <el-menu-item :index="`/${route.path}`" v-if="!route.hidden">
            <el-icon>
              <component :is="route.icon" />
            </el-icon>
            <span>{{ route.title }}</span>
          </el-menu-item>
        </template>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item>{{ currentTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-icon><UserFilled /></el-icon>
              {{ userStore.user?.name }}
              <el-tag size="small" :type="roleTagType" style="margin-left: 8px;">{{ roleText }}</el-tag>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">
                  <el-icon><SwitchButton /></el-icon>退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="main">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Refresh, UserFilled, SwitchButton } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const menuRoutes = computed(() => {
  const routes = router.options.routes.find(r => r.path === '/').children.filter(r => r.meta?.title && !r.meta?.hidden)
  return routes.filter(r => {
    if (!r.meta?.roles) return true
    return r.meta.roles.includes(userStore.role)
  })
})

const activeMenu = computed(() => route.path)
const currentTitle = computed(() => route.meta?.title || '首页')

const roleText = computed(() => {
  const map = { admin: '管理员', user: '操作员', auditor: '审计员' }
  return map[userStore.role] || '未知'
})

const roleTagType = computed(() => {
  const map = { admin: 'danger', user: 'success', auditor: 'warning' }
  return map[userStore.role] || 'info'
})

function handleCommand(cmd) {
  if (cmd === 'logout') {
    userStore.logout()
    router.push('/login')
  }
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.aside {
  background: #001529;
  overflow-x: hidden;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  border-bottom: 1px solid #002140;
}

.logo .el-icon {
  font-size: 22px;
  margin-right: 8px;
  color: #409eff;
}

.menu {
  border-right: none;
}

.header {
  background: #fff;
  border-bottom: 1px solid #e6e8eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  color: #303133;
}

.user-info .el-icon {
  margin-right: 6px;
}

.main {
  background: #f0f2f5;
  overflow-y: auto;
  padding: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
