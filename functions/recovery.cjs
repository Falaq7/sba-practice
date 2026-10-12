const handleOf=value=>{const handle=String(value||'').trim().toLowerCase();if(!/^[a-z0-9_]{3,24}$/.test(handle))throw Error('Enter the exact username: 3–24 letters, numbers or underscores.');return handle;};
async function manageAccount(auth,db,serverTimestamp,caller,data){
  if(!caller?.uid||caller.token?.sbaPublisher!==true)throw Object.assign(Error('Owner access required.'),{code:'permission-denied'});
  const handle=handleOf(data.username);if(!['lookup','reset'].includes(data.operation))throw Error('Choose an account action.');
  const user=await auth.getUserByEmail(`${handle}@users.sba-workspace.app`);
  if(data.operation==='lookup')return {username:handle,uid:user.uid,disabled:!!user.disabled,createdAt:user.metadata?.creationTime||'',lastSignIn:user.metadata?.lastSignInTime||''};
  if(data.confirmUsername!==handle||data.identityConfirmed!==true)throw Error('Confirm the learner’s identity and exact username first.');
  if(!/^\d{4}$/.test(String(data.pin)))throw Error('Choose a temporary four-digit PIN.');
  if(user.disabled)throw Error('This account is disabled. Review it in Firebase before resetting access.');
  await auth.updateUser(user.uid,{password:`SBA4:${handle}:${data.pin}:workspace`});
  await auth.revokeRefreshTokens(user.uid);
  await db.doc(`profiles/${user.uid}`).set({pinResetRequired:true,updatedAt:serverTimestamp()},{merge:true});
  await db.collection('accountRecoveryLogs').add({targetUid:user.uid,ownerUid:caller.uid,createdAt:serverTimestamp()});
  return {username:handle,reset:true};
}
module.exports={manageAccount,handleOf};
