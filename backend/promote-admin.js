import {openDb} from './db.js';
const email=String(process.argv[2]||'').trim().toLowerCase();
if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){
 console.error('Usage: node backend/promote-admin.js user@example.com');
 process.exit(2);
}
const db=openDb();
const r=db.prepare("UPDATE users SET role='admin' WHERE email=?").run(email);
if(!r.changes){console.error('No account found for that email. Create the account in SoulSpace first.');process.exit(1)}
console.log(`Administrator role granted to ${email}. Keep this account secure.`);
