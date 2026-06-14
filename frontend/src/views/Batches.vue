<template>
  <div class="page-container">
    <div class="page-header">
      <h2>清洗批次</h2>
      <el-button type="primary" @click="openDialog()" v-if="userStore.isAdmin || userStore.isUser">
        <el-icon><Plus /></el-icon>新建批次
      </el-button>
    </div>
    <div class="filter-bar">
      <el-form inline>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部" clearable style="width:140px;">
            <el-option label="进行中" value="进行中" />
            <el-option label="已完成" value="已完成" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="filters.status='';loadData()">重置</el-button>
        </el-form-item>
      </el-form>
    </div>
    <div class="table-card">
      <el-table :data="list" stripe border>
        <el-table-column prop="code" label="批次编号" width="140" />
        <el-table-column prop="name" label="批次名称" min-width="160" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="row.status === '进行中' ? 'warning' : 'success'">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="mat_count" label="座席垫数" width="100" align="center" />
        <el-table-column prop="record_count" label="操作记录数" width="110" align="center" />
        <el-table-column prop="responsible_name" label="责任人" width="110" />
        <el-table-column prop="cleaning_timeout_hours" label="超时阈值(h)" width="110" align="center" />
        <el-table-column prop="started_at" label="开始时间" width="170" />
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button type="primary" link @click="goDetail(row.id)">详情</el-button>
            <el-button type="success" link @click="completeBatch(row)" v-if="row.status === '进行中'">完成批次</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" title="新建批次" width="460px">
      <el-form :model="form" label-width="110px">
        <el-form-item label="批次编号" required>
          <el-input v-model="form.code" placeholder="如 BATCH-2024-001" />
        </el-form-item>
        <el-form-item label="批次名称" required>
          <el-input v-model="form.name" placeholder="如 2024年第1批清洗" />
        </el-form-item>
        <el-form-item label="责任人">
          <el-select v-model="form.responsible_id" placeholder="请选择" clearable style="width:100%;">
            <el-option v-for="u in users" :key="u.id" :label="u.name" :value="u.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="超时阈值(h)">
          <el-input-number v-model="form.cleaning_timeout_hours" :min="1" :max="72" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import request from '@/utils/request'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const list = ref([])
const users = ref([])
const dialogVisible = ref(false)
const form = reactive({ code: '', name: '', responsible_id: null, cleaning_timeout_hours: 8 })
const filters = reactive({ status: '' })

async function loadUsers() {
  const res = await request.get('/users')
  if (res.code === 200) users.value = res.data
}

async function loadData() {
  const res = await request.get('/batches', { params: filters })
  if (res.code === 200) list.value = res.data
}

function goDetail(id) {
  router.push(`/batches/${id}`)
}

function openDialog() {
  Object.assign(form, { code: '', name: '', responsible_id: null, cleaning_timeout_hours: 8 })
  dialogVisible.value = true
}

async function submit() {
  if (!form.code || !form.name) {
    ElMessage.warning('请填写完整信息')
    return
  }
  const res = await request.post('/batches', form)
  if (res.code === 200) {
    ElMessage.success('创建成功')
    dialogVisible.value = false
    loadData()
  } else {
    ElMessage.error(res.message)
  }
}

async function completeBatch(row) {
  try {
    await ElMessageBox.confirm('确认完成该批次？完成后不可恢复。', '提示', { type: 'warning' })
    const res = await request.post(`/batches/${row.id}/complete`)
    if (res.code === 200) {
      ElMessage.success('批次已完成')
      loadData()
    }
  } catch (_) {}
}

onMounted(() => {
  loadUsers()
  loadData()
})
</script>
