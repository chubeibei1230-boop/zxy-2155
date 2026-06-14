<template>
  <div class="page-container">
    <div class="page-header">
      <h2>异常复盘整改看板</h2>
      <div>
        <el-button type="primary" @click="exportExcel">
          <el-icon><Download /></el-icon>导出Excel
        </el-button>
      </div>
    </div>

    <div class="filter-bar">
      <el-form inline>
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
        <el-form-item label="异常类型">
          <el-select v-model="filters.anomaly_type" placeholder="全部" clearable style="width:120px;">
            <el-option label="清洗超时" value="cleaning_timeout" />
            <el-option label="区域集中" value="area_cluster" />
            <el-option label="箱子过载" value="box_overload" />
            <el-option label="复核缺失" value="missing_review" />
          </el-select>
        </el-form-item>
        <el-form-item label="责任人">
          <el-select v-model="filters.follow_up_user_id" placeholder="全部" clearable style="width:120px;">
            <el-option v-for="u in users" :key="u.id" :label="u.name" :value="u.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="处理状态">
          <el-select v-model="filters.resolved" placeholder="全部" clearable style="width:100px;">
            <el-option label="未处理" :value="0" />
            <el-option label="已处理" :value="1" />
          </el-select>
        </el-form-item>
        <el-form-item label="跟进状态">
          <el-select v-model="filters.review_done" placeholder="全部" clearable style="width:100px;">
            <el-option label="待处理" value="0" />
            <el-option label="跟进中" value="pending" />
            <el-option label="已逾期" value="overdue" />
            <el-option label="已闭环" value="1" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
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

    <div class="stats-row">
      <div class="stat-card stat-total" @click="filterByStatus('all')">
        <div class="stat-top">
          <div class="stat-icon">
            <el-icon :size="22"><DataBoard /></el-icon>
          </div>
          <span class="stat-label-text">异常总数</span>
        </div>
        <div class="stat-value">{{ boardData.stats?.total || 0 }}</div>
      </div>
      <div class="stat-card stat-pending" @click="filterByStatus('pending')">
        <div class="stat-top">
          <div class="stat-icon">
            <el-icon :size="22"><Clock /></el-icon>
          </div>
          <span class="stat-label-text">未处理</span>
        </div>
        <div class="stat-value">{{ boardData.stats?.pending || 0 }}</div>
      </div>
      <div class="stat-card stat-following" @click="filterByStatus('following')">
        <div class="stat-top">
          <div class="stat-icon">
            <el-icon :size="22"><Promotion /></el-icon>
          </div>
          <span class="stat-label-text">跟进中</span>
        </div>
        <div class="stat-value">{{ boardData.stats?.following || 0 }}</div>
      </div>
      <div class="stat-card stat-overdue" @click="filterByStatus('overdue')">
        <div class="stat-top">
          <div class="stat-icon">
            <el-icon :size="22"><WarningFilled /></el-icon>
          </div>
          <span class="stat-label-text">已逾期</span>
        </div>
        <div class="stat-value">{{ boardData.stats?.overdue || 0 }}</div>
      </div>
      <div class="stat-card stat-completed" @click="filterByStatus('completed')">
        <div class="stat-top">
          <div class="stat-icon">
            <el-icon :size="22"><CircleCheckFilled /></el-icon>
          </div>
          <span class="stat-label-text">已闭环</span>
        </div>
        <div class="stat-value">{{ boardData.stats?.completed || 0 }}</div>
      </div>
    </div>

    <el-row :gutter="16" style="margin-bottom:16px;">
      <el-col :span="8">
        <div class="table-card rank-card">
          <div class="rank-header">
            <h3><el-icon style="color:#409eff;"><Location /></el-icon> 区域异常排行</h3>
          </div>
          <div class="rank-list">
            <div v-for="(item, index) in boardData.areaRank || []" :key="item.id" class="rank-item" @click="filterByArea(item.id)">
              <div class="rank-no" :class="'rank-' + (index + 1)">{{ index + 1 }}</div>
              <div class="rank-name">{{ item.name }}</div>
              <div class="rank-count">
                <span class="count-num">{{ item.count }}</span>
                <span class="count-unit">件</span>
              </div>
            </div>
            <el-empty v-if="!boardData.areaRank || boardData.areaRank.length === 0" description="暂无数据" :image-size="60" />
          </div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="table-card rank-card">
          <div class="rank-header">
            <h3><el-icon style="color:#e6a23c;"><User /></el-icon> 责任人异常排行</h3>
          </div>
          <div class="rank-list">
            <div v-for="(item, index) in boardData.userRank || []" :key="item.id" class="rank-item" @click="filterByUser(item.id)">
              <div class="rank-no" :class="'rank-' + (index + 1)">{{ index + 1 }}</div>
              <div class="rank-name">{{ item.name }}</div>
              <div class="rank-count">
                <span class="count-num">{{ item.count }}</span>
                <span class="count-unit">件</span>
              </div>
            </div>
            <el-empty v-if="!boardData.userRank || boardData.userRank.length === 0" description="暂无数据" :image-size="60" />
          </div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="table-card rank-card">
          <div class="rank-header">
            <h3><el-icon style="color:#f56c6c;"><Warning /></el-icon> 异常类型分布</h3>
          </div>
          <div class="rank-list">
            <div v-for="(item, index) in boardData.typeRank || []" :key="item.anomaly_type" class="rank-item" @click="filterByType(item.anomaly_type)">
              <div class="rank-no" :class="'rank-' + (index + 1)">{{ index + 1 }}</div>
              <div class="rank-name">{{ typeMap[item.anomaly_type] || item.anomaly_type }}</div>
              <div class="rank-count">
                <span class="count-num">{{ item.count }}</span>
                <span class="count-unit">件</span>
              </div>
            </div>
            <el-empty v-if="!boardData.typeRank || boardData.typeRank.length === 0" description="暂无数据" :image-size="60" />
          </div>
        </div>
      </el-col>
    </el-row>

    <div class="table-card">
      <div class="page-header" style="margin-bottom:12px;">
        <h3 style="margin:0;">异常明细列表</h3>
        <span style="color:#909399;font-size:13px;">共 {{ boardData.list?.length || 0 }} 条记录</span>
      </div>
      <el-table :data="boardData.list || []" stripe border max-height="520" @row-click="goAnomalyDetail">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column label="关联批次" width="110">
          <template #default="{ row }">
            <span v-if="row.batch_code" class="link-text" @click.stop="goBatchDetail(row)">{{ row.batch_code }}</span>
            <span v-else style="color:#c0c4cc">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="mat_code" label="座席垫" width="110" />
        <el-table-column prop="area_name" label="区域" width="120" />
        <el-table-column label="异常类型" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="row.severity === 'high' ? 'danger' : 'warning'">
              {{ typeMap[row.anomaly_type] || row.anomaly_type }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="异常描述" min-width="180" show-overflow-tooltip />
        <el-table-column prop="review_cause" label="复盘原因" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.review_cause">{{ row.review_cause }}</span>
            <span v-else style="color:#c0c4cc">未复盘</span>
          </template>
        </el-table-column>
        <el-table-column prop="review_link" label="责任环节" width="100">
          <template #default="{ row }">
            <span v-if="row.review_link">{{ row.review_link }}</span>
            <span v-else style="color:#c0c4cc">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="follow_up_user_name" label="跟进人" width="90">
          <template #default="{ row }">
            <span v-if="row.follow_up_user_name">{{ row.follow_up_user_name }}</span>
            <span v-else style="color:#c0c4cc">-</span>
          </template>
        </el-table-column>
        <el-table-column label="截止时间" width="110">
          <template #default="{ row }">
            <span v-if="row.follow_up_due_date" :class="{ 'overdue': !row.review_done && isOverdue(row.follow_up_due_date) }">
              {{ row.follow_up_due_date }}
            </span>
            <span v-else style="color:#c0c4cc">-</span>
          </template>
        </el-table-column>
        <el-table-column label="闭环状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" v-if="row.review_done" type="success">已闭环</el-tag>
            <el-tag size="small" v-else-if="row.review_cause && !row.review_done && isOverdue(row.follow_up_due_date)" type="danger">已逾期</el-tag>
            <el-tag size="small" v-else-if="row.review_cause" type="warning">跟进中</el-tag>
            <el-tag size="small" v-else type="info">待处理</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="review_done_remark" label="闭环结果" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.review_done_remark">{{ row.review_done_remark }}</span>
            <span v-else style="color:#c0c4cc">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click.stop="goAnomalyDetail(row)">异常详情</el-button>
            <el-button type="primary" link size="small" @click.stop="goBatchDetail(row)" v-if="row.batch_id">批次详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Download, DataBoard, Clock, Promotion, WarningFilled,
  CircleCheckFilled, Location, User, Warning
} from '@element-plus/icons-vue'
import request from '@/utils/request'

