import test from 'node:test';
import assert from 'node:assert/strict';
import {safeEvent} from '../dist/public/usage.mjs';
test('usage events discard answers, credentials, titles and unknown event names',()=>{assert.equal(safeEvent('private_note',{text:'private'}),null);assert.deepEqual(safeEvent('sba_practice_start',{question_count:20,practice_mode:'learn',username:'private',pin:'0000',answer:'A',topic:'private'}),{name:'sba_practice_start',params:{question_count:20,practice_mode:'learn'}});assert.deepEqual(safeEvent('sba_bank_practised',{bank_id:'bank-123',bank_title:'private'}).params,{bank_id:'bank-123'});});
test('usage values are bounded and routes cannot include private session identifiers',()=>{assert.deepEqual(safeEvent('sba_section_view',{section:'session=private'}).params,{});assert.deepEqual(safeEvent('sba_practice_complete',{question_count:-1,answered_count:Infinity}).params,{});assert.deepEqual(safeEvent('sba_bank_practised',{bank_id:'person@example.com'}).params,{});});

