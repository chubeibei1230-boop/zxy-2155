<template>
  <div class="page-container">
    <div class="page-header">
      <h2>异常闭环管理</h2>
      <div>
        <el-button type="primary" @click="exportExcel">
          <el-icon><Download /></el-icon>导出Excel
        </el-button>
      </div>
    </div>
    <div class="filter-bar">
      <el-form inline>
        <el-form-item label="处理状态">
          <el-select v-model="filters.resolved" placeholder="全部" clearable style="width:120px;">
            <el-option label="未处理" :value="0" />
            <el-option label="已处理" :value="1" />
          </el-select>
        </el-form-item>
        <el-form-item label="异常类型">
          <el-select v-model="filters.anomaly_type" placeholder="全部" clearable style="width:120px;">
            <el-option label="清洗超时" value="cleaning_timeout" />
            <el-option label="区域集中" value="area_cluster" />
            <el-option label="箱子过载" value="box_overload" />
            <el-option label="复核缺失" value="missing_review" />
          </el-select>
        </el-form-item>
        <el-form-item label="跟进状态">
          <el-select v-model="filters.review_done" placeholder="全部" clearable style="width:120px;">
            <el-option label="待处理" value="0" />
            <el-option label="跟进中" value="pending" />
            <el-option label="已逾期" value="overdue" />
            <el-option label="跟进完成" value="1" />
          </el-select>
        </el-form-item>
        <el-form-item label="批次">
          <el-select v-model="filters.batch_id" placeholder="全部" clearable style="width:140px;">
            <el-option v-for="b in batches" :key="b.id" :label="b.code + ' ' + b.name" :value="b.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="区域">
          <el-select v-model="filters.area_id" placeholder="全部" clearable style="width:140px;">
            <el-option v-for="a in areas" :key="a.id" :label="a.name" :value="a.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="操作人">
          <el-select v-model="filters.operator_id" placeholder="全部" clearable style="width:120px;">
            <el-option v-for="u in users" :key="u.id" :label="u.name" :value="u.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="责任人">
          <el-select v-model="filters.follow_up_user_id" placeholder="全部" clearable style="width:120px;">
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
      <el-table :data="list" stripe border @row-click="goDetail">
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
        <el-table-column prop="operator_name" label="操作人" width="90" />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column label="处理状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="row.resolved ? 'success' : 'danger'">
              {{ row.resolved ? '已处理' : '未处理' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="闭环状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" v-if="row.review_done" type="success">跟进完成</el-tag>
            <el-tag size="small" v-else-if="row.review_cause && !row.review_done && isOverdue(row.follow_up_due_date)" type="danger">已逾期</el-tag>
            <el-tag size="small" v-else-if="row.review_cause" type="warning">跟进中</el-tag>
            <el-tag size="small" v-else type="info">未复盘</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="follow_up_user_name" label="责任人" width="90" />
        <el-table-column label="截止时间" width="110">
          <template #default="{ row }">
            <span v-if="row.follow_up_due_date" :class="{ 'overdue': !row.review_done && isOverdue(row.follow_up_due_date) }">
              {{ row.follow_up_due_date }}
            </span>
            <span v-else style="color:#c0c4cc">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click.stop="goDetail(row)">查看</el-button>
            <el-button type="primary" link @click.stop="openResolve(row)" v-if="!row.resolved">处理</el-button>
            <el-button type="warning" link @click.stop="openReview(row)" v-if="!row.review_cause">复盘</el-button>
            <el-button type="warning" link @click.stop="openReview(row, true)" v-if="row.review_cause && !row.review_done">编辑</el-button>
            <el-button type="success" link @click.stop="openReviewComplete(row)" v-if="row.review_cause && !row.review_done">完成</el-button>
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
        <el-form-item label="跟进完成说明" required>
          <el-input v-model="reviewCompleteRemark" type="textarea" :rows="3" placeholder="请填写跟进完成说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewCompleteDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="doReviewComplete">确认完成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import request from '@/utils/request'

const route = useRoute()
const router = useRouter()

const list = ref([])
const dateRange = ref([])
const dialogVisible = ref(false)
const currentRow = ref(null)
const resolveRemark = ref('')
const reviewDialogVisible = ref(false)
const reviewCompleteDialogVisible = ref(false)
const reviewCompleteRemark = ref('')
const isEditReview = ref(false)
const users = ref([])
const batches = ref([])
const areas = ref([])
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
  batch_id: '',
  area_id: '',
  operator_id: '',
  follow_up_user_id: '',
  start_date: '',
  end_date: ''
})
const reviewForm = reactive({
  review_cause: '',
  review_link: '',
  follow_up_user_id: null,
  follow_up_due_date: ''
})

function emptyFilters() {
  return { resolved: '', anomaly_type: '', review_done: '', batch_id: '', area_id: '', operator_id: '', follow_up_user_id: '', start_date: '', end_date: '' }
}

function isOverdue(dateStr) {
  if (!dateStr) return false
  const due = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return due < now
}

function resetFilters() {
  Object.assign(filters, emptyFilters())
  dateRange.value = []
  loadData()
}

async function loadUsers() {
  const res = await request.get('/users/brief')
  if (res.code === 200) users.value = res.data
}

async function loadBatches() {
  const res = await request.get('/batches')
  if (res.code === 200) batches.value = res.data
}

async function loadAreas() {
  const res = await request.get('/areas')
  if (res.code === 200) areas.value = res.data
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

function goDetail(row) {
  if (row && row.id) {
    router.push(`/anomalies/${row.id}`)
  }
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
  if (!reviewCompleteRemark.value) {
    ElMessage.warning('请填写跟进完成说明')
    return
  }
  const res = await request.post(`/anomalies/${currentRow.value.id}/review-complete`, {
    remark: reviewCompleteRemark.value
  })
  if (res.code === 200) {
    ElMessage.success('复盘跟进已完成')
    reviewCompleteDialogVisible.value = false
    loadData()
  }
}

async function exportExcel() {
  const res = await request.get('/export/anomalies', { responseType: 'blob' })
  const url = URL.createObjectURL(new Blob([res]))
  const link = document.createElement('a')
  link.href = url
  link.download = '异常记录.xlsx'
  link.click()
  URL.revokeObjectURL(url)
}

function applyQueryFilters(q) {
  Object.assign(filters, emptyFilters())
  dateRange.value = []
  if (q.review_done !== undefined && q.review_done !== '') filters.review_done = String(q.review_done)
  if (q.batch_id) filters.batch_id = Number(q.batch_id)
  if (q.area_id) filters.area_id = Number(q.area_id)
  if (q.follow_up_user_id) filters.follow_up_user_id = Number(q.follow_up_user_id)
  if (q.resolved !== undefined && q.resolved !== '') filters.resolved = Number(q.resolved)
}

onMounted(() => {
  applyQueryFilters(route.query)
  loadUsers()
  loadBatches()
  loadAreas()
  loadData()
})

watch(() => route.query, () => {
  if (route.path === '/anomalies') {
    applyQueryFilters(route.query)
    loadData()
  }
})
</script>

<style scoped>
.overdue {
  color: #f56c6c;
  font-weight: 600;
}
.el-table >>> tbody tr {
  cursor: pointer;
}
</style>