const router = useRouter()

const boardData = reactive({})
const dateRange = ref([])
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
  batch_id: '',
  area_id: '',
  anomaly_type: '',
  follow_up_user_id: '',
  resolved: '',
  review_done: '',
  start_date: '',
  end_date: ''
})

function emptyFilters() {
  return {
    batch_id: '', area_id: '', anomaly_type: '',
    follow_up_user_id: '', resolved: '', review_done: '',
    start_date: '', end_date: ''
  }
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

function filterByStatus(status) {
  filters.resolved = ''
  filters.review_done = ''
  if (status === 'pending') {
    filters.resolved = 0
    filters.review_done = '0'
  } else if (status === 'following') {
    filters.review_done = 'pending'
  } else if (status === 'overdue') {
    filters.review_done = 'overdue'
  } else if (status === 'completed') {
    filters.review_done = '1'
  }
  loadData()
}

function filterByArea(areaId) {
  filters.area_id = areaId
  loadData()
}

function filterByUser(userId) {
  filters.follow_up_user_id = userId
  loadData()
}

function filterByType(type) {
  filters.anomaly_type = type
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
  const res = await request.get('/anomaly-board', { params })
  if (res.code === 200) {
    Object.assign(boardData, res.data)
  }
}

function goAnomalyDetail(row) {
  if (row && row.id) {
    router.push(`/anomalies/${row.id}`)
  }
}

function goBatchDetail(row) {
  if (row && row.batch_id) {
    router.push(`/batches/${row.batch_id}`)
  }
}

async function exportExcel() {
  const params = { ...filters }
  if (dateRange.value && dateRange.value.length === 2) {
    params.start_date = dateRange.value[0]
    params.end_date = dateRange.value[1]
  }
  const res = await request.get('/export/anomalies', { params, responseType: 'blob' })
  const url = URL.createObjectURL(new Blob([res]))
  const link = document.createElement('a')
  link.href = url
  link.download = '异常复盘整改看板.xlsx'
  link.click()
  URL.revokeObjectURL(url)
}

onMounted(() => {
  loadUsers()
  loadBatches()
  loadAreas()
  loadData()
})
</script>

<style scoped>
.stats-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.stat-card {
  background: #fff;
  padding: 18px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  border-left: 4px solid transparent;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-top {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.stat-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  flex-shrink: 0;
}

.stat-label-text {
  font-size: 14px;
  color: #606266;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  line-height: 1.2;
  padding-left: 46px;
}

.stat-total {
  border-left-color: #409eff;
}
.stat-total .stat-icon {
  background: #ecf5ff;
  color: #409eff;
}
.stat-total .stat-value {
  color: #409eff;
}

.stat-pending {
  border-left-color: #909399;
}
.stat-pending .stat-icon {
  background: #f4f4f5;
  color: #909399;
}
.stat-pending .stat-value {
  color: #909399;
}

.stat-following {
  border-left-color: #e6a23c;
}
.stat-following .stat-icon {
  background: #fdf6ec;
  color: #e6a23c;
}
.stat-following .stat-value {
  color: #e6a23c;
}

.stat-overdue {
  border-left-color: #f56c6c;
}
.stat-overdue .stat-icon {
  background: #fef0f0;
  color: #f56c6c;
}
.stat-overdue .stat-value {
  color: #f56c6c;
}

.stat-completed {
  border-left-color: #67c23a;
}
.stat-completed .stat-icon {
  background: #f0f9eb;
  color: #67c23a;
}
.stat-completed .stat-value {
  color: #67c23a;
}

.rank-card {
  height: 100%;
}

.rank-header {
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ebeef5;
}

.rank-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.rank-list {
  max-height: 320px;
  overflow-y: auto;
}

.rank-item {
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px dashed #f2f2f2;
  cursor: pointer;
  transition: background 0.2s;
}

.rank-item:hover {
  background: #f5f7fa;
  margin: 0 -8px;
  padding-left: 8px;
  padding-right: 8px;
  border-radius: 4px;
}

.rank-item:last-child {
  border-bottom: none;
}

.rank-no {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #f4f4f5;
  color: #909399;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
}

.rank-no.rank-1 {
  background: #f56c6c;
  color: #fff;
}

.rank-no.rank-2 {
  background: #e6a23c;
  color: #fff;
}

.rank-no.rank-3 {
  background: #67c23a;
  color: #fff;
}

.rank-name {
  flex: 1;
  font-size: 14px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-count {
  text-align: right;
  flex-shrink: 0;
}

.count-num {
  font-size: 18px;
  font-weight: 700;
  color: #f56c6c;
  margin-right: 2px;
}

.count-unit {
  font-size: 12px;
  color: #909399;
}

.overdue {
  color: #f56c6c;
  font-weight: 600;
}

.link-text {
  color: #409eff;
  cursor: pointer;
}

.link-text:hover {
  text-decoration: underline;
}

.el-table >>> tbody tr {
  cursor: pointer;
}
</style>
