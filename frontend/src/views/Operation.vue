<template>
  <div class="page-container">
    <div class="page-header">
      <h2>提交操作</h2>
    </div>
    <div class="table-card">
      <el-steps :active="stepIndex" finish-status="success" simple style="margin-bottom:24px;">
        <el-step title="选择操作" />
        <el-step title="选择座席垫" />
        <el-step title="确认提交" />
      </el-steps>

      <div v-if="stepIndex === 0">
        <h4>请选择操作类型</h4>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:16px;margin:20px 0;">
          <div
            v-for="op in operations"
            :key="op.type"
            class="op-card"
            :class="{ active: selectedOp === op.type }"
            @click="selectOp(op)"
          >
            <div class="op-icon" :style="{ color: op.color }">
              <el-icon :size="32"><component :is="op.icon" /></el-icon>
            </div>
            <div class="op-name">{{ op.type }}</div>
            <div class="op-desc">当前状态: {{ op.from }} → {{ op.to }}</div>
          </div>
        </div>
        <div v-if="selectedOp">
          <el-form :model="form" label-width="110px" style="max-width:500px;">
            <el-form-item label="清洗批次" v-if="selectedOp === '清洗'">
              <el-select v-model="form.batch_id" placeholder="请选择批次" style="width:100%;" filterable>
                <el-option
                  v-for="b in activeBatches"
                  :key="b.id"
                  :label="b.code + ' - ' + b.name"
                  :value="b.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="周转箱" v-if="selectedOp !== '入库'">
              <el-select v-model="form.box_id" placeholder="请选择周转箱（可选）" style="width:100%;" clearable>
                <el-option
                  v-for="b in boxes"
                  :key="b.id"
                  :label="b.code + ' (容量:' + b.capacity + ')'"
                  :value="b.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="备注">
              <el-input v-model="form.remark" type="textarea" :rows="2" />
            </el-form-item>
          </el-form>
        </div>
        <div style="margin-top:16px;">
          <el-button type="primary" :disabled="!canGoNext" @click="stepIndex = 1">下一步</el-button>
        </div>
      </div>

      <div v-if="stepIndex === 1">
        <h4>请选择要{{ selectedOp }}的座席垫（当前状态为"{{ currentOp?.from }}"）</h4>
        <div style="margin:16px 0;display:flex;gap:16px;align-items:center;">
          <el-input v-model="searchKeyword" placeholder="搜索编号" clearable style="width:200px;" />
          <el-select v-model="filterArea" placeholder="按区域筛选" clearable style="width:180px;">
            <el-option v-for="a in areas" :key="a.id" :label="a.name" :value="a.id" />
          </el-select>
          <span style="color:#909399;">已选 {{ selectedMats.length }} 个</span>
          <el-button @click="toggleSelectAll">{{ isAllSelected ? '取消全选' : '全选' }}</el-button>
        </div>
        <el-table
          ref="tableRef"
          :data="filteredMats"
          stripe
          border
          @selection-change="handleSelectionChange"
          height="400"
        >
          <el-table-column type="selection" width="50" />
          <el-table-column prop="code" label="座席垫编号" width="140" />
          <el-table-column label="区域" min-width="180">
            <template #default="{ row }">{{ row.area_code }} - {{ row.area_name }}</template>
          </el-table-column>
          <el-table-column label="状态" width="120">
            <template #default="{ row }">
              <el-tag size="small">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="batch_code" label="当前批次" width="140" />
        </el-table>
        <div style="margin-top:16px;">
          <el-button @click="stepIndex = 0">上一步</el-button>
          <el-button type="primary" :disabled="selectedMats.length === 0" @click="stepIndex = 2">下一步</el-button>
        </div>
      </div>

      <div v-if="stepIndex === 2">
        <h4>确认提交</h4>
        <el-descriptions :column="2" border style="margin:20px 0;">
          <el-descriptions-item label="操作类型">{{ selectedOp }}</el-descriptions-item>
          <el-descriptions-item label="座席垫数量">{{ selectedMats.length }} 个</el-descriptions-item>
          <el-descriptions-item label="清洗批次" v-if="form.batch_id">
            {{ batches.find(b => b.id === form.batch_id)?.code }}
          </el-descriptions-item>
          <el-descriptions-item label="周转箱" v-if="form.box_id">
            {{ boxes.find(b => b.id === form.box_id)?.code }}
          </el-descriptions-item>
          <el-descriptions-item label="状态流转">{{ currentOp?.from }} → {{ currentOp?.to }}</el-descriptions-item>
          <el-descriptions-item label="备注">{{ form.remark || '-' }}</el-descriptions-item>
        </el-descriptions>
        <el-alert
          type="info"
          show-icon
          :title="'将对以下 ' + selectedMats.length + ' 个座席垫执行「' + selectedOp + '」操作'"
          style="margin-bottom:20px;"
        />
        <div style="max-height:200px;overflow-y:auto;margin-bottom:20px;border:1px solid #ebeef5;padding:12px;border-radius:6px;">
          <el-tag v-for="m in selectedMats" :key="m.id" style="margin:4px;">{{ m.code }}</el-tag>
        </div>
        <div>
          <el-button @click="stepIndex = 1">上一步</el-button>
          <el-button type="primary" :loading="submitting" @click="doSubmit">确认提交</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Download, Sell, SunFilled, CircleCheck, Upload
} from '@element-plus/icons-vue'
import request from '@/utils/request'

