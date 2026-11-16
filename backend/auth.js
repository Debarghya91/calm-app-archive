import crypto from 'node:crypto';
export const hash=pw=>{const s=crypto.randomBytes(16);return s.toString('hex')+':'+crypto.scryptSync(pw,s,64).toString('hex')};
export const verify=(pw,h)=>{const[s,k]=h.split(':');return crypto.timingSafeEqual(crypto.scryptSync(pw,Buffer.from(s,'hex'),64),Buffer.from(k,'hex'))};
export const newToken=()=>crypto.randomBytes(32).toString('hex');
