const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const dayjs = require('dayjs');
const XLSX = require('xlsx');
const { run, get, all } = require('./db');
const { authMiddleware, roleMiddleware, generateToken } = require('./auth');

const app = express();
const PORT = 8116;

app.use(cors());
app.use(express.json());

function ok(res, data = null, message = 'ok') {
  res.json({ code: 200, message, data });
}
function fail(res, message, code = 400) {
  res.json({ code, message });
}

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return fail(res, '用户名和密码不能为空');
  const user = await get('SELECT * FROM users WHERE username = ?', [username]);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return fail(res, '用户名或密码错误');
  }
  const token = generateToken(user.id);
  ok(res, {
    token,
    user: { id: user.id, username: user.username, name: user.name, role: user.role }
  }, '登录成功');
});

app.get('/api/auth/profile', authMiddleware, (req, res) => {
  ok(res, req.user);
});

// 区域管理
app.get('/api/areas', authMiddleware, async (req, res) => {
  const data = await all(`
    SELECT a.*, (SELECT COUNT(*) FROM seat_mats sm WHERE sm.area_id = a.id) as mat_count
    FROM areas a ORDER BY a.code
  `);
  ok(res, data);
});

app.post('/api/areas', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const { code, name, description } = req.body;
  if (!code || !name) return fail(res, '编号和名称不能为空');
  try {
    const info = await run('INSERT INTO areas (code, name, description) VALUES (?, ?, ?)', [code, name, description || '']);
    ok(res, { id: info.lastID }, '创建成功');
  } catch (e) {
    fail(res, '区域编号已存在');
  }
});

app.put('/api/areas/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const { code, name, description } = req.body;
  await run('UPDATE areas SET code=?, name=?, description=? WHERE id=?', [code, name, description || '', req.params.id]);
  ok(res, null, '更新成功');
});

app.delete('/api/areas/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const cnt = (await get('SELECT COUNT(*) as cnt FROM seat_mats WHERE area_id=?', [req.params.id])).cnt;
  if (cnt > 0) return fail(res, '该区域下存在座席垫，无法删除');
  await run('DELETE FROM areas WHERE id=?', [req.params.id]);
  ok(res, null, '删除成功');
});

// 座席垫管理
app.get('/api/seat-mats', authMiddleware, async (req, res) => {
  const { area_id, status, keyword } = req.query;
  let sql = `
    SELECT sm.*, a.name as area_name, a.code as area_code,
      cb.code as batch_code, tb.code as box_code
    FROM seat_mats sm
    LEFT JOIN areas a ON sm.area_id = a.id
    LEFT JOIN cleaning_batches cb ON sm.current_batch_id = cb.id
    LEFT JOIN turnover_boxes tb ON sm.current_box_id = tb.id
    WHERE 1=1
  `;
  const params = [];
  if (area_id) { sql += ' AND sm.area_id = ?'; params.push(area_id); }
  if (status) { sql += ' AND sm.status = ?'; params.push(status); }
  if (keyword) { sql += ' AND sm.code LIKE ?'; params.push('%' + keyword + '%'); }
  sql += ' ORDER BY sm.code';
  const data = await all(sql, params);
  ok(res, data);
});

app.post('/api/seat-mats', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const { code, area_id } = req.body;
  if (!code || !area_id) return fail(res, '编号和区域不能为空');
  try {
    const info = await run('INSERT INTO seat_mats (code, area_id, status) VALUES (?, ?, ?)', [code, area_id, '待收回']);
    ok(res, { id: info.lastID }, '创建成功');
  } catch (e) {
    fail(res, '座席垫编号已存在');
  }
});

app.put('/api/seat-mats/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const { code, area_id } = req.body;
  await run('UPDATE seat_mats SET code=?, area_id=? WHERE id=?', [code, area_id, req.params.id]);
  ok(res, null, '更新成功');
});

app.delete('/api/seat-mats/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const mat = await get('SELECT * FROM seat_mats WHERE id=?', [req.params.id]);
  if (mat.current_batch_id) return fail(res, '该座席垫正处于活跃批次，无法删除');
  await run('DELETE FROM seat_mats WHERE id=?', [req.params.id]);
  ok(res, null, '删除成功');
});

// 周转箱管理
app.get('/api/boxes', authMiddleware, async (req, res) => {
  const data = await all('SELECT * FROM turnover_boxes ORDER BY code');
  ok(res, data);
});

