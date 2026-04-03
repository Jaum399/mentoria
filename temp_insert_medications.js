const fs=require('fs');
const path='c:/Users/Eliot_alderson/Desktop/app mentoria/server.js';
let t=fs.readFileSync(path,'utf8');
const marker='  db.run(`CREATE TABLE IF NOT EXISTS medications (';
if(t.includes(marker) && !t.includes('CREATE TABLE IF NOT EXISTS medication_logs')){
  const insert='  db.run(`CREATE TABLE IF NOT EXISTS medication_logs (\n    id INTEGER PRIMARY KEY AUTOINCREMENT,\n    user_id INTEGER,\n    medication_id INTEGER,\n    taken_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n    notes TEXT,\n    FOREIGN KEY (user_id) REFERENCES users (id),\n    FOREIGN KEY (medication_id) REFERENCES medications (id)\n  `);\n\n';
  t = t.replace(marker, insert + marker);
  fs.writeFileSync(path, t, 'utf8');
  console.log('medication_logs table added');
} else {
  console.log('no update needed');
}