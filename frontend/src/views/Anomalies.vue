<template>
  <div class="page-container">
    <div class="page-header">
      <h2>异常记录</h2>
      <div>
        <el-button type="primary" @click="exportExcel">
          <el-icon><Download /></el-icon>导出Excel
        </el-button>
      </div>
    </div>
    <div class="filter-bar">
      <el-form inline>
        <el-form-item label="处理状态">
          <el-select v-model="filters.resolved" placeholder="全部" clearable style="width:140px;">
            <el-option label="未处理" :value="0" />
            <el-option label="已处理" :value="1" />
          </el-select>
        </el-form-item>
        <el-form-item label="异常类型">
          <el-select v-model="filters.anomaly_type" placeholder="全部" clearable style="width:140px;">
            <el-option label="清洗超时" value="cleaning_timeout" />
            <el-option label="区域集中" value="area_cluster" />
            <el-option label="箱子过载" value="box_overload" />
            <el-option label="复核缺失" value="missing_review" />
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
        <el-table-column prop="created_at" label="异常时间" width="170" />
        <el-table-column label="类型" width="110">
          <template #default="{ row }">
            <el-tag size="small" :type="row.severity === 'high' ? 'danger' : 'warning'">
              {{ typeMap[row.anomaly_type] || row.anomaly_type }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="严重程度" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="row.severity === 'high' ? 'danger' : 'warning'">
              {{ row.severity === 'high' ? '高' : '中' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="mat_code" label="座席垫" width="110" />
        <el-table-column prop="area_name" label="区域" width="130" />
        <el-table-column prop="batch_code" label="批次" width="120" />
        <el-table-column prop="box_code" label="周转箱" width="100" />
        <el-table-column prop="description" label="描述" min-width="240" show-overflow-tooltip />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="row.resolved ? 'success' : 'danger'">
              {{ row.resolved ? '已处理' : '未处理' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="resolved_name" label="处理人" width="100" />
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              @click="openResolve(row)"
              v-if="!row.resolved"
            >处理</el-button>
            <span v-if="row.resolved_remark" style="color:#909399;">
              {{ row.resolved_remark }}
            </span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" title="处理异常" width="420px">
      <el-form label-width="80px">
        <el-form-item label="异常描述">
          <span>{{ currentRow?.description }}</span>
        </el-form-item>
        <el-form-item label="处理备注">
          <el-input v-model="resolveRemark" type="textarea" :rows="3" placeholder="请填写处理说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="doResolve">确认处理</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import request from '@/utils/request'

const list = ref([])
const dateRange = ref([])
const dialogVisible = ref(false)
const currentRow = ref(null)
const resolveRemark = ref('')
const typeMap = {
  cleaning_timeout: '清洗超时',
  area_cluster: '区域集中',
  box_overload: '箱子过载',
  missing_review: '复核缺失'
}
const filters = reactive({
  resolved: '',
  anomaly_type: '',
  start_date: '',
  end_date: ''
})

function resetFilters() {
  Object.assign(filters, { resolved: '', anomaly_type: '', start_date: '', end_date: '' })
  dateRange.value = []
  loadData()
}

async function loadData() {
  const params = { ...filters }
  if (dateRange.value && dateRange.value.length === 2) {
    params.start_date = dateRange.value[0]
    params.end_date = dateRange.value[1]
  }
  const res = await request.get('/anomalies', { params })
  if (res.code === 200) list.value = res.data
}

function openResolve(row) {
  currentRow.value = row
  resolveRemark.value = ''
  dialogVisible.value = true
}

async function doResolve() {
  const res = await request.post(`/anomalies/${currentRow.value.id}/resolve`, {
    remark: resolveRemark.value
  })
  if (res.code === 200) {
    ElMessage.success('处理成功')
    dialogVisible.value = false
    loadData()
  }
}

function exportExcel() {
  window.open('/api/export/anomalies', '_blank')
}

onMounted(loadData)
</script>
