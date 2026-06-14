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
const filters = reactive({ operation_type: '' })
const opTypes = ['收回', '清洗', '晾置', '复核', '入库']

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

async function loadData() {
  const res = await request.get(`/batches/${route.params.id}`)
  if (res.code === 200) {
    batch.value = res.data.batch
    records.value = res.data.records
    timeline.value = res.data.timeline
  }
}

onMounted(loadData)
</script>