app.post('/api/boxes', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const { code, capacity } = req.body;
  if (!code) return fail(res, '编号不能为空');
  try {
    const info = await run('INSERT INTO turnover_boxes (code, capacity) VALUES (?, ?)', [code, capacity || 20]);
    ok(res, { id: info.lastID }, '创建成功');
  } catch (e) {
    fail(res, '周转箱编号已存在');
  }
});

app.put('/api/boxes/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const { code, capacity } = req.body;
  await run('UPDATE turnover_boxes SET code=?, capacity=? WHERE id=?', [code, capacity, req.params.id]);
  ok(res, null, '更新成功');
});

app.delete('/api/boxes/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const box = await get('SELECT * FROM turnover_boxes WHERE id=?', [req.params.id]);
  if (box.current_count > 0) return fail(res, '该周转箱内还有座席垫，无法删除');
  await run('DELETE FROM turnover_boxes WHERE id=?', [req.params.id]);
  ok(res, null, '删除成功');
});

// 用户管理
app.get('/api/users', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const data = await all('SELECT id, username, name, role, created_at FROM users ORDER BY id');
  ok(res, data);
});

app.get('/api/users/brief', authMiddleware, roleMiddleware('admin', 'auditor'), async (req, res) => {
  const data = await all('SELECT id, name, role FROM users ORDER BY id');
  ok(res, data);
});

app.post('/api/users', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const { username, name, role, password } = req.body;
  if (!username || !name || !role) return fail(res, '请填写完整信息');
  try {
    const hash = bcrypt.hashSync(password || '123456', 10);
    const info = await run('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)', [username, hash, name, role]);
    ok(res, { id: info.lastID }, '创建成功');
  } catch (e) {
    fail(res, '用户名已存在');
  }
});

app.put('/api/users/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const { name, role, password } = req.body;
  if (password) {
    const hash = bcrypt.hashSync(password, 10);
    await run('UPDATE users SET name=?, role=?, password=? WHERE id=?', [name, role, hash, req.params.id]);
  } else {
    await run('UPDATE users SET name=?, role=? WHERE id=?', [name, role, req.params.id]);
  }
  ok(res, null, '更新成功');
});

app.delete('/api/users/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  if (req.user.id == req.params.id) return fail(res, '不能删除自己');
  await run('DELETE FROM users WHERE id=?', [req.params.id]);
  ok(res, null, '删除成功');
});

// 检查规则
app.get('/api/check-rules', authMiddleware, async (req, res) => {
  const data = await all('SELECT * FROM check_rules ORDER BY id');
  ok(res, data);
});

app.put('/api/check-rules/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const { name, description, config, enabled } = req.body;
  await run('UPDATE check_rules SET name=?, description=?, config=?, enabled=? WHERE id=?',
    [name, description || '', JSON.stringify(config), enabled ? 1 : 0, req.params.id]);
  ok(res, null, '更新成功');
});

// 清洗批次
app.get('/api/batches', authMiddleware, async (req, res) => {
  const { status } = req.query;
  let sql = `
    SELECT cb.*, u.name as responsible_name,
      (SELECT COUNT(*) FROM operation_records r WHERE r.batch_id = cb.id) as record_count,
      (SELECT COUNT(DISTINCT r.seat_mat_id) FROM operation_records r WHERE r.batch_id = cb.id) as mat_count
    FROM cleaning_batches cb
    LEFT JOIN users u ON cb.responsible_id = u.id
  `;
  const params = [];
  if (status) { sql += ' WHERE cb.status = ?'; params.push(status); }
  sql += ' ORDER BY cb.id DESC';
  const data = await all(sql, params);
  ok(res, data);
});

