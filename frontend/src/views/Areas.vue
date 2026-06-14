<template>
  <div class="page-container">
    <div class="page-header">
      <h2>区域管理</h2>
      <el-button type="primary" @click="openDialog()">
        <el-icon><Plus /></el-icon>新增区域
      </el-button>
    </div>
    <div class="table-card">
      <el-table :data="list" stripe border>
        <el-table-column prop="code" label="区域编号" width="140" />
        <el-table-column prop="name" label="区域名称" min-width="180" />
        <el-table-column prop="description" label="描述" min-width="220" />
        <el-table-column prop="mat_count" label="座席垫数量" width="120" align="center" />
        <el-table-column prop="created_at" label="创建时间" width="170" />
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <el-button type="primary" link @click="openDialog(row)">编辑</el-button>
            <el-popconfirm title="确认删除该区域？" @confirm="handleDelete(row)">
              <template #reference>
                <el-button type="danger" link>删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑区域' : '新增区域'" width="460px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="区域编号" required>
          <el-input v-model="form.code" :disabled="!!form.id" />
        </el-form-item>
        <el-form-item label="区域名称" required>
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" />
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
const form = reactive({ id: null, code: '', name: '', description: '' })

async function loadData() {
  const res = await request.get('/areas')
  if (res.code === 200) list.value = res.data
}

function openDialog(row) {
  if (row) {
    Object.assign(form, { id: row.id, code: row.code, name: row.name, description: row.description })
  } else {
    Object.assign(form, { id: null, code: '', name: '', description: '' })
  }
  dialogVisible.value = true
}

async function submit() {
  if (!form.code || !form.name) {
    ElMessage.warning('请填写完整信息')
    return
  }
  let res
  if (form.id) {
    res = await request.put(`/areas/${form.id}`, form)
  } else {
    res = await request.post('/areas', form)
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
  const res = await request.delete(`/areas/${row.id}`)
  if (res.code === 200) {
    ElMessage.success('删除成功')
    loadData()
  } else {
    ElMessage.error(res.message)
  }
}

onMounted(loadData)
</script>
