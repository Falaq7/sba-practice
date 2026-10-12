import {pct,unique,meanAnswerSeconds} from './core.mjs';
export function breakdown(stats,library,field='topic',since=0){
 const label=q=>q[field]||'Uncategorised',rows=stats.rows.filter(r=>r.answeredAt>=since),firstIds=new Set(stats.first.map(r=>r.sessionId+'|'+r.key));
 return unique([...library.map(label),...rows.map(r=>label(r.q))]).map(name=>{
  const rs=rows.filter(r=>label(r.q)===name),available=new Set(library.filter(q=>label(q)===name).map(q=>q.uid)),seen=new Set(rs.map(r=>r.uid)),first=rs.filter(r=>firstIds.has(r.sessionId+'|'+r.key)),repeat=rs.filter(r=>!firstIds.has(r.sessionId+'|'+r.key)),latest=new Map(rs.map(r=>[r.uid,r]));
  const accuracy=items=>pct(items.filter(r=>r.correct).length,items.length),recent=rs.slice(-20),previous=rs.slice(-40,-20);
  const correct=rs.filter(r=>r.correct).length;
  return {name,correct,incorrect:rs.length-correct,accuracy:accuracy(rs),answered:rs.length,distinct:seen.size,available:available.size,covered:[...seen].filter(uid=>available.has(uid)).length,first:accuracy(first),firstN:first.length,repeat:accuracy(repeat),repeatN:repeat.length,recent:accuracy(recent),recentN:recent.length,change:recent.length>=5&&previous.length>=5?accuracy(recent)-accuracy(previous):null,review:[...latest.values()].filter(r=>!r.correct||['Guess','Unsure'].includes(r.confidence)).length,seconds:meanAnswerSeconds(rs)};
 }).sort((a,b)=>b.review-a.review||(a.first??101)-(b.first??101)||a.name.localeCompare(b.name));
}
export function weeklyActivity(rows,now=Date.now()){
 const today=new Date(now);today.setHours(0,0,0,0);today.setDate(today.getDate()-((today.getDay()+6)%7));
 return Array.from({length:6},(_,i)=>{const start=new Date(today);start.setDate(start.getDate()-(5-i)*7);const end=new Date(start);end.setDate(end.getDate()+7);const items=rows.filter(r=>r.answeredAt>=start.getTime()&&r.answeredAt<end.getTime());return {start:start.getTime(),label:start.toLocaleDateString('en-GB',{day:'numeric',month:'short'}),answered:items.length,correct:items.filter(r=>r.correct).length};});
}
