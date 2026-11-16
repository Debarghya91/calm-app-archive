import {DatabaseSync} from 'node:sqlite'; import fs from 'node:fs'; import path from 'node:path'; import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
export function openDb(file=process.env.DB_FILE||path.join(dir,'soulspace.db')){
  const db=new DatabaseSync(file); db.exec('PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS _mig(name TEXT PRIMARY KEY)');
  for(const f of fs.readdirSync(path.join(dir,'migrations')).sort()){
    if(db.prepare('SELECT 1 FROM _mig WHERE name=?').get(f))continue;
    db.exec(fs.readFileSync(path.join(dir,'migrations',f),'utf8')); db.prepare('INSERT INTO _mig VALUES(?)').run(f)}
  return db}
