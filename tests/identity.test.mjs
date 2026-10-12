import test from 'node:test';
import assert from 'node:assert/strict';
import {pinCredentials,usernameFor} from '../src/shared/identity.mjs';
import {Cloud} from '../src/shared/cloud.mjs';
test('username/PIN credentials preserve leading zeros and ignore username case',()=>{const a=pinCredentials(' Student_12 ','0012',{signup:true}),b=pinCredentials('student_12','0012');assert.deepEqual(a,b);assert.match(a.password,/:0012:/);assert.equal(usernameFor({email:a.email}),'student_12');});
test('signup requires four digits and rejects email/invalid usernames',()=>{assert.throws(()=>pinCredentials('a@b.com','123456',{signup:true}),/username/);assert.throws(()=>pinCredentials('student','12345',{signup:true}),/four-digit/);assert.throws(()=>pinCredentials('student','abc123',{signup:true}),/four-digit/);assert.doesNotThrow(()=>pinCredentials('Falaq','1234'));});
test('student signup and sign-in use the same account identity',async()=>{const cloud=new Cloud({}),calls=[];cloud.ready=true;cloud.auth={};cloud.api={createUserWithEmailAndPassword:async(_,email,password)=>calls.push({email,password}),signInWithEmailAndPassword:async(_,email,password)=>calls.push({email,password})};await cloud.signUpPin('Student_12','0012');await cloud.signInPin('student_12','0012');assert.deepEqual(calls[0],calls[1]);assert.equal(calls[0].email,'student_12@users.sba-workspace.app');});
