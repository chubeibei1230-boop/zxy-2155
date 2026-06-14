<template>
  <div class="page-container">
    <div class="page-header">
      <h2>周转箱管理</h2>
      <el-button type="primary" @click="openDialog()">
        <el-icon><Plus /></el-icon>新增周转箱
      </el-button>
    </div>
    <div class="table-card">
      <el-table :data="list" stripe border>
        <el-table-column prop="code" label="周转箱编号" width="160" />
        <el-table-column label="容量" width="120">
          <template #default="{ row }">
            <el-progress
              :percentage="Math.min(100, Math.round((row.current_count / row.capacity) * 100))"
              :stroke-width="10"
              :format="() => row.current_count + ' / ' + row.capacity"
            />
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="row.current_count >= row.capacity ? 'danger' : (row.current_count > 0 ? 'warning' : 'success')"
            >
              {{ row.current_count >= row.capacity ? '已满' : (row.current_count > 0 ? '使用中' : '空闲') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="170" />
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <el-button type="primary" link @click="openDialog(row)">编辑</el-button>
            <el-popconfirm title="确认删除该周转箱？" @confirm="handleDelete(row)">
              <template #reference>
                <el-button type="danger" link>删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑周转箱' : '新增周转箱'" width="420px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="周转箱编号" required>
          <el-input v-model="form.code" :disabled="!!form.id" />
        </el-form-item>
        <el-form-item label="容量" required>
          <el-input-number v-model="form.capacity" :min="1" :max="200" />
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

const list = ref([])
const dialogVisible = ref(false)
const form = reactive({ id: null, code: '', capacity: 20 })

async function loadData() {
  const res = await request.get('/boxes')
  if (res.code === 200) list.value = res.data
}

function openDialog(row) {
  if (row) {
    Object.assign(form, { id: row.id, code: row.code, capacity: row.capacity })
  } else {
    Object.assign(form, { id: null, code: '', capacity: 20 })
  }
  dialogVisible.value = true
}

async function submit() {
  if (!form.code) {
    ElMessage.warning('请填写编号')
    return
  }
  let res
  if (form.id) {
    res = await request.put(`/boxes/${form.id}`, form)
  } else {
    res = await request.post('/boxes', form)
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
  const res = await request.delete(`/boxes/${row.id}`)
  if (res.code === 200) {
    ElMessage.success('删除成功')
    loadData()
  } else {
    ElMessage.error(res.message)
  }
}

onMounted(loadData)
</script>
