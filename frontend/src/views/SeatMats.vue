<template>
  <div class="page-container">
    <div class="page-header">
      <h2>座席垫管理</h2>
      <el-button type="primary" @click="openDialog()" v-if="userStore.isAdmin">
        <el-icon><Plus /></el-icon>新增座席垫
      </el-button>
    </div>
    <div class="filter-bar">
      <el-form inline>
        <el-form-item label="区域">
          <el-select v-model="filters.area_id" placeholder="全部" clearable style="width:160px;">
            <el-option v-for="a in areas" :key="a.id" :label="a.name" :value="a.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部" clearable style="width:140px;">
            <el-option v-for="s in statusList" :key="s" :label="s" :value="s" />
          </el-select>
        </el-form-item>
        <el-form-item label="编号">
          <el-input v-model="filters.keyword" placeholder="搜索编号" clearable style="width:160px;" @keyup.enter="loadData" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </div>
    <div class="table-card">
      <el-table :data="list" stripe border>
        <el-table-column prop="code" label="编号" width="140" />
        <el-table-column label="区域" width="180">
          <template #default="{ row }">{{ row.area_code }} - {{ row.area_name }}</template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="statusType(row.status)">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="batch_code" label="当前批次" width="140" />
        <el-table-column prop="box_code" label="周转箱" width="120" />
        <el-table-column label="操作" width="140" v-if="userStore.isAdmin">
          <template #default="{ row }">
            <el-button type="primary" link @click="openDialog(row)">编辑</el-button>
            <el-popconfirm title="确认删除该座席垫？" @confirm="handleDelete(row)">
              <template #reference>
                <el-button type="danger" link>删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑座席垫' : '新增座席垫'" width="460px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="编号" required>
          <el-input v-model="form.code" :disabled="!!form.id" />
        </el-form-item>
        <el-form-item label="区域" required>
          <el-select v-model="form.area_id" placeholder="请选择区域" style="width:100%;">
            <el-option v-for="a in areas" :key="a.id" :label="a.name" :value="a.id" />
          </el-select>
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
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import request from '@/utils/request'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const list = ref([])
const areas = ref([])
const dialogVisible = ref(false)
const form = reactive({ id: null, code: '', area_id: null })
const statusList = ['待收回', '已收回', '清洗中', '待复核', '可入库', '异常留置']
const filters = reactive({ area_id: '', status: '', keyword: '' })

function statusType(s) {
  const map = {
    '待收回': 'info', '已收回': '', '清洗中': 'warning',
    '待复核': 'danger', '可入库': 'success', '异常留置': 'danger'
  }
  return map[s] || 'info'
}

function resetFilters() {
  filters.area_id = ''
  filters.status = ''
  filters.keyword = ''
  loadData()
}

async function loadAreas() {
  const res = await request.get('/areas')
  if (res.code === 200) areas.value = res.data
}

async function loadData() {
  const res = await request.get('/seat-mats', { params: filters })
  if (res.code === 200) list.value = res.data
}

function openDialog(row) {
  if (row) {
    Object.assign(form, { id: row.id, code: row.code, area_id: row.area_id })
  } else {
    Object.assign(form, { id: null, code: '', area_id: null })
  }
  dialogVisible.value = true
}

async function submit() {
  if (!form.code || !form.area_id) {
    ElMessage.warning('请填写完整信息')
    return
  }
  let res
  if (form.id) {
    res = await request.put(`/seat-mats/${form.id}`, form)
  } else {
    res = await request.post('/seat-mats', form)
  }
  if (res.code === 200) {
    ElMessage.success(res.message)
    dialogVisible.value = false
    loadData()
  } else {
    ElMessage.error(res.message)
  }
}

async function handleDelete(row) {
  const res = await request.delete(`/seat-mats/${row.id}`)
  if (res.code === 200) {
    ElMessage.success('删除成功')
    loadData()
  } else {
    ElMessage.error(res.message)
  }
}

onMounted(() => {
  loadAreas()
  loadData()
})
</script>
