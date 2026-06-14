const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data.db');
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function exec(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function serialize(fn) {
  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      try {
        await fn();
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  });
}

async function initDB() {
  await exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'user', 'auditor')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS areas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS seat_mats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      area_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT '待收回',
      current_batch_id INTEGER,
      current_box_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (area_id) REFERENCES areas(id)
    );

    CREATE TABLE IF NOT EXISTS turnover_boxes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 20,
      current_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT '空闲',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cleaning_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      responsible_id INTEGER,
      status TEXT NOT NULL DEFAULT '进行中',
      cleaning_timeout_hours INTEGER NOT NULL DEFAULT 8,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (responsible_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS operation_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seat_mat_id INTEGER NOT NULL,
      batch_id INTEGER,
      box_id INTEGER,
      operation_type TEXT NOT NULL,
      prev_status TEXT,
      next_status TEXT,
      operator_id INTEGER NOT NULL,
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (seat_mat_id) REFERENCES seat_mats(id),
      FOREIGN KEY (batch_id) REFERENCES cleaning_batches(id),
      FOREIGN KEY (box_id) REFERENCES turnover_boxes(id),
      FOREIGN KEY (operator_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS check_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      rule_type TEXT NOT NULL,
      config TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS anomaly_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      anomaly_type TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'normal',
      seat_mat_id INTEGER,
      batch_id INTEGER,
      box_id INTEGER,
      area_id INTEGER,
      description TEXT NOT NULL,
      record_id INTEGER,
      resolved INTEGER NOT NULL DEFAULT 0,
      resolved_by INTEGER,
      resolved_at DATETIME,
      resolved_remark TEXT,
      review_cause TEXT,
      review_link TEXT,
      follow_up_user_id INTEGER,
      follow_up_due_date TEXT,
      review_done INTEGER NOT NULL DEFAULT 0,
      review_done_at DATETIME,
      review_done_remark TEXT,
      reviewed_by INTEGER,
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (seat_mat_id) REFERENCES seat_mats(id),
      FOREIGN KEY (batch_id) REFERENCES cleaning_batches(id),
      FOREIGN KEY (box_id) REFERENCES turnover_boxes(id),
      FOREIGN KEY (area_id) REFERENCES areas(id),
      FOREIGN KEY (record_id) REFERENCES operation_records(id),
      FOREIGN KEY (follow_up_user_id) REFERENCES users(id),
      FOREIGN KEY (reviewed_by) REFERENCES users(id)
    );
  `);

  const userCount = (await get('SELECT COUNT(*) as cnt FROM users')).cnt;
  if (userCount === 0) {
    const hash = bcrypt.hashSync('123456', 10);
    await run('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)', ['admin', hash, '系统管理员', 'admin']);
    await run('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)', ['user01', hash, '操作员张三', 'user']);
    await run('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)', ['auditor01', hash, '审计员李四', 'auditor']);
  }

  const areaCount = (await get('SELECT COUNT(*) as cnt FROM areas')).cnt;
  if (areaCount === 0) {
    await run('INSERT INTO areas (code, name, description) VALUES (?, ?, ?)', ['A001', '一区-运营部', '运营部办公区域']);
    await run('INSERT INTO areas (code, name, description) VALUES (?, ?, ?)', ['A002', '二区-技术部', '技术部办公区域']);
    await run('INSERT INTO areas (code, name, description) VALUES (?, ?, ?)', ['A003', '三区-市场部', '市场部办公区域']);
    await run('INSERT INTO areas (code, name, description) VALUES (?, ?, ?)', ['A004', '四区-客服部', '客服部办公区域']);
  }

  const boxCount = (await get('SELECT COUNT(*) as cnt FROM turnover_boxes')).cnt;
  if (boxCount === 0) {
    await run('INSERT INTO turnover_boxes (code, capacity) VALUES (?, ?)', ['B001', 20]);
    await run('INSERT INTO turnover_boxes (code, capacity) VALUES (?, ?)', ['B002', 20]);
    await run('INSERT INTO turnover_boxes (code, capacity) VALUES (?, ?)', ['B003', 30]);
    await run('INSERT INTO turnover_boxes (code, capacity) VALUES (?, ?)', ['B004', 30]);
  }

  const matCount = (await get('SELECT COUNT(*) as cnt FROM seat_mats')).cnt;
  if (matCount === 0) {
    const mats = [];
    for (let i = 1; i <= 4; i++) {
      for (let j = 1; j <= 10; j++) {
        mats.push([`M${String(i).padStart(2, '0')}-${String(j).padStart(3, '0')}`, i]);
      }
    }
    for (const m of mats) {
      await run('INSERT INTO seat_mats (code, area_id, status) VALUES (?, ?, ?)', [m[0], m[1], '待收回']);
    }
  }

  const ruleCount = (await get('SELECT COUNT(*) as cnt FROM check_rules')).cnt;
  if (ruleCount === 0) {
    await run('INSERT INTO check_rules (name, description, rule_type, config) VALUES (?, ?, ?, ?)', ['清洗超时检测', '超过设定时间未完成清洗自动标记异常', 'cleaning_timeout', '{"timeoutHours":8}']);
    await run('INSERT INTO check_rules (name, description, rule_type, config) VALUES (?, ?, ?, ?)', ['区域异常集中检测', '同一区域短时间内出现大量异常', 'area_cluster', '{"threshold":5,"timeWindowHours":24}']);
    await run('INSERT INTO check_rules (name, description, rule_type, config) VALUES (?, ?, ?, ?)', ['周转箱装载冲突', '周转箱装载数量超过容量', 'box_overload', '{}']);
    await run('INSERT INTO check_rules (name, description, rule_type, config) VALUES (?, ?, ?, ?)', ['复核缺失入库检测', '未经复核直接入库时标记异常', 'missing_review', '{}']);
  }
}

initDB().then(async () => {
  const cols = await all("PRAGMA table_info(anomaly_records)");
  const colNames = cols.map(c => c.name);
  const migrations = [
    { name: 'review_cause', sql: "ALTER TABLE anomaly_records ADD COLUMN review_cause TEXT" },
    { name: 'review_link', sql: "ALTER TABLE anomaly_records ADD COLUMN review_link TEXT" },
    { name: 'follow_up_user_id', sql: "ALTER TABLE anomaly_records ADD COLUMN follow_up_user_id INTEGER REFERENCES users(id)" },
    { name: 'follow_up_due_date', sql: "ALTER TABLE anomaly_records ADD COLUMN follow_up_due_date TEXT" },
    { name: 'review_done', sql: "ALTER TABLE anomaly_records ADD COLUMN review_done INTEGER NOT NULL DEFAULT 0" },
    { name: 'review_done_at', sql: "ALTER TABLE anomaly_records ADD COLUMN review_done_at DATETIME" },
    { name: 'review_done_remark', sql: "ALTER TABLE anomaly_records ADD COLUMN review_done_remark TEXT" },
    { name: 'reviewed_by', sql: "ALTER TABLE anomaly_records ADD COLUMN reviewed_by INTEGER REFERENCES users(id)" },
    { name: 'reviewed_at', sql: "ALTER TABLE anomaly_records ADD COLUMN reviewed_at DATETIME" },
  ];
  for (const m of migrations) {
    if (!colNames.includes(m.name)) {
      await run(m.sql);
    }
  }
}).catch(console.error);

module.exports = { run, get, all, exec, serialize };
