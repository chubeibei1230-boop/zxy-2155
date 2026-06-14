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
        <el-form-item label="复盘状态">
          <el-select v-model="filters.review_done" placeholder="全部" clearable style="width:140px;">
            <el-option label="未复盘" value="0" />
            <el-option label="跟进中" value="pending" />
            <el-option label="跟进完成" value="1" />
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
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
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
        <el-table-column prop="follow_up_user_name" label="跟进人" width="90" />
        <el-table-column label="截止时间" width="110">
          <template #default="{ row }">
            <span v-if="row.follow_up_due_date" :class="{ 'overdue': !row.review_done && isOverdue(row.follow_up_due_date) }">
              {{ row.follow_up_due_date }}
            </span>
            <span v-else style="color:#c0c4cc">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openResolve(row)" v-if="!row.resolved">处理</el-button>
            <el-button type="warning" link @click="openReview(row)" v-if="!row.review_cause">复盘</el-button>
            <el-button type="warning" link @click="openReview(row, true)" v-if="row.review_cause && !row.review_done">编辑</el-button>
            <el-button type="success" link @click="openReviewComplete(row)" v-if="row.review_cause && !row.review_done">完成跟进</el-button>
            <el-button type="info" link @click="openReviewDetail(row)" v-if="row.review_cause">详情</el-button>
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

    <el-dialog v-model="reviewDialogVisible" :title="isEditReview ? '编辑复盘归因' : '复盘归因'" width="520px">
      <el-form :model="reviewForm" label-width="100px">
        <el-form-item label="异常描述">
          <span>{{ currentRow?.description }}</span>
        </el-form-item>
        <el-form-item label="异常原因" required>
          <el-input v-model="reviewForm.review_cause" type="textarea" :rows="3" placeholder="请分析异常产生的原因" />
        </el-form-item>
        <el-form-item label="责任环节">
          <el-input v-model="reviewForm.review_link" placeholder="如：清洗环节/复核环节/运输环节" />
        </el-form-item>
        <el-form-item label="跟进人">
          <el-select v-model="reviewForm.follow_up_user_id" placeholder="请选择跟进人" clearable style="width:100%;">
            <el-option v-for="u in users" :key="u.id" :label="u.name" :value="u.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="预计完成时间">
          <el-date-picker v-model="reviewForm.follow_up_due_date" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" style="width:100%;" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="doReview">确认保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="reviewCompleteDialogVisible" title="完成复盘跟进" width="480px">
      <el-form label-width="100px">
        <el-form-item label="异常原因">
          <span>{{ currentRow?.review_cause }}</span>
        </el-form-item>
        <el-form-item label="责任环节">
          <span>{{ currentRow?.review_link || '-' }}</span>
        </el-form-item>
        <el-form-item label="跟进人">
          <span>{{ currentRow?.follow_up_user_name || '-' }}</span>
        </el-form-item>
        <el-form-item label="跟进完成说明">
          <el-input v-model="reviewCompleteRemark" type="textarea" :rows="3" placeholder="请填写跟进完成说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewCompleteDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="doReviewComplete">确认完成</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="reviewDetailDialogVisible" title="复盘详情" width="520px">
      <el-descriptions :column="1" border size="small">
        <el-descriptions-item label="异常描述">{{ currentRow?.description }}</el-descriptions-item>
        <el-descriptions-item label="异常原因">{{ currentRow?.review_cause || '-' }}</el-descriptions-item>
        <el-descriptions-item label="责任环节">{{ currentRow?.review_link || '-' }}</el-descriptions-item>
        <el-descriptions-item label="跟进人">{{ currentRow?.follow_up_user_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="预计完成时间">{{ currentRow?.follow_up_due_date || '-' }}</el-descriptions-item>
        <el-descriptions-item label="复盘人">{{ currentRow?.reviewed_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="复盘时间">{{ currentRow?.reviewed_at || '-' }}</el-descriptions-item>
        <el-descriptions-item label="复盘状态">
          <el-tag size="small" v-if="currentRow?.review_done" type="success">跟进完成</el-tag>
          <el-tag size="small" v-else-if="currentRow?.review_cause" type="warning">跟进中</el-tag>
          <el-tag size="small" v-else type="info">未复盘</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="跟进完成时间" v-if="currentRow?.review_done">{{ currentRow?.review_done_at }}</el-descriptions-item>
        <el-descriptions-item label="跟进完成说明" v-if="currentRow?.review_done">{{ currentRow?.review_done_remark || '-' }}</el-descriptions-item>
        <el-descriptions-item label="处理状态">
          <el-tag size="small" :type="currentRow?.resolved ? 'success' : 'danger'">
            {{ currentRow?.resolved ? '已处理' : '未处理' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="处理人" v-if="currentRow?.resolved">{{ currentRow?.resolved_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="处理备注" v-if="currentRow?.resolved">{{ currentRow?.resolved_remark || '-' }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="reviewDetailDialogVisible = false">关闭</el-button>
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
const reviewDialogVisible = ref(false)
const reviewCompleteDialogVisible = ref(false)
const reviewDetailDialogVisible = ref(false)
const reviewCompleteRemark = ref('')
const isEditReview = ref(false)
const users = ref([])
const typeMap = {
  cleaning_timeout: '清洗超时',
  area_cluster: '区域集中',
  box_overload: '箱子过载',
  missing_review: '复核缺失'
}
const filters = reactive({
  resolved: '',
  anomaly_type: '',
  review_done: '',
  start_date: '',
  end_date: ''
})
const reviewForm = reactive({
  review_cause: '',
  review_link: '',
  follow_up_user_id: null,
  follow_up_due_date: ''
})

function isOverdue(dateStr) {
  if (!dateStr) return false
  const due = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return due < now
}

function resetFilters() {
  Object.assign(filters, { resolved: '', anomaly_type: '', review_done: '', start_date: '', end_date: '' })
  dateRange.value = []
  loadData()
}

async function loadUsers() {
  const res = await request.get('/users')
  if (res.code === 200) users.value = res.data
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

function openReview(row, edit = false) {
  currentRow.value = row
  isEditReview.value = edit
  Object.assign(reviewForm, {
    review_cause: row.review_cause || '',
    review_link: row.review_link || '',
    follow_up_user_id: row.follow_up_user_id || null,
    follow_up_due_date: row.follow_up_due_date || ''
  })
  reviewDialogVisible.value = true
}

async function doReview() {
  if (!reviewForm.review_cause) {
    ElMessage.warning('请填写异常原因')
    return
  }
  const api = isEditReview.value
    ? request.put(`/anomalies/${currentRow.value.id}/review`, reviewForm)
    : request.post(`/anomalies/${currentRow.value.id}/review`, reviewForm)
  const res = await api
  if (res.code === 200) {
    ElMessage.success(isEditReview.value ? '更新成功' : '复盘归因已保存')
    reviewDialogVisible.value = false
    loadData()
  }
}

function openReviewComplete(row) {
  currentRow.value = row
  reviewCompleteRemark.value = ''
  reviewCompleteDialogVisible.value = true
}

async function doReviewComplete() {
  const res = await request.post(`/anomalies/${currentRow.value.id}/review-complete`, {
    remark: reviewCompleteRemark.value
  })
  if (res.code === 200) {
    ElMessage.success('复盘跟进已完成')
    reviewCompleteDialogVisible.value = false
    loadData()
  }
}

function openReviewDetail(row) {
  currentRow.value = row
  reviewDetailDialogVisible.value = true
}

function exportExcel() {
  window.open('/api/export/anomalies', '_blank')
}

onMounted(() => {
  loadUsers()
  loadData()
})
</script>

<style scoped>
.overdue {
  color: #f56c6c;
  font-weight: 600;
}
</style>
