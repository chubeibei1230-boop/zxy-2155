<template>
  <div class="page-container">
    <div class="page-header">
      <h2>
        <el-button link @click="$router.back()">
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
        批次详情 - {{ batch?.code || '' }}
      </h2>
    </div>

    <el-row :gutter="16" style="margin-bottom:16px;">
      <el-col :span="8">
        <div class="table-card">
          <h3 style="margin-top:0;">批次信息</h3>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="批次编号">{{ batch?.code }}</el-descriptions-item>
            <el-descriptions-item label="批次名称">{{ batch?.name }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag size="small" :type="batch?.status === '进行中' ? 'warning' : 'success'">{{ batch?.status }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="责任人">{{ batch?.responsible_name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="超时阈值">{{ batch?.cleaning_timeout_hours }} 小时</el-descriptions-item>
            <el-descriptions-item label="开始时间">{{ batch?.started_at }}</el-descriptions-item>
            <el-descriptions-item label="完成时间">{{ batch?.completed_at || '-' }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </el-col>
      <el-col :span="16">
        <div class="table-card" style="min-height:260px;">
          <h3 style="margin-top:0;">操作时间线</h3>
          <el-timeline v-if="timeline && timeline.length > 0">
            <el-timeline-item
              v-for="(t, i) in timeline"
              :key="i"
              :timestamp="t.created_at"
              :type="opTypeColor(t.operation_type)"
            >
              <b>{{ t.operation_type }}</b>
              <span style="margin-left:8px;color:#909399;">
                {{ t.count }} 条记录 - {{ t.operator_name }}
              </span>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-else description="暂无操作记录" :image-size="80" />
        </div>
      </el-col>
    </el-row>

    <div class="filter-bar">
      <el-form inline>
        <el-form-item label="操作类型">
          <el-select v-model="filters.operation_type" placeholder="全部" clearable style="width:140px;">
            <el-option v-for="op in opTypes" :key="op" :label="op" :value="op" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="filterRecords">筛选</el-button>
          <el-button @click="filters.operation_type='';filterRecords()">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="table-card">
      <h3 style="margin-top:0;">操作记录明细</h3>
      <el-table :data="filteredRecords" stripe border>
        <el-table-column prop="created_at" label="时间" width="170" />
        <el-table-column label="操作类型" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="opTypeColor(row.operation_type)">{{ row.operation_type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="mat_code" label="座席垫" width="130" />
        <el-table-column label="区域" min-width="160">
          <template #default="{ row }">{{ row.area_code }} - {{ row.area_name }}</template>
        </el-table-column>
        <el-table-column prop="prev_status" label="前状态" width="100" />
        <el-table-column prop="next_status" label="后状态" width="100" />
        <el-table-column prop="box_code" label="周转箱" width="100" />
        <el-table-column prop="operator_name" label="操作人" width="100" />
        <el-table-column prop="remark" label="备注" min-width="140" show-overflow-tooltip />
      </el-table>
    </div>

    <div class="table-card" style="margin-top:16px;" v-if="anomalies.length > 0">
      <div class="page-header" style="margin-bottom:12px;">
        <h3 style="margin:0;">批次关联异常（{{ anomalies.length }}）</h3>
        <div>
          <el-tag type="danger" size="small">{{ anomalies.filter(a => !a.resolved).length }} 未处理</el-tag>
          <el-tag type="warning" size="small" style="margin-left:8px;">{{ anomalies.filter(a => a.review_cause && !a.review_done).length }} 跟进中</el-tag>
          <el-tag type="success" size="small" style="margin-left:8px;">{{ anomalies.filter(a => a.review_done).length }} 已完成</el-tag>
        </div>
      </div>
      <el-table :data="anomalies" stripe border size="small">
        <el-table-column prop="created_at" label="异常时间" width="170" />
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="row.severity === 'high' ? 'danger' : 'warning'">
              {{ anomalyTypeMap[row.anomaly_type] || row.anomaly_type }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="mat_code" label="座席垫" width="110" />
        <el-table-column prop="area_name" label="区域" width="120" />
        <el-table-column prop="description" label="描述" min-width="180" show-overflow-tooltip />
        <el-table-column label="处理状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="row.resolved ? 'success' : 'danger'">
              {{ row.resolved ? '已处理' : '未处理' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="复盘状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" v-if="row.review_done" type="success">跟进完成</el-tag>
            <el-tag size="small" v-else-if="row.review_cause" type="warning">跟进中</el-tag>
            <el-tag size="small" v-else type="info">未复盘</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="review_cause" label="异常原因" min-width="140" show-overflow-tooltip />
        <el-table-column prop="review_link" label="责任环节" width="110" show-overflow-tooltip />
        <el-table-column prop="follow_up_user_name" label="跟进人" width="90" />
        <el-table-column label="截止时间" width="110">
          <template #default="{ row }">
            <span v-if="row.follow_up_due_date" :class="{ 'overdue': !row.review_done && isOverdue(row.follow_up_due_date) }">
              {{ row.follow_up_due_date }}
            </span>
            <span v-else style="color:#c0c4cc">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="review_done_remark" label="跟进说明" min-width="120" show-overflow-tooltip />
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import request from '@/utils/request'

const route = useRoute()
const batch = ref(null)
const records = ref([])
const timeline = ref([])
const anomalies = ref([])
const filters = reactive({ operation_type: '' })
const opTypes = ['收回', '清洗', '晾置', '复核', '入库']

const anomalyTypeMap = {
  cleaning_timeout: '清洗超时',
  area_cluster: '区域集中',
  box_overload: '箱子过载',
  missing_review: '复核缺失'
}

const filteredRecords = computed(() => {
  if (!filters.operation_type) return records.value
  return records.value.filter(r => r.operation_type === filters.operation_type)
})

function filterRecords() {
}

function opTypeColor(op) {
  const map = { '收回': 'info', '清洗': 'warning', '晾置': '', '复核': 'danger', '入库': 'success' }
  return map[op] || ''
}

function isOverdue(dateStr) {
  if (!dateStr) return false
  const due = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return due < now
}

async function loadData() {
  const res = await request.get(`/batches/${route.params.id}`)
  if (res.code === 200) {
    batch.value = res.data.batch
    records.value = res.data.records
    timeline.value = res.data.timeline
    anomalies.value = res.data.anomalies || []
  }
}

onMounted(loadData)
</script>

<style scoped>
.overdue {
  color: #f56c6c;
  font-weight: 600;
}
</style>
