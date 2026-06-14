<template>
  <div class="page-container">
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-value" style="color:#409eff">{{ stats.total || 0 }}</div>
        <div class="stat-label">座席垫总数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:#e6a23c">{{ stats.cleaning || 0 }}</div>
        <div class="stat-label">清洗中</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:#f56c6c">{{ stats.pending_review || 0 }}</div>
        <div class="stat-label">待复核</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:#67c23a">{{ stats.available || 0 }}</div>
        <div class="stat-label">可入库</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:#909399">{{ stats.anomaly || 0 }}</div>
        <div class="stat-label">异常留置</div>
      </div>
    </div>

    <div class="stats-row" style="margin-bottom:16px;">
      <div class="stat-card anomaly-card" style="cursor:pointer;border-left:4px solid #f56c6c;" @click="goAnomaliesByStatus('pending')">
        <div class="anomaly-icon" style="background:#fef0f0;color:#f56c6c;">
          <el-icon :size="22"><Clock /></el-icon>
        </div>
        <div class="anomaly-info">
          <div class="stat-value" style="color:#f56c6c">{{ anomalyStats.pending || 0 }}</div>
          <div class="stat-label">待处理异常</div>
        </div>
      </div>
      <div class="stat-card anomaly-card" style="cursor:pointer;border-left:4px solid #e6a23c;" @click="goAnomaliesByStatus('following')">
        <div class="anomaly-icon" style="background:#fdf6ec;color:#e6a23c;">
          <el-icon :size="22"><Promotion /></el-icon>
        </div>
        <div class="anomaly-info">
          <div class="stat-value" style="color:#e6a23c">{{ anomalyStats.following || 0 }}</div>
          <div class="stat-label">跟进中异常</div>
        </div>
      </div>
      <div class="stat-card anomaly-card" style="cursor:pointer;border-left:4px solid #dc2626;" @click="goAnomaliesByStatus('overdue')">
        <div class="anomaly-icon" style="background:#fef2f2;color:#dc2626;">
          <el-icon :size="22"><WarningFilled /></el-icon>
        </div>
        <div class="anomaly-info">
          <div class="stat-value" style="color:#dc2626">{{ anomalyStats.overdue || 0 }}</div>
          <div class="stat-label">已逾期异常</div>
        </div>
      </div>
      <div class="stat-card anomaly-card" style="cursor:pointer;border-left:4px solid #67c23a;" @click="goAnomaliesByStatus('completed')">
        <div class="anomaly-icon" style="background:#f0f9eb;color:#67c23a;">
          <el-icon :size="22"><CircleCheckFilled /></el-icon>
        </div>
        <div class="anomaly-info">
          <div class="stat-value" style="color:#67c23a">{{ anomalyStats.completed || 0 }}</div>
          <div class="stat-label">已闭环异常</div>
        </div>
      </div>
      <div class="stat-card anomaly-card" style="border-left:4px solid #909399;">
        <div class="anomaly-icon" style="background:#f4f4f5;color:#909399;">
          <el-icon :size="22"><DataBoard /></el-icon>
        </div>
        <div class="anomaly-info">
          <div class="stat-value" style="color:#909399">{{ anomalyStats.total || 0 }}</div>
          <div class="stat-label">异常总数</div>
        </div>
      </div>
    </div>

    <el-row :gutter="16" style="margin-bottom:16px;">
      <el-col :span="14">
        <div class="table-card">
          <div class="page-header">
            <h2>清洗批次进度</h2>
          </div>
          <el-table :data="dashboard.batchProgress || []" stripe>
            <el-table-column prop="code" label="批次编号" width="120" />
            <el-table-column prop="name" label="批次名称" min-width="140" />
            <el-table-column label="进度" min-width="200">
              <template #default="{ row }">
                <div v-if="row.mat_count > 0">
                  <el-progress :percentage="Math.round((row.storage_count / row.mat_count) * 100)" :stroke-width="12" />
                  <div style="font-size:12px;color:#909399;margin-top:4px;">
                    收回{{ row.collect_count }} | 清洗{{ row.cleaning_count }} | 晾置{{ row.drying_count }} | 复核{{ row.review_count }} | 入库{{ row.storage_count }}
                  </div>
                </div>
                <span v-else style="color:#c0c4cc">暂无数据</span>
              </template>
            </el-table-column>
            <el-table-column prop="responsible_name" label="责任人" width="100" />
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button type="primary" link @click="goBatchDetail(row.id)">详情</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-col>
      <el-col :span="10">
        <div class="table-card" style="height:100%;">
          <div class="page-header">
            <h2>区域异常分布</h2>
          </div>
          <div ref="areaChartRef" style="width:100%;height:320px;"></div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-bottom:16px;">
      <el-col :span="12">
        <div class="table-card">
          <div class="page-header">
            <h2 style="color:#dc2626;">
              <el-icon><WarningFilled /></el-icon>
              <span style="margin-left:4px;">逾期异常提示</span>
            </h2>
            <el-button type="danger" link @click="goAnomaliesByStatus('overdue')" v-if="(dashboard.overdueAnomalies || []).length > 0">查看全部</el-button>
          </div>
          <el-table :data="dashboard.overdueAnomalies || []" stripe max-height="300" v-if="(dashboard.overdueAnomalies || []).length > 0" @row-click="goAnomalyDetail">
            <el-table-column label="类型" width="90">
              <template #default="{ row }">
                <el-tag size="small" :type="row.severity === 'high' ? 'danger' : 'warning'">{{ anomalyTypeMap[row.anomaly_type] }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" min-width="140" show-overflow-tooltip />
            <el-table-column prop="follow_up_user_name" label="跟进人" width="80" />
            <el-table-column label="截止时间" width="100">
              <template #default="{ row }">
                <span class="overdue">{{ row.follow_up_due_date }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="60">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click.stop="goAnomalyDetail(row)">详情</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-else description="暂无逾期异常" :image-size="60" />
        </div>
      </el-col>
      <el-col :span="12">
        <div class="table-card" style="height:100%;">
          <div class="page-header">
            <h2>待复核列表</h2>
            <el-button type="primary" link @click="goOperation">去处理</el-button>
          </div>
          <el-table :data="dashboard.pendingReviews || []" stripe max-height="300">
            <el-table-column prop="code" label="座席垫编号" width="140" />
            <el-table-column label="区域">
              <template #default="{ row }">{{ row.area_code }} - {{ row.area_name }}</template>
            </el-table-column>
            <el-table-column prop="batch_code" label="所在批次" width="120" />
          </el-table>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :span="14">
        <div class="table-card">
          <div class="page-header">
            <h2>近7天操作趋势</h2>
          </div>
          <div ref="trendChartRef" style="width:100%;height:300px;"></div>
        </div>
      </el-col>
      <el-col :span="10">
        <div class="table-card" style="height:100%;">
          <div class="page-header">
            <h2>未完成跟进事项</h2>
            <el-button type="warning" link @click="goAnomaliesByStatus('following')" v-if="(dashboard.pendingFollowUps || []).length > 0">查看全部</el-button>
          </div>
          <el-table :data="dashboard.pendingFollowUps || []" stripe max-height="340" v-if="(dashboard.pendingFollowUps || []).length > 0" @row-click="goAnomalyDetail">
            <el-table-column label="类型" width="80">
              <template #default="{ row }">
                <el-tag size="small" :type="row.severity === 'high' ? 'danger' : 'warning'">{{ anomalyTypeMap[row.anomaly_type] }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" min-width="150" show-overflow-tooltip />
            <el-table-column prop="follow_up_user_name" label="跟进人" width="80" />
            <el-table-column label="截止" width="100">
              <template #default="{ row }">
                <span :class="{ 'overdue': row.follow_up_due_date && isOverdue(row.follow_up_due_date) }">
                  {{ row.follow_up_due_date || '-' }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="60">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click.stop="goAnomalyDetail(row)">详情</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-else description="暂无待跟进事项" :image-size="60" />
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { Clock, Promotion, WarningFilled, CircleCheckFilled, DataBoard } from '@element-plus/icons-vue'
import request from '@/utils/request'
import { useUserStore } from '@/stores/user'
import dayjs from 'dayjs'

const router = useRouter()
const userStore = useUserStore()

const dashboard = reactive({})
const areaChartRef = ref()
const trendChartRef = ref()
let areaChart = null
let trendChart = null

const anomalyTypeMap = {
  cleaning_timeout: '清洗超时',
  area_cluster: '区域集中',
  box_overload: '箱子过载',
  missing_review: '复核缺失'
}

const anomalyStats = computed(() => {
  return dashboard.anomalyStats || { pending: 0, following: 0, overdue: 0, completed: 0, total: 0 }
})

const stats = computed(() => {
  const ss = dashboard.statusStats || []
  const map = {}
  ss.forEach(s => { map[s.status] = s.count })
  return {
    total: ss.reduce((sum, s) => sum + s.count, 0),
    cleaning: map['清洗中'] || 0,
    pending_review: map['待复核'] || 0,
    available: map['可入库'] || 0,
    anomaly: map['异常留置'] || 0
  }
})

function isOverdue(dateStr) {
  if (!dateStr) return false
  const due = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return due < now
}

function goBatchDetail(id) {
  router.push(`/batches/${id}`)
}
function goOperation() {
  router.push('/operation')
}
function goAnomaliesByStatus(status) {
  const query = {}
  if (status === 'pending') {
    query.resolved = 0
    query.review_done = 0
  } else if (status === 'following') {
    query.review_done = 'pending'
  } else if (status === 'overdue') {
    query.review_done = 'overdue'
  } else if (status === 'completed') {
    query.review_done = 1
  }
  router.push({ path: '/anomalies', query })
}
function goAnomalyDetail(row) {
  if (row && row.id) {
    router.push(`/anomalies/${row.id}`)
  }
}

function renderAreaChart() {
  if (!areaChartRef.value) return
  if (!areaChart) areaChart = echarts.init(areaChartRef.value)
  const data = dashboard.areaStats || []
  areaChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['待收回', '清洗中', '待复核', '异常'], bottom: 0 },
    grid: { left: 40, right: 20, top: 20, bottom: 50 },
    xAxis: { type: 'category', data: data.map(d => d.name) },
    yAxis: { type: 'value' },
    series: [
      { name: '待收回', type: 'bar', stack: 'total', data: data.map(d => d.pending_collect || 0), itemStyle: { color: '#909399' } },
      { name: '清洗中', type: 'bar', stack: 'total', data: data.map(d => d.cleaning || 0), itemStyle: { color: '#e6a23c' } },
      { name: '待复核', type: 'bar', stack: 'total', data: data.map(d => d.pending_review || 0), itemStyle: { color: '#f56c6c' } },
      { name: '异常', type: 'bar', stack: 'total', data: data.map(d => d.anomaly || 0), itemStyle: { color: '#9b59b6' } }
    ]
  })
}

function renderTrendChart() {
  if (!trendChartRef.value) return
  if (!trendChart) trendChart = echarts.init(trendChartRef.value)
  const raw = dashboard.operationTrend || []
  const dates = []
  for (let i = 6; i >= 0; i--) {
    dates.push(dayjs().subtract(i, 'day').format('YYYY-MM-DD'))
  }
  const types = ['收回', '清洗', '晾置', '复核', '入库']
  const colors = ['#909399', '#e6a23c', '#36cfc9', '#f56c6c', '#67c23a']
  const series = types.map((t, i) => ({
    name: t, type: 'line', smooth: true,
    data: dates.map(d => {
      const r = raw.find(x => x.date === d && x.operation_type === t)
      return r ? r.count : 0
    }),
    itemStyle: { color: colors[i] }
  }))
  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: types, bottom: 0 },
    grid: { left: 40, right: 20, top: 20, bottom: 50 },
    xAxis: { type: 'category', data: dates },
    yAxis: { type: 'value' },
    series
  })
}

async function loadData() {
  const res = await request.get('/dashboard')
  if (res.code === 200) {
    Object.assign(dashboard, res.data)
    await nextTick()
    renderAreaChart()
    renderTrendChart()
  }
}

function resize() {
  areaChart && areaChart.resize()
  trendChart && trendChart.resize()
}

onMounted(() => {
  loadData()
  window.addEventListener('resize', resize)
})
onUnmounted(() => {
  window.removeEventListener('resize', resize)
  areaChart && areaChart.dispose()
  trendChart && trendChart.dispose()
})
</script>

<style scoped>
.stats-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}
.stats-row:first-child {
  grid-template-columns: repeat(5, 1fr);
}
.anomaly-card {
  display: flex;
  align-items: center;
  padding: 16px;
}
.anomaly-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 14px;
  flex-shrink: 0;
}
.anomaly-info {
  flex: 1;
}
.overdue {
  color: #f56c6c;
  font-weight: 600;
}
.el-table >>> tbody tr {
  cursor: pointer;
}
</style>