app.get('/api/batches/:id', authMiddleware, async (req, res) => {
  const batch = await get(`
    SELECT cb.*, u.name as responsible_name
    FROM cleaning_batches cb LEFT JOIN users u ON cb.responsible_id = u.id
    WHERE cb.id = ?
  `, [req.params.id]);
  if (!batch) return fail(res, '批次不存在', 404);

  const records = await all(`
    SELECT r.*, sm.code as mat_code, a.name as area_name, a.code as area_code,
      u.name as operator_name, tb.code as box_code
    FROM operation_records r
    LEFT JOIN seat_mats sm ON r.seat_mat_id = sm.id
    LEFT JOIN areas a ON sm.area_id = a.id
    LEFT JOIN users u ON r.operator_id = u.id
    LEFT JOIN turnover_boxes tb ON r.box_id = tb.id
    WHERE r.batch_id = ?
    ORDER BY r.created_at DESC
  `, [req.params.id]);

  const timeline = await all(`
    SELECT r.operation_type, MIN(r.created_at) as created_at, MAX(u.name) as operator_name, COUNT(*) as count
    FROM operation_records r
    LEFT JOIN users u ON r.operator_id = u.id
    WHERE r.batch_id = ?
    GROUP BY r.operation_type, DATE(r.created_at)
    ORDER BY MIN(r.created_at)
  `, [req.params.id]);

  const anomalies = await all(`
    SELECT ar.*, sm.code as mat_code, a.name as area_name,
      fu.name as follow_up_user_name, ru.name as reviewed_name
    FROM anomaly_records ar
    LEFT JOIN seat_mats sm ON ar.seat_mat_id = sm.id
    LEFT JOIN areas a ON ar.area_id = a.id
    LEFT JOIN users fu ON ar.follow_up_user_id = fu.id
    LEFT JOIN users ru ON ar.reviewed_by = ru.id
    WHERE ar.batch_id = ?
    ORDER BY ar.created_at DESC
  `, [req.params.id]);

  ok(res, { batch, records, timeline, anomalies });
});

app.post('/api/batches', authMiddleware, roleMiddleware('admin', 'user'), async (req, res) => {
  const { code, name, responsible_id, cleaning_timeout_hours } = req.body;
  if (!code || !name) return fail(res, '编号和名称不能为空');
  try {
    const info = await run(`
      INSERT INTO cleaning_batches (code, name, responsible_id, cleaning_timeout_hours)
      VALUES (?, ?, ?, ?)
    `, [code, name, responsible_id || null, cleaning_timeout_hours || 8]);
    ok(res, { id: info.lastID }, '创建成功');
  } catch (e) {
    fail(res, '批次编号已存在');
  }
});

app.post('/api/batches/:id/complete', authMiddleware, async (req, res) => {
  await run('UPDATE cleaning_batches SET status=?, completed_at=CURRENT_TIMESTAMP WHERE id=?', ['已完成', req.params.id]);
  ok(res, null, '批次已完成');
});

// 异常检测函数
async function checkCleaningTimeout() {
  const rule = await get("SELECT * FROM check_rules WHERE rule_type='cleaning_timeout' AND enabled=1");
  if (!rule) return;
  const config = JSON.parse(rule.config);
  const timeoutHours = config.timeoutHours || 8;

  const cleaningMats = await all(`
    SELECT sm.*, r.id as record_id, r.created_at as cleaning_started, r.batch_id, r.operator_id
    FROM seat_mats sm
    JOIN operation_records r ON sm.id = r.seat_mat_id
    WHERE sm.status = '清洗中'
    AND r.operation_type = '清洗'
    AND r.id = (SELECT MAX(id) FROM operation_records WHERE seat_mat_id = sm.id)
    AND (julianday('now') - julianday(r.created_at)) * 24 > ?
  `, [timeoutHours]);

  for (const mat of cleaningMats) {
    const exists = await get("SELECT * FROM anomaly_records WHERE seat_mat_id=? AND anomaly_type='cleaning_timeout' AND resolved=0", [mat.id]);
    if (!exists) {
      await run(`
        INSERT INTO anomaly_records (anomaly_type, severity, seat_mat_id, batch_id, area_id, record_id, operator_id, description)
        VALUES ('cleaning_timeout', 'high', ?, ?, ?, ?, ?, ?)
      `, [mat.id, mat.batch_id || null, mat.area_id, mat.record_id, mat.operator_id, `座席垫 ${mat.code} 清洗已超过${timeoutHours}小时未完成`]);
    }
  }
}

async function checkAreaCluster() {
  const rule = await get("SELECT * FROM check_rules WHERE rule_type='area_cluster' AND enabled=1");
  if (!rule) return;
  const config = JSON.parse(rule.config);
  const threshold = config.threshold || 5;
  const timeWindowHours = config.timeWindowHours || 24;

  const areas = await all(`
    SELECT sm.area_id, a.name as area_name, a.code as area_code, COUNT(*) as anomaly_count
    FROM anomaly_records ar
    JOIN seat_mats sm ON ar.seat_mat_id = sm.id
    JOIN areas a ON sm.area_id = a.id
    WHERE (julianday('now') - julianday(ar.created_at)) * 24 <= ?
    GROUP BY sm.area_id
    HAVING COUNT(*) >= ?
  `, [timeWindowHours, threshold]);

  for (const area of areas) {
    const exists = await get("SELECT * FROM anomaly_records WHERE area_id=? AND anomaly_type='area_cluster' AND resolved=0", [area.area_id]);
    if (!exists) {
      await run(`
        INSERT INTO anomaly_records (anomaly_type, severity, area_id, description)
        VALUES ('area_cluster', 'high', ?, ?)
      `, [area.area_id, `区域 ${area.area_name} 在过去${timeWindowHours}小时内出现${area.anomaly_count}个异常记录`]);
    }
  }
}

