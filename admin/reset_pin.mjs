import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const projectId='sba-workspace';
const keyPath=process.env.SBA_FIREBASE_ADMIN_KEY;
if(!keyPath)throw new Error('Set SBA_FIREBASE_ADMIN_KEY to the private service-account JSON file. See admin/README.md.');

const serviceAccount=JSON.parse(await readFile(resolve(keyPath),'utf8'));
initializeApp({credential:cert(serviceAccount),projectId});

const prompt=createInterface({input,output});
const cleanHandle=value=>String(value||'').trim().toLowerCase().replace(/[^a-z0-9_]/g,'').slice(0,24);
const cloudCredential=(handle,pin)=>`SBA4:${handle}:${pin}:workspace`;

try{
  const entered=await prompt.question('Username to reset: '),handle=cleanHandle(entered);
  if(handle.length<3||handle!==entered.trim().toLowerCase())throw new Error('Enter the exact account username using letters, numbers or underscores.');
  const enteredPin=await prompt.question('Temporary four-digit PIN [1234]: '),pin=enteredPin.trim()||'1234';
  if(!/^\d{4}$/.test(pin))throw new Error('The temporary PIN must contain exactly four digits.');
  const confirmation=await prompt.question(`Type RESET ${handle} to confirm: `);
  if(confirmation!==`RESET ${handle}`)throw new Error('Reset cancelled: confirmation did not match.');
  const user=await getAuth().getUserByEmail(`${handle}@users.sba-workspace.app`);
  await getAuth().updateUser(user.uid,{password:cloudCredential(handle,pin)});
  await getAuth().revokeRefreshTokens(user.uid);
  await getFirestore().doc(`profiles/${user.uid}`).set({pinResetRequired:true,updatedAt:FieldValue.serverTimestamp()},{merge:true});
  output.write(`\nPIN reset for @${handle}. They can sign in with ${pin} and will be asked to change it.\n`);
} finally {
  prompt.close();
}
