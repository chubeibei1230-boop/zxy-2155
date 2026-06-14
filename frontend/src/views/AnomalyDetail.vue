<template>
  <div class="page-container">
    <div class="page-header">
      <h2>
        <el-button link @click="$router.back()">
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
        异常详情
      </h2>
      <div>
        <el-button type="primary" @click="openResolve" v-if="!anomaly?.resolved">处理异常</el-button>
        <el-button type="warning" @click="openReview" v-if="!anomaly?.review_cause">复盘归因</el-button>
        <el-button type="warning" @click="openReview(true)" v-if="anomaly?.review_cause && !anomaly?.review_done">编辑跟进</el-button>
        <el-button type="success" @click="openReviewComplete" v-if="anomaly?.review_cause && !anomaly?.review_done">完成跟进</el-button>
        <el-button link @click="goAnomalyList">返回列表</el-button>
      </div>
    </div>

    <el-row :gutter="16" style="margin-bottom:16px;">
      <el-col :span="8">
        <div class="table-card">
          <div class="status-header">
            <div class="status-main">
              <el-tag size="large" :type="anomaly?.review_done ? 'success' : (isCurrentOverdue ? 'danger' : (anomaly?.review_cause ? 'warning' : 'info'))">
                {{ anomaly?.review_done ? '已闭环' : (isCurrentOverdue ? '已逾期' : (anomaly?.review_cause ? '跟进中' : '待处理')) }}
              </el-tag>
              <el-tag size="large" style="margin-left:8px;" :type="anomaly?.resolved ? 'success' : 'danger'">
                {{ anomaly?.resolved ? '已处理' : '未处理' }}
              </el-tag>
            </div>
            <div class="status-time">异常时间：{{ anomaly?.created_at }}</div>
          </div>
          <div class="anomaly-desc">
            <el-icon :size="18" style="color:#f56c6c;margin-right:6px;"><WarningFilled /></el-icon>
            <span>{{ anomaly?.description }}</span>
          </div>
        </div>

        <div class="table-card" style="margin-top:16px;">
          <h3>关联信息</h3>
          <el-descriptions :column="1" border size="default">
            <el-descriptions-item label="异常类型">
              <el-tag :type="anomaly?.severity === 'high' ? 'danger' : 'warning'">
                {{ typeMap[anomaly?.anomaly_type] || anomaly?.anomaly_type }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="严重程度">
              <el-tag :type="anomaly?.severity === 'high' ? 'danger' : 'warning'">
                {{ anomaly?.severity === 'high' ? '高' : '中' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="关联批次">
              <span v-if="anomaly?.batch_code" style="cursor:pointer;color:#409eff;" @click="goBatchDetail">{{ anomaly?.batch_code }}</span>
              <span v-else style="color:#c0c4cc">-</span>
            </el-descriptions-item>
            <el-descriptions-item label="关联座席垫">
              <span>{{ anomaly?.mat_code || '-' }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="所属区域">
              <span>{{ anomaly?.area_code ? anomaly.area_code + ' - ' : '' }}{{ anomaly?.area_name || '-' }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="操作人">
              <span>{{ anomaly?.operator_name || '-' }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="关联周转箱">
              <span>{{ anomaly?.box_code || '-' }}</span>
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </el-col>

      <el-col :span="16">
        <div class="table-card">
          <div class="page-header" style="margin-bottom:12px;">
            <h3 style="margin:0;">闭环流程时间线</h3>
          </div>
          <el-steps :active="timelineStep" finish-status="success" align-center style="margin-bottom:24px;">
            <el-step title="异常产生" :description="anomaly?.created_at" />
            <el-step title="异常处理" :description="anomaly?.resolved_at || '待处理'" />
            <el-step title="复盘归因" :description="anomaly?.reviewed_at || '待复盘'" />
            <el-step title="跟进完成" :description="anomaly?.review_done_at || '待完成'" />
          </el-steps>

          <el-timeline v-if="handleRecords && handleRecords.length > 0">
            <el-timeline-item
              v-for="(rec, idx) in handleRecords"
              :key="idx"
              :timestamp="rec.time"
              :type="timelineType(rec.type)"
              :hollow="true"
            >
              <el-card shadow="never" class="timeline-card">
                <template #header>
                  <div class="card-header">
                    <span><b>{{ rec.type }}</b> · {{ rec.operator_name || '系统' }}</span>
                  </div>
                </template>
                <div style="white-space:pre-wrap;">{{ rec.remark }}</div>
              </el-card>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-else description="暂无处理记录，先处理异常或进行复盘归因" />
        </div>

        <div class="table-card" style="margin-top:16px;" v-if="anomaly?.review_cause">
          <div class="page-header" style="margin-bottom:12px;">
            <h3 style="margin:0;">复盘跟进信息</h3>
          </div>
          <el-descriptions :column="2" border size="default">
            <el-descriptions-item label="异常原因" :span="2">
              {{ anomaly?.review_cause }}
            </el-descriptions-item>
            <el-descriptions-item label="责任环节">
              {{ anomaly?.review_link || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="跟进人">
              {{ anomaly?.follow_up_user_name || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="预计完成时间">
              <span v-if="anomaly?.follow_up_due_date" :class="{ 'overdue': !anomaly?.review_done && isCurrentOverdue }">
                {{ anomaly?.follow_up_due_date }}
                <el-tag size="small" type="danger" style="margin-left:6px;" v-if="!anomaly?.review_done && isCurrentOverdue">已逾期</el-tag>
              </span>
              <span v-else style="color:#c0c4cc">-</span>
            </el-descriptions-item>
            <el-descriptions-item label="复盘人">
              {{ anomaly?.reviewed_name || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="复盘时间">
              {{ anomaly?.reviewed_at || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="跟进完成说明" :span="2" v-if="anomaly?.review_done">
              {{ anomaly?.review_done_remark || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="跟进完成时间" v-if="anomaly?.review_done">
              {{ anomaly?.review_done_at || '-' }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
        <div class="table-card" style="margin-top:16px;" v-else>
          <el-empty description="未进行复盘归因，请点击【复盘归因】按钮开始">
            <el-button type="warning" @click="openReview">立即复盘</el-button>
          </el-empty>
        </div>

        <div class="table-card" style="margin-top:16px;" v-if="anomaly?.resolved">
          <div class="page-header" style="margin-bottom:12px;">
            <h3 style="margin:0;">处理信息</h3>
          </div>
          <el-descriptions :column="2" border size="default">
            <el-descriptions-item label="处理人">
              {{ anomaly?.resolved_name || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="处理时间">
              {{ anomaly?.resolved_at || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="处理备注" :span="2">
              {{ anomaly?.resolved_remark || '-' }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </el-col>
    </el-row>

    <el-dialog v-model="dialogVisible" title="处理异常" width="480px">
      <el-form label-width="80px">
        <el-form-item label="异常描述">
          <span>{{ anomaly?.description }}</span>
        </el-form-item>
        <el-form-item label="处理备注">
          <el-input v-model="resolveRemark" type="textarea" :rows="4" placeholder="请填写处理说明（必填建议）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="doResolve">确认处理</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="reviewDialogVisible" :title="isEditReview ? '编辑复盘跟进' : '复盘归因'" width="560px">
      <el-form :model="reviewForm" label-width="110px">
        <el-form-item label="异常描述">
          <span>{{ anomaly?.description }}</span>
        </el-form-item>
        <el-form-item label="异常原因" required>
          <el-input v-model="reviewForm.review_cause" type="textarea" :rows="4" placeholder="请分析异常产生的根本原因" />
        </el-form-item>
        <el-form-item label="责任环节">
          <el-input v-model="reviewForm.review_link" placeholder="如：清洗环节/复核环节/入库环节/运输环节" />
        </el-form-item>
        <el-form-item label="跟进责任人">
          <el-select v-model="reviewForm.follow_up_user_id" placeholder="请选择跟进责任人" clearable style="width:100%;">
            <el-option v-for="u in users" :key="u.id" :label="u.name" :value="u.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="预计完成时间">
          <el-date-picker v-model="reviewForm.follow_up_due_date" type="date" placeholder="选择预计完成日期" value-format="YYYY-MM-DD" style="width:100%;" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="doReview">{{ isEditReview ? '保存修改' : '确认保存' }}</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="reviewCompleteDialogVisible" title="完成跟进" width="520px">
      <el-form label-width="110px">
        <el-form-item label="异常原因">
          <span>{{ anomaly?.review_cause }}</span>
        </el-form-item>
        <el-form-item label="责任环节">
          <span>{{ anomaly?.review_link || '-' }}</span>
        </el-form-item>
        <el-form-item label="跟进责任人">
          <span>{{ anomaly?.follow_up_user_name || '-' }}</span>
        </el-form-item>
        <el-form-item label="预计完成时间">
          <span :class="{ 'overdue': isCurrentOverdue }">
            {{ anomaly?.follow_up_due_date || '-' }}
          </span>
        </el-form-item>
        <el-form-item label="完成说明" required>
          <el-input v-model="reviewCompleteRemark" type="textarea" :rows="4" placeholder="请填写跟进完成的说明，包括改进措施、验证结果等" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewCompleteDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="doReviewComplete">确认完成跟进</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, WarningFilled } from '@element-plus/icons-vue'
import request from '@/utils/request'

const route = useRoute()
const router = useRouter()

const anomaly = ref(null)
const handleRecords = ref([])
const users = ref([])
const dialogVisible = ref(false)
const reviewDialogVisible = ref(false)
const reviewCompleteDialogVisible = ref(false)
const resolveRemark = ref('')
const reviewCompleteRemark = ref('')
const isEditReview = ref(false)

const typeMap = {
  cleaning_timeout: '清洗超时',
  area_cluster: '区域集中',
  box_overload: '箱子过载',
  missing_review: '复核缺失'
}

const reviewForm = reactive({
  review_cause: '',
  review_link: '',
  follow_up_user_id: null,
  follow_up_due_date: ''
})

const isCurrentOverdue = computed(() => {
  if (!anomaly.value?.follow_up_due_date) return false
  if (anomaly.value?.review_done) return false
  const due = new Date(anomaly.value.follow_up_due_date)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return due < now
})

const timelineStep = computed(() => {
  let step = 1
  if (anomaly.value?.resolved) step = 2
  if (anomaly.value?.review_cause) step = 3
  if (anomaly.value?.review_done) step = 4
  return step
})

function timelineType(type) {
  const map = { '处理': 'warning', '复盘归因': '', '完成跟进': 'success' }
  return map[type] || ''
}

async function loadUsers() {
  const res = await request.get('/users/brief')
  if (res.code === 200) users.value = res.data
}

async function loadData() {
  const res = await request.get(`/anomalies/${route.params.id}`)
  if (res.code === 200) {
    anomaly.value = res.data.anomaly
    handleRecords.value = res.data.handleRecords
  }
}

function goAnomalyList() {
  router.push('/anomalies')
}

function goBatchDetail() {
  if (anomaly.value?.batch_id) {
    router.push(`/batches/${anomaly.value.batch_id}`)
  }
}

function openResolve() {
  resolveRemark.value = ''
  dialogVisible.value = true
}

async function doResolve() {
  const res = await request.post(`/anomalies/${anomaly.value.id}/resolve`, {
    remark: resolveRemark.value
  })
  if (res.code === 200) {
    ElMessage.success('处理成功')
    dialogVisible.value = false
    loadData()
  }
}

function openReview(edit = false) {
  isEditReview.value = edit
  Object.assign(reviewForm, {
    review_cause: anomaly.value?.review_cause || '',
    review_link: anomaly.value?.review_link || '',
    follow_up_user_id: anomaly.value?.follow_up_user_id || null,
    follow_up_due_date: anomaly.value?.follow_up_due_date || ''
  })
  reviewDialogVisible.value = true
}

async function doReview() {
  if (!reviewForm.review_cause) {
    ElMessage.warning('请填写异常原因')
    return
  }
  const api = isEditReview.value
    ? request.put(`/anomalies/${anomaly.value.id}/review`, reviewForm)
    : request.post(`/anomalies/${anomaly.value.id}/review`, reviewForm)
  const res = await api
  if (res.code === 200) {
    ElMessage.success(isEditReview.value ? '更新成功' : '复盘归因已保存')
    reviewDialogVisible.value = false
    loadData()
  }
}

function openReviewComplete() {
  reviewCompleteRemark.value = ''
  reviewCompleteDialogVisible.value = true
}

async function doReviewComplete() {
  if (!reviewCompleteRemark.value) {
    ElMessage.warning('请填写跟进完成说明')
    return
  }
  const res = await request.post(`/anomalies/${anomaly.value.id}/review-complete`, {
    remark: reviewCompleteRemark.value
  })
  if (res.code === 200) {
    ElMessage.success('复盘跟进已完成，异常已闭环')
    reviewCompleteDialogVisible.value = false
    loadData()
  }
}

onMounted(() => {
  loadUsers()
  loadData()
})
</script>

<style scoped>
.status-header {
  padding-bottom: 12px;
  border-bottom: 1px dashed #ebeef5;
  margin-bottom: 12px;
}
.status-main {
  margin-bottom: 8px;
}
.status-time {
  font-size: 13px;
  color: #909399;
}
.anomaly-desc {
  background: #fef0f0;
  border-left: 3px solid #f56c6c;
  padding: 12px 16px;
  border-radius: 4px;
  display: flex;
  align-items: flex-start;
  line-height: 1.6;
}
.table-card h3 {
  margin-top: 0;
  margin-bottom: 12px;
}
.timeline-card {
  margin-bottom: 8px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.overdue {
  color: #f56c6c;
  font-weight: 600;
}
</style>
