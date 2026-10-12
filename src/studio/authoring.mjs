import {id,clone,normaliseQuestion,validateQuestion,signature} from './shared/core.mjs';
import {YEARS} from './shared/catalogue.mjs';
export function blankQuestion(bankId){return normaliseQuestion({id:id('q'),stem:'',options:['','','','',''],answer:0,why:'',distractors:['','','','',''],module:'',topic:'',week:'',sources:[]},bankId);}
export function createDraft(title='Untitled collection'){const bankId=id('collection');return {id:bankId,setId:bankId,title,questions:[blankQuestion(bankId)],createdAt:Date.now(),updatedAt:Date.now(),status:'draft'};}
export function auditDraft(draft,otherQuestions=[]){const results=[],seen=new Map(),external=new Map(otherQuestions.filter(q=>q.collectionId!==draft.id).map(q=>[signature(q),q]));
  for(const [i,q]of draft.questions.entries()){const check=validateQuestion(q);if(!YEARS.includes(q.year))check.errors.push('Choose Year 1 or Year 2 for library placement.');if(!q.category?.trim())check.errors.push('Choose a subject category.');if(seen.has(signature(q)))check.errors.push(`Duplicates question ${seen.get(signature(q))+1} in this batch.`);seen.set(signature(q),i);
    if(external.has(signature(q)))check.errors.push('This question already exists in another published collection.');
    if(!q.reviewedAt)check.errors.push('Record your review date before publishing.');if(!q.sources?.length)check.errors.push('Add a source or review note before publishing.');
    results.push({index:i,uid:q.uid,...check});}
  return {results,errors:results.reduce((n,r)=>n+r.errors.length,0)+(draft.questions.length?0:1),warnings:results.reduce((n,r)=>n+r.warnings.length,0)};
}
export function contentSignature(q){const copy=clone(q);for(const key of ['revision','publishedAt','publishedSignature','publishedRevision','updatedAt','collection','collectionId'])delete copy[key];return JSON.stringify(copy);}
export function publicationDraft(draft){const result=clone(draft);result.questions=result.questions.map(q=>{const fingerprint=contentSignature(q);return {...q,revision:q.publishedRevision?(fingerprint===q.publishedSignature?q.publishedRevision:q.publishedRevision+1):1,collectionId:draft.id};});return result;}
export function markPublished(draft,published){draft.questions=draft.questions.map(q=>{const p=published.questions.find(x=>x.uid===q.uid);return {...q,revision:p.revision,publishedRevision:p.revision,publishedSignature:contentSignature(q)};});draft.status='published';draft.publishedAt=Date.now();draft.updatedAt=Date.now();return draft;}
export {generationPrompt} from './shared/generation-prompt.mjs';
