export const YEARS=['Year 1','Year 2'];
export const CATEGORIES=['Anatomy','Physiology','Clinical','Pharmacology','Biochemistry','Pathology','Microbiology','Other'];
export function yearLabel(value){return ({'1':'Year 1','2':'Year 2','year 1':'Year 1','year 2':'Year 2','y1':'Year 1','y2':'Year 2'})[String(value||'').trim().toLowerCase()]||'';}
export function categoryLabel(value){const text=String(value||'').trim();return CATEGORIES.find(x=>x.toLowerCase()===text.toLowerCase())||({'pharma':'Pharmacology','clinical medicine':'Clinical'})[text.toLowerCase()]||text;}
export function placement(questions){return {years:YEARS.filter(y=>questions.some(q=>yearLabel(q.year)===y)),categories:[...new Set(questions.map(q=>categoryLabel(q.category)).filter(Boolean))],yearCounts:Object.fromEntries(YEARS.map(y=>[y,questions.filter(q=>yearLabel(q.year)===y).length]))};}