// 操作记录列表
app.get('/api/records', authMiddleware, async (req, res) => {
  const { area_id, batch_id, operator_id, status, start_date, end_date, operation_type } = req.query;
  let sql = `
    SELECT r.*, sm.code as mat_code, a.name as area_name, a.code as area_code,
      cb.code as batch_code, u.name as operator_name, tb.code as box_code
    FROM operation_records r
    LEFT JOIN seat_mats sm ON r.seat_mat_id = sm.id
    LEFT JOIN areas a ON sm.area_id = a.id
    LEFT JOIN cleaning_batches cb ON r.batch_id = cb.id
    LEFT JOIN users u ON r.operator_id = u.id
    LEFT JOIN turnover_boxes tb ON r.box_id = tb.id
    WHERE 1=1
  `;
  const params = [];
  if (area_id) { sql += ' AND sm.area_id = ?'; params.push(area_id); }
  if (batch_id) { sql += ' AND r.batch_id = ?'; params.push(batch_id); }
  if (operator_id) { sql += ' AND r.operator_id = ?'; params.push(operator_id); }
  if (operation_type) { sql += ' AND r.operation_type = ?'; params.push(operation_type); }
  if (start_date) { sql += ' AND DATE(r.created_at) >= ?'; params.push(start_date); }
  if (end_date) { sql += ' AND DATE(r.created_at) <= ?'; params.push(end_date); }
  sql += ' ORDER BY r.created_at DESC LIMIT 500';
  const data = await all(sql, params);
  ok(res, data);
});

