<template>
  <div class="page-container">
    <div class="page-header">
      <h2>用户管理</h2>
      <el-button type="primary" @click="openDialog()">
        <el-icon><Plus /></el-icon>新增用户
      </el-button>
    </div>
    <div class="table-card">
      <el-table :data="list" stripe border>
        <el-table-column prop="username" label="用户名" width="140" />
        <el-table-column prop="name" label="姓名" width="140" />
        <el-table-column label="角色" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="roleType(row.role)">{{ roleMap[row.role] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="170" />
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <el-button type="primary" link @click="openDialog(row)">编辑</el-button>
            <el-popconfirm title="确认删除该用户？" @confirm="handleDelete(row)">
              <template #reference>
                <el-button type="danger" link>删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑用户' : '新增用户'" width="460px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="用户名" required>
          <el-input v-model="form.username" :disabled="!!form.id" />
        </el-form-item>
        <el-form-item label="姓名" required>
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="角色" required>
          <el-select v-model="form.role" style="width:100%;">
            <el-option label="管理员" value="admin" />
            <el-option label="操作员" value="user" />
            <el-option label="审计员" value="auditor" />
          </el-select>
        </el-form-item>
        <el-form-item :label="form.id ? '新密码' : '密码'">
          <el-input v-model="form.password" :placeholder="form.id ? '不修改请留空' : '默认123456'" show-password />
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
const roleMap = { admin: '管理员', user: '操作员', auditor: '审计员' }
const form = reactive({ id: null, username: '', name: '', role: 'user', password: '' })

function roleType(r) {
  return { admin: 'danger', user: 'success', auditor: 'warning' }[r] || 'info'
}

async function loadData() {
  const res = await request.get('/users')
  if (res.code === 200) list.value = res.data
}

function openDialog(row) {
  if (row) {
    Object.assign(form, { id: row.id, username: row.username, name: row.name, role: row.role, password: '' })
  } else {
    Object.assign(form, { id: null, username: '', name: '', role: 'user', password: '' })
  }
  dialogVisible.value = true
}

async function submit() {
  if (!form.username || !form.name || !form.role) {
    ElMessage.warning('请填写完整信息')
    return
  }
  let res
  if (form.id) {
    res = await request.put(`/users/${form.id}`, form)
  } else {
    res = await request.post('/users', form)
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
  const res = await request.delete(`/users/${row.id}`)
  if (res.code === 200) {
    ElMessage.success('删除成功')
    loadData()
  } else {
    ElMessage.error(res.message)
  }
}

onMounted(loadData)
</script>