const stepIndex = ref(0)
const submitting = ref(false)
const selectedOp = ref('')
const searchKeyword = ref('')
const filterArea = ref('')
const selectedMats = ref([])
const mats = ref([])
const areas = ref([])
const batches = ref([])
const boxes = ref([])
const tableRef = ref()

const operations = [
  { type: '收回', from: '待收回', to: '已收回', color: '#909399', icon: Download },
  { type: '清洗', from: '已收回', to: '清洗中', color: '#e6a23c', icon: Sell },
  { type: '晾置', from: '清洗中', to: '待复核', color: '#36cfc9', icon: SunFilled },
  { type: '复核', from: '待复核', to: '可入库', color: '#f56c6c', icon: CircleCheck },
  { type: '入库', from: '可入库', to: '待收回', color: '#67c23a', icon: Upload }
]

const currentOp = computed(() => operations.find(o => o.type === selectedOp.value))

const canGoNext = computed(() => {
  if (!selectedOp.value) return false
  if (selectedOp.value === '清洗' && !form.batch_id) return false
  return true
})

const form = reactive({
  batch_id: null,
  box_id: null,
  remark: ''
})

const activeBatches = computed(() => batches.value.filter(b => b.status === '进行中'))

const availableMats = computed(() => {
  if (!currentOp.value) return []
  return mats.value.filter(m => m.status === currentOp.value.from)
})

const filteredMats = computed(() => {
  let list = availableMats.value
  if (searchKeyword.value) {
    list = list.filter(m => m.code.includes(searchKeyword.value))
  }
  if (filterArea.value) {
    list = list.filter(m => m.area_id === filterArea.value)
  }
  return list
})

const isAllSelected = computed(() => {
  return filteredMats.value.length > 0 && filteredMats.value.every(m => selectedMats.value.find(s => s.id === m.id))
})

function selectOp(op) {
  selectedOp.value = op.type
  selectedMats.value = []
  form.batch_id = null
  form.box_id = null
  form.remark = ''
}

function handleSelectionChange(rows) {
  selectedMats.value = rows
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    tableRef.value.clearSelection()
  } else {
    filteredMats.value.forEach(m => tableRef.value.toggleRowSelection(m, true))
  }
}

async function loadData() {
  const [m, a, b, bx] = await Promise.all([
    request.get('/seat-mats'),
    request.get('/areas'),
    request.get('/batches'),
    request.get('/boxes')
  ])
  if (m.code === 200) mats.value = m.data
  if (a.code === 200) areas.value = a.data
  if (b.code === 200) batches.value = b.data
  if (bx.code === 200) boxes.value = bx.data
}

async function doSubmit() {
  if (selectedMats.value.length === 0) {
    ElMessage.warning('请选择座席垫')
    return
  }
  submitting.value = true
  try {
    const res = await request.post('/operations', {
      operation_type: selectedOp.value,
      seat_mat_ids: selectedMats.value.map(m => m.id),
      batch_id: form.batch_id,
      box_id: form.box_id,
      remark: form.remark
    })
    if (res.code === 200) {
      ElMessage.success('操作成功')
      stepIndex.value = 0
      selectedOp.value = ''
      selectedMats.value = []
      Object.assign(form, { batch_id: null, box_id: null, remark: '' })
      loadData()
    } else {
      ElMessage.error(res.message)
    }
  } finally {
    submitting.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.op-card {
  padding: 24px 16px;
  border: 2px solid #ebeef5;
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: #fff;
}
.op-card:hover {
  border-color: #c0c4cc;
  transform: translateY(-2px);
}
.op-card.active {
  border-color: #409eff;
  background: #ecf5ff;
}
.op-icon {
  margin-bottom: 8px;
}
.op-name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}
.op-desc {
  font-size: 12px;
  color: #909399;
}
</style>
