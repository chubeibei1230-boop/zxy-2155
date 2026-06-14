<template>
  <div class="page-container">
    <div class="page-header">
      <h2>检查规则</h2>
    </div>
    <div class="table-card">
      <el-table :data="list" stripe border>
        <el-table-column prop="name" label="规则名称" width="180" />
        <el-table-column label="规则类型" width="140">
          <template #default="{ row }">
            <el-tag size="small">{{ typeMap[row.rule_type] || row.rule_type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="240" />
        <el-table-column label="配置参数" min-width="240">
          <template #default="{ row }">
            <span v-for="(v, k) in parseConfig(row.config)" :key="k" style="margin-right:16px;">
              {{ k }}: <b>{{ v }}</b>
            </span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-switch
              v-model="row.enabled"
              :active-value="1"
              :inactive-value="0"
              @change="toggleEnabled(row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button type="primary" link @click="openEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" title="编辑规则" width="500px">
      <el-form :model="form" label-width="110px">
        <el-form-item label="规则名称">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.enabled" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <div v-if="form.rule_type === 'cleaning_timeout'">
          <el-form-item label="超时时间(小时)">
            <el-input-number v-model="form.config.timeoutHours" :min="1" :max="168" />
          </el-form-item>
        </div>
        <div v-if="form.rule_type === 'area_cluster'">
          <el-form-item label="异常阈值">
            <el-input-number v-model="form.config.threshold" :min="2" :max="100" />
          </el-form-item>
          <el-form-item label="时间窗口(小时)">
            <el-input-number v-model="form.config.timeWindowHours" :min="1" :max="168" />
          </el-form-item>
        </div>
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
import request from '@/utils/request'

const list = ref([])
const dialogVisible = ref(false)
const typeMap = {
  cleaning_timeout: '清洗超时',
  area_cluster: '区域集中',
  box_overload: '箱子过载',
  missing_review: '复核缺失'
}
const form = reactive({
  id: null,
  name: '',
  description: '',
  rule_type: '',
  config: {},
  enabled: 1
})

function parseConfig(cfg) {
  try {
    return JSON.parse(cfg)
  } catch (e) {
    return {}
  }
}

async function loadData() {
  const res = await request.get('/check-rules')
  if (res.code === 200) list.value = res.data
}

function openEdit(row) {
  Object.assign(form, {
    id: row.id,
    name: row.name,
    description: row.description,
    rule_type: row.rule_type,
    config: parseConfig(row.config),
    enabled: row.enabled
  })
  dialogVisible.value = true
}

async function toggleEnabled(row) {
  const cfg = parseConfig(row.config)
  await request.put(`/check-rules/${row.id}`, {
    name: row.name,
    description: row.description,
    config: cfg,
    enabled: row.enabled
  })
  ElMessage.success('已更新')
}

async function submit() {
  const res = await request.put(`/check-rules/${form.id}`, {
    name: form.name,
    description: form.description,
    config: form.config,
    enabled: form.enabled
  })
  if (res.code === 200) {
    ElMessage.success('更新成功')
    dialogVisible.value = false
    loadData()
  }
}

onMounted(loadData)
</script>
