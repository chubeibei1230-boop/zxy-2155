<template>
  <div class="page-container">
    <div class="page-header">
      <h2>操作记录</h2>
    </div>
    <div class="filter-bar">
      <el-form inline>
        <el-form-item label="区域">
          <el-select v-model="filters.area_id" placeholder="全部" clearable style="width:160px;">
            <el-option v-for="a in areas" :key="a.id" :label="a.name" :value="a.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="批次">
          <el-select v-model="filters.batch_id" placeholder="全部" clearable style="width:180px;">
            <el-option v-for="b in batches" :key="b.id" :label="b.code + ' - ' + b.name" :value="b.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="操作类型">
          <el-select v-model="filters.operation_type" placeholder="全部" clearable style="width:120px;">
            <el-option v-for="op in opTypes" :key="op" :label="op" :value="op" />
          </el-select>
        </el-form-item>
        <el-form-item label="操作人">
          <el-select v-model="filters.operator_id" placeholder="全部" clearable style="width:140px;">
            <el-option v-for="u in users" :key="u.id" :label="u.name" :value="u.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </div>
    <div class="table-card">
      <el-table :data="list" stripe border>
        <el-table-column prop="created_at" label="操作时间" width="170" />
        <el-table-column label="类型" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="opTypeColor(row.operation_type)">{{ row.operation_type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="mat_code" label="座席垫" width="130" />
        <el-table-column label="区域" min-width="160">
          <template #default="{ row }">{{ row.area_code }} - {{ row.area_name }}</template>
        </el-table-column>
        <el-table-column prop="batch_code" label="批次" width="130" />
        <el-table-column prop="box_code" label="周转箱" width="100" />
        <el-table-column prop="prev_status" label="前状态" width="90" />
        <el-table-column prop="next_status" label="后状态" width="90" />
        <el-table-column prop="operator_name" label="操作人" width="100" />
        <el-table-column prop="remark" label="备注" min-width="140" show-overflow-tooltip />
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import request from '@/utils/request'

const list = ref([])
const areas = ref([])
const batches = ref([])
const users = ref([])
const dateRange = ref([])
const opTypes = ['收回', '清洗', '晾置', '复核', '入库']
const filters = reactive({
  area_id: '', batch_id: '', operation_type: '', operator_id: '',
  start_date: '', end_date: ''
})

function opTypeColor(op) {
  const map = { '收回': 'info', '清洗': 'warning', '晾置': '', '复核': 'danger', '入库': 'success' }
  return map[op] || ''
}

function resetFilters() {
  Object.assign(filters, { area_id: '', batch_id: '', operation_type: '', operator_id: '', start_date: '', end_date: '' })
  dateRange.value = []
  loadData()
}

async function loadSelects() {
  const [a, b, u] = await Promise.all([
    request.get('/areas'), request.get('/batches'), request.get('/users').catch(() => ({ code: 200, data: [] }))
  ])
  if (a.code === 200) areas.value = a.data
  if (b.code === 200) batches.value = b.data
  if (u.code === 200) users.value = u.data
}

async function loadData() {
  const params = { ...filters }
  if (dateRange.value && dateRange.value.length === 2) {
    params.start_date = dateRange.value[0]
    params.end_date = dateRange.value[1]
  }
  const res = await request.get('/records', { params })
  if (res.code === 200) list.value = res.data
}

onMounted(() => {
  loadSelects()
  loadData()
})
</script>