// 提交操作
app.post('/api/operations', authMiddleware, roleMiddleware('user', 'admin'), async (req, res) => {
  const { operation_type, seat_mat_ids, batch_id, box_id, remark } = req.body;
  if (!operation_type || !seat_mat_ids || seat_mat_ids.length === 0) {
    return fail(res, '操作类型和座席垫不能为空');
  }

  const stateFlow = {
    '收回': { from: '待收回', to: '已收回' },
    '清洗': { from: '已收回', to: '清洗中' },
    '晾置': { from: '清洗中', to: '待复核' },
    '复核': { from: '待复核', to: '可入库' },
    '入库': { from: '可入库', to: '待收回' }
  };

  const flow = stateFlow[operation_type];
  if (!flow) return fail(res, '无效的操作类型');

  let box = null;
  if (box_id) {
    box = await get('SELECT * FROM turnover_boxes WHERE id=?', [box_id]);
    if (!box) return fail(res, '周转箱不存在');
  }

  try {
    for (const matId of seat_mat_ids) {
      const mat = await get('SELECT * FROM seat_mats WHERE id=?', [matId]);
      if (!mat) throw new Error('座席垫不存在');

      if (operation_type === '入库' && mat.status !== '可入库') {
        const rule = await get("SELECT * FROM check_rules WHERE rule_type='missing_review' AND enabled=1");
        if (rule) {
          await run(`
            INSERT INTO anomaly_records (anomaly_type, severity, seat_mat_id, batch_id, area_id, operator_id, description)
            VALUES ('missing_review', 'high', ?, ?, ?, ?, ?)
          `, [mat.id, batch_id || mat.current_batch_id, mat.area_id, req.user.id, `座席垫 ${mat.code} 未经复核直接入库，当前状态: ${mat.status}`]);
        }
      }

      if (operation_type !== '入库' && mat.status !== flow.from) {
        throw new Error(`座席垫 ${mat.code} 当前状态为 ${mat.status}，无法执行${operation_type}操作`);
      }

      if (operation_type === '清洗') {
        if (!batch_id) throw new Error('清洗操作必须指定批次');
        if (mat.current_batch_id && mat.current_batch_id !== batch_id) {
          throw new Error(`座席垫 ${mat.code} 已在其他活跃批次中`);
        }
      }

      if (box && operation_type !== '入库') {
        const boxMats = await all(`
          SELECT DISTINCT seat_mat_id FROM operation_records 
          WHERE box_id=? AND next_status != '待收回'
        `);
        const idsInBox = boxMats.map(r => r.seat_mat_id);
        if (!idsInBox.includes(mat.id) && idsInBox.length >= box.capacity) {
          const rule = await get("SELECT * FROM check_rules WHERE rule_type='box_overload' AND enabled=1");
          if (rule) {
            await run(`
              INSERT INTO anomaly_records (anomaly_type, severity, box_id, operator_id, description)
              VALUES ('box_overload', 'medium', ?, ?, ?)
            `, [box.id, req.user.id, `周转箱 ${box.code} 装载数量超过容量`]);
          }
          throw new Error(`周转箱 ${box.code} 已装满`);
        }
      }

      await run(`
        INSERT INTO operation_records (seat_mat_id, batch_id, box_id, operation_type, prev_status, next_status, operator_id, remark)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        mat.id,
        batch_id || mat.current_batch_id,
        box_id || mat.current_box_id,
        operation_type,
        mat.status,
        flow.to,
        req.user.id,
        remark || ''
      ]);

      await run('UPDATE seat_mats SET status=?, current_batch_id=?, current_box_id=? WHERE id=?', [
        flow.to,
        operation_type === '入库' ? null : (batch_id || mat.current_batch_id),
        operation_type === '入库' ? null : (box_id || mat.current_box_id),
        mat.id
      ]);
    }

    await checkCleaningTimeout();
    await checkAreaCluster();
    ok(res, null, '操作成功');
  } catch (e) {
    fail(res, e.message);
  }
});

// 异常记录
app.get('/api/anomalies', authMiddleware, async (req, res) => {
  const { resolved, anomaly_type, start_date, end_date, review_done, batch_id, area_id, operator_id, follow_up_user_id } = req.query;
  let sql = `
    SELECT ar.*, sm.code as mat_code, a.name as area_name, cb.code as batch_code,
      tb.code as box_code, u.name as resolved_name,
      fu.name as follow_up_user_name, ru.name as reviewed_name, ou.name as operator_name
    FROM anomaly_records ar
    LEFT JOIN seat_mats sm ON ar.seat_mat_id = sm.id
    LEFT JOIN areas a ON ar.area_id = a.id
    LEFT JOIN cleaning_batches cb ON ar.batch_id = cb.id
    LEFT JOIN turnover_boxes tb ON ar.box_id = tb.id
    LEFT JOIN users u ON ar.resolved_by = u.id
    LEFT JOIN users fu ON ar.follow_up_user_id = fu.id
    LEFT JOIN users ru ON ar.reviewed_by = ru.id
    LEFT JOIN users ou ON ar.operator_id = ou.id
    WHERE 1=1
  `;
  const params = [];
  if (resolved !== undefined && resolved !== '') {
    sql += ' AND ar.resolved = ?';
    params.push(resolved === '1' || resolved === true ? 1 : 0);
  }
  if (anomaly_type) { sql += ' AND ar.anomaly_type = ?'; params.push(anomaly_type); }
  if (start_date) { sql += ' AND DATE(ar.created_at) >= ?'; params.push(start_date); }
  if (end_date) { sql += ' AND DATE(ar.created_at) <= ?'; params.push(end_date); }
  if (review_done !== undefined && review_done !== '') {
    if (review_done === 'pending') {
      sql += ' AND ar.review_cause IS NOT NULL AND ar.review_done = 0';
    } else if (review_done === 'overdue') {
      sql += ' AND ar.review_cause IS NOT NULL AND ar.review_done = 0 AND ar.follow_up_due_date IS NOT NULL AND DATE(ar.follow_up_due_date) < DATE(\'now\')';
    } else if (review_done === '1' || review_done === true) {
      sql += ' AND ar.review_done = 1';
    } else if (review_done === '0' || review_done === false) {
      sql += ' AND ar.review_cause IS NULL';
    }
  }
  if (batch_id) { sql += ' AND ar.batch_id = ?'; params.push(batch_id); }
  if (area_id) { sql += ' AND ar.area_id = ?'; params.push(area_id); }
  if (operator_id) { sql += ' AND ar.operator_id = ?'; params.push(operator_id); }
  if (follow_up_user_id) { sql += ' AND ar.follow_up_user_id = ?'; params.push(follow_up_user_id); }
  sql += ' ORDER BY ar.created_at DESC';
  const data = await all(sql, params);
  ok(res, data);
});

app.get('/api/anomalies/:id', authMiddleware, async (req, res) => {
  const anomaly = await get(`
    SELECT ar.*, sm.code as mat_code, a.name as area_name, a.code as area_code, cb.code as batch_code,
      tb.code as box_code, u.name as resolved_name,
      fu.name as follow_up_user_name, ru.name as reviewed_name, ou.name as operator_name
    FROM anomaly_records ar
    LEFT JOIN seat_mats sm ON ar.seat_mat_id = sm.id
    LEFT JOIN areas a ON ar.area_id = a.id
    LEFT JOIN cleaning_batches cb ON ar.batch_id = cb.id
    LEFT JOIN turnover_boxes tb ON ar.box_id = tb.id
    LEFT JOIN users u ON ar.resolved_by = u.id
    LEFT JOIN users fu ON ar.follow_up_user_id = fu.id
    LEFT JOIN users ru ON ar.reviewed_by = ru.id
    LEFT JOIN users ou ON ar.operator_id = ou.id
    WHERE ar.id = ?
  `, [req.params.id]);
  if (!anomaly) return fail(res, '异常记录不存在', 404);

  const handleRecords = [];
  if (anomaly.resolved_at) {
    handleRecords.push({
      type: '处理',
      operator_name: anomaly.resolved_name,
      time: anomaly.resolved_at,
      remark: anomaly.resolved_remark || '处理完成'
    });
  }
  if (anomaly.reviewed_at) {
    handleRecords.push({
      type: '复盘归因',
      operator_name: anomaly.reviewed_name,
      time: anomaly.reviewed_at,
      remark: `原因：${anomaly.review_cause || ''}；责任环节：${anomaly.review_link || '未标注'}`
    });
  }
  if (anomaly.review_done_at) {
    handleRecords.push({
      type: '完成跟进',
      operator_name: anomaly.reviewed_name,
      time: anomaly.review_done_at,
      remark: anomaly.review_done_remark || '跟进完成'
    });
  }
  handleRecords.sort((a, b) => new Date(a.time) - new Date(b.time));

  ok(res, { anomaly, handleRecords });
});

app.post('/api/anomalies/:id/resolve', authMiddleware, async (req, res) => {
  const { remark } = req.body;
  await run(`
    UPDATE anomaly_records SET resolved=1, resolved_by=?, resolved_remark=?, resolved_at=CURRENT_TIMESTAMP
    WHERE id=?
  `, [req.user.id, remark || '', req.params.id]);
  ok(res, null, '已处理');
});

app.post('/api/anomalies/:id/review', authMiddleware, roleMiddleware('admin', 'auditor'), async (req, res) => {
  const { review_cause, review_link, follow_up_user_id, follow_up_due_date } = req.body;
  if (!review_cause) return fail(res, '异常原因不能为空');
  await run(`
    UPDATE anomaly_records SET review_cause=?, review_link=?, follow_up_user_id=?, follow_up_due_date=?,
      reviewed_by=?, reviewed_at=CURRENT_TIMESTAMP
    WHERE id=?
  `, [review_cause, review_link || '', follow_up_user_id || null, follow_up_due_date || null, req.user.id, req.params.id]);
  ok(res, null, '复盘归因已保存');
});

app.put('/api/anomalies/:id/review', authMiddleware, roleMiddleware('admin', 'auditor'), async (req, res) => {
  const { review_cause, review_link, follow_up_user_id, follow_up_due_date } = req.body;
  await run(`
    UPDATE anomaly_records SET review_cause=?, review_link=?, follow_up_user_id=?, follow_up_due_date=?
    WHERE id=?
  `, [review_cause || '', review_link || '', follow_up_user_id || null, follow_up_due_date || null, req.params.id]);
  ok(res, null, '复盘信息已更新');
});

app.post('/api/anomalies/:id/review-complete', authMiddleware, roleMiddleware('admin', 'auditor'), async (req, res) => {
  const { remark } = req.body;
  const anomaly = await get('SELECT * FROM anomaly_records WHERE id=?', [req.params.id]);
  if (!anomaly) return fail(res, '异常记录不存在', 404);
  if (!anomaly.review_cause) return fail(res, '请先进行复盘归因');
  if (anomaly.review_done) return fail(res, '该异常已完成复盘跟进');
  await run(`
    UPDATE anomaly_records SET review_done=1, review_done_at=CURRENT_TIMESTAMP, review_done_remark=?
    WHERE id=?
  `, [remark || '', req.params.id]);
  ok(res, null, '复盘跟进已完成');
});

// 统计看板
app.get('/api/dashboard', authMiddleware, async (req, res) => {
  await checkCleaningTimeout();
  await checkAreaCluster();

  const statusStats = await all('SELECT status, COUNT(*) as count FROM seat_mats GROUP BY status');
  const areaStats = await all(`
    SELECT a.id, a.code, a.name, 
      COUNT(sm.id) as total,
      SUM(CASE WHEN sm.status='待收回' THEN 1 ELSE 0 END) as pending_collect,
      SUM(CASE WHEN sm.status='清洗中' THEN 1 ELSE 0 END) as cleaning,
      SUM(CASE WHEN sm.status='待复核' THEN 1 ELSE 0 END) as pending_review,
      SUM(CASE WHEN sm.status='异常留置' THEN 1 ELSE 0 END) as anomaly
    FROM areas a
    LEFT JOIN seat_mats sm ON a.id = sm.area_id
    GROUP BY a.id
  `);
  const batchProgress = await all(`
    SELECT cb.id, cb.code, cb.name, cb.status, cb.started_at,
      COUNT(DISTINCT r.seat_mat_id) as mat_count,
      SUM(CASE WHEN r.operation_type='收回' THEN 1 ELSE 0 END) as collect_count,
      SUM(CASE WHEN r.operation_type='清洗' THEN 1 ELSE 0 END) as cleaning_count,
      SUM(CASE WHEN r.operation_type='晾置' THEN 1 ELSE 0 END) as drying_count,
      SUM(CASE WHEN r.operation_type='复核' THEN 1 ELSE 0 END) as review_count,
      SUM(CASE WHEN r.operation_type='入库' THEN 1 ELSE 0 END) as storage_count
    FROM cleaning_batches cb
    LEFT JOIN operation_records r ON cb.id = r.batch_id
    WHERE cb.status = '进行中'
    GROUP BY cb.id
    ORDER BY cb.id DESC
  `);
  const boxStats = await all(`
    SELECT tb.*, 
      (SELECT COUNT(DISTINCT r.seat_mat_id) FROM operation_records r 
       WHERE r.box_id = tb.id AND r.next_status != '待收回') as current_load
    FROM turnover_boxes tb
    ORDER BY tb.code
  `);
  const pendingReviews = await all(`
    SELECT sm.*, a.name as area_name, a.code as area_code, cb.code as batch_code
    FROM seat_mats sm
    LEFT JOIN areas a ON sm.area_id = a.id
    LEFT JOIN cleaning_batches cb ON sm.current_batch_id = cb.id
    WHERE sm.status = '待复核'
    ORDER BY sm.id DESC LIMIT 20
  `);
  const recentAnomalies = await all(`
    SELECT ar.*, sm.code as mat_code, a.name as area_name,
      fu.name as follow_up_user_name
    FROM anomaly_records ar
    LEFT JOIN seat_mats sm ON ar.seat_mat_id = sm.id
    LEFT JOIN areas a ON ar.area_id = a.id
    LEFT JOIN users fu ON ar.follow_up_user_id = fu.id
    WHERE ar.resolved = 0
    ORDER BY ar.created_at DESC LIMIT 10
  `);
  const pendingFollowUps = await all(`
    SELECT ar.*, sm.code as mat_code, a.name as area_name, cb.code as batch_code,
      fu.name as follow_up_user_name
    FROM anomaly_records ar
    LEFT JOIN seat_mats sm ON ar.seat_mat_id = sm.id
    LEFT JOIN areas a ON ar.area_id = a.id
    LEFT JOIN cleaning_batches cb ON ar.batch_id = cb.id
    LEFT JOIN users fu ON ar.follow_up_user_id = fu.id
    WHERE ar.review_cause IS NOT NULL AND ar.review_done = 0
    ORDER BY ar.follow_up_due_date ASC, ar.created_at DESC LIMIT 20
  `);
  const operationTrend = await all(`
    SELECT DATE(created_at) as date, operation_type, COUNT(*) as count
    FROM operation_records
    WHERE created_at >= datetime('now', '-7 days')
    GROUP BY DATE(created_at), operation_type
    ORDER BY date
  `);

  const anomalyStats = await get(`
    SELECT
      SUM(CASE WHEN resolved = 0 AND review_cause IS NULL THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN review_cause IS NOT NULL AND review_done = 0 AND (follow_up_due_date IS NULL OR DATE(follow_up_due_date) >= DATE('now')) THEN 1 ELSE 0 END) as following,
      SUM(CASE WHEN review_cause IS NOT NULL AND review_done = 0 AND follow_up_due_date IS NOT NULL AND DATE(follow_up_due_date) < DATE('now') THEN 1 ELSE 0 END) as overdue,
      SUM(CASE WHEN review_done = 1 THEN 1 ELSE 0 END) as completed,
      COUNT(*) as total
    FROM anomaly_records
  `);

  const overdueAnomalies = await all(`
    SELECT ar.*, sm.code as mat_code, a.name as area_name, cb.code as batch_code,
      fu.name as follow_up_user_name
    FROM anomaly_records ar
    LEFT JOIN seat_mats sm ON ar.seat_mat_id = sm.id
    LEFT JOIN areas a ON ar.area_id = a.id
    LEFT JOIN cleaning_batches cb ON ar.batch_id = cb.id
    LEFT JOIN users fu ON ar.follow_up_user_id = fu.id
    WHERE ar.review_cause IS NOT NULL AND ar.review_done = 0 AND ar.follow_up_due_date IS NOT NULL AND DATE(ar.follow_up_due_date) < DATE('now')
    ORDER BY ar.follow_up_due_date ASC, ar.created_at DESC LIMIT 20
  `);

  ok(res, {
    statusStats, areaStats, batchProgress, boxStats,
    pendingReviews, recentAnomalies, pendingFollowUps, operationTrend,
    anomalyStats, overdueAnomalies
  });
});

// 导出
app.get('/api/export/:type', authMiddleware, roleMiddleware('auditor', 'admin'), async (req, res) => {
  const { type } = req.params;
  let data = [], filename = '';

  if (type === 'anomalies') {
    data = await all(`
      SELECT ar.created_at as 创建时间, ar.anomaly_type as 异常类型, ar.severity as 严重程度, ar.description as 描述,
        sm.code as 座席垫编号, a.name as 区域, cb.code as 批次, tb.code as 周转箱,
        ou.name as 操作人,
        CASE WHEN ar.resolved=1 THEN '已处理' ELSE '未处理' END as 状态,
        ar.resolved_remark as 处理备注,
        ar.review_cause as 异常原因, ar.review_link as 责任环节,
        fu.name as 跟进人, ar.follow_up_due_date as 预计完成时间,
        CASE WHEN ar.review_done=1 THEN '已完成' WHEN ar.review_cause IS NOT NULL THEN '跟进中' ELSE '未复盘' END as 复盘状态,
        ar.review_done_remark as 跟进完成说明,
        ru.name as 复盘人, ar.reviewed_at as 复盘时间
      FROM anomaly_records ar
      LEFT JOIN seat_mats sm ON ar.seat_mat_id = sm.id
      LEFT JOIN areas a ON ar.area_id = a.id
      LEFT JOIN cleaning_batches cb ON ar.batch_id = cb.id
      LEFT JOIN turnover_boxes tb ON ar.box_id = tb.id
      LEFT JOIN users fu ON ar.follow_up_user_id = fu.id
      LEFT JOIN users ru ON ar.reviewed_by = ru.id
      LEFT JOIN users ou ON ar.operator_id = ou.id
      ORDER BY ar.created_at DESC
    `);
    filename = '异常记录.xlsx';
  } else if (type === 'records') {
    data = await all(`
      SELECT r.created_at as 操作时间, r.operation_type as 操作类型, sm.code as 座席垫编号,
        a.name as 区域, cb.code as 批次, tb.code as 周转箱,
        r.prev_status as 前状态, r.next_status as 后状态,
        u.name as 操作人, r.remark as 备注
      FROM operation_records r
      LEFT JOIN seat_mats sm ON r.seat_mat_id = sm.id
      LEFT JOIN areas a ON sm.area_id = a.id
      LEFT JOIN cleaning_batches cb ON r.batch_id = cb.id
      LEFT JOIN turnover_boxes tb ON r.box_id = tb.id
      LEFT JOIN users u ON r.operator_id = u.id
      ORDER BY r.created_at DESC
    `);
    filename = '操作记录.xlsx';
  } else if (type === 'mats') {
    data = await all(`
      SELECT sm.code as 编号, a.name as 区域, sm.status as 状态, cb.code as 当前批次,
        tb.code as 当前周转箱, sm.created_at as 创建时间
      FROM seat_mats sm
      LEFT JOIN areas a ON sm.area_id = a.id
      LEFT JOIN cleaning_batches cb ON sm.current_batch_id = cb.id
      LEFT JOIN turnover_boxes tb ON sm.current_box_id = tb.id
      ORDER BY sm.code
    `);
    filename = '座席垫清单.xlsx';
  }

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.send(buffer);
});

app.listen(PORT, () => {
  console.log(`后端服务运行在 http://localhost:${PORT}`);
});
