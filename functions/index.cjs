const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {initializeApp}=require('firebase-admin/app');
const {getAuth}=require('firebase-admin/auth');
const {getFirestore,FieldValue}=require('firebase-admin/firestore');
const {manageAccount}=require('./recovery.cjs');
initializeApp();
exports.manageSbaAccount=onCall({region:'europe-west2',maxInstances:2},async request=>{try{return await manageAccount(getAuth(),getFirestore(),()=>FieldValue.serverTimestamp(),request.auth,request.data||{});}catch(e){if(e.code==='permission-denied')throw new HttpsError('permission-denied','Owner access required.');if(e.code==='auth/user-not-found')throw new HttpsError('not-found','No account has that username. Check it with the learner.');if(e.code)throw new HttpsError('internal','The reset could not complete. Check Firebase before trying again.');throw new HttpsError('invalid-argument',e.message);}});
