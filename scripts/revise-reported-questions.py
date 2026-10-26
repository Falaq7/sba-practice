"""Apply the agreed October report revisions and generate their review record."""
import base64, copy, json, math, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / 'content/library.json'
bank = json.loads(subprocess.check_output(['git', 'show', 'b3982135536877f89d69ab20f4dd52556c6c75fd:content/library.json'], cwd=ROOT))
before = copy.deepcopy(bank)
changes = {}

def revise(qid, stem, options, answer, why, distractors, clues, paragraphs, trap, follow, change, sources=()):
    q = next(q for q in bank['questions'] if q['id'] == qid)
    q.update(stem=stem, options=options, answer=answer, why=why, distractors=distractors,
             assessmentObjective=why, revision=q['revision']+1, reviewedAt='2026-10-25')
    q['deepReview'] = {
        'keyClues': [dict(quote=quote, explanation=[explanation], supports=supports, arguesAgainst=against)
                     for quote, explanation, supports, against in clues],
        'keyConcept': dict(summary=why, paragraphs=paragraphs, comparisonPoints=[]),
        'commonTraps': [trap], 'recogniseNextTime': [paragraphs[0]],
        'followUpQuestions': [dict(prompt=follow[0], answer=follow[1])], 'reviewVersion': 3}
    q['sources'] = list(dict.fromkeys([*q['sources'], *sources]))
    changes[qid] = change
    return q

revise('mb1-068',
    'A newborn has circulating maternal IgG against an infection to which the baby has never been exposed. Over the next few months, this antibody concentration falls. Which process best explains the fall?',
    ['Reduced antibody production as maternal plasma cells become inactive',
     'Replacement of the transferred IgG by an infant IgM response',
     'Breakdown of transferred IgG without replenishment by antigen-specific infant plasma cells',
     'Removal of IgG after binding to the infant’s antigen-specific memory B cells',
     'Redistribution of the transferred IgG from blood into mucosal secretions'], 2,
    'Maternal IgG provides passive protection. It is gradually broken down; transfer of antibody does not itself establish antigen-specific plasma cells or memory B cells in the infant.',
    ['Placental antibody transfer supplies IgG, rather than a population of maternal plasma cells producing it in the infant.',
     'A new infant IgM response requires stimulation of the infant’s immune system; it does not explain routine loss of transferred IgG.', '',
     'Passive antibody transfer does not itself generate antigen-specific memory B cells, and their binding is not the mechanism of antibody clearance.',
     'Redistribution to mucosal secretions is not the explanation for the progressive loss of passive protection.'],
    [('maternal IgG', 'The antibody was made by another individual: this is passive immunity.', [2], [0]),
     ('never been exposed', 'There is no stated active immune response to replenish this antibody.', [2], [1,3])],
    ['Distinguish the source of the antibody from the person receiving protection.',
     'Active immunisation stimulates the recipient’s lymphocytes. Passive immunisation supplies the antibody product, so protection can begin promptly but fades as antibody is cleared.'],
    'Do not assume that an antibody-positive person has made those antibodies or acquired immune memory.',
    ('What changes after successful active immunisation?', 'The recipient develops an antigen-specific response, including memory cells; later exposure can produce a more rapid response.'),
    'Replaced the answer-repeating stem with maternal IgG in a newborn. Options now test mechanisms of antibody loss rather than impossible antibody self-replication.',
    ['CDC, Principles of Vaccination — https://www.cdc.gov/pinkbook/hcp/table-of-contents/chapter-1-principles-of-vaccination.html'])

revise('mb1-036',
    'A child has both 46,XX and 47,XX,+21 cell populations. The embryo initially had a normal 46,XX chromosome complement. Which subsequent event best explains the trisomic cell population?',
    ['Failure of homologous chromosome 21 separation during maternal meiosis I',
     'Failure of chromosome 21 sister-chromatid separation during maternal meiosis II',
     'Loss of one chromosome 21 by anaphase lag in a trisomic embryonic cell',
     'A balanced Robertsonian fusion involving chromosomes 14 and 21 in an embryonic cell',
     'Failure of chromosome 21 sister-chromatid separation during embryonic mitosis'], 4,
    'Mitotic nondisjunction in a cell of an initially euploid embryo can produce a trisomic daughter cell. Descendants of unaffected cells retain 46 chromosomes, giving a mosaic pattern.',
    ['Maternal meiosis I occurs before fertilisation. An abnormal gamete would not explain a new trisomic lineage arising from the stated euploid embryo.',
     'Maternal meiosis II is part of gamete formation, not subsequent embryonic cell division.',
     'Trisomy rescue can generate a normal lineage from a trisomic embryo, but the question specifies the reverse starting point.',
     'A balanced Robertsonian fusion rearranges chromosomal material; it does not generate the specified 47-chromosome trisomy.', ''],
    [('initially had a normal 46,XX chromosome complement', 'The abnormal lineage must arise after fertilisation from a euploid starting point.', [4], [0,1,2]),
     ('47,XX,+21', 'The additional whole chromosome is consistent with segregation failure, not a balanced fusion.', [4], [3])],
    ['Use the starting chromosome complement and the timing of cell division to distinguish meiotic from mitotic errors.',
     'Mosaic trisomy can also arise through loss of a chromosome from an initially trisomic embryo. The initial normal complement is specified here so that trisomy rescue is not a second defensible answer.'],
    'Mosaicism alone does not prove that the embryo started euploid.',
    ('What does trisomy rescue mean?', 'Loss of an extra chromosome from a trisomic cell, potentially leaving a disomic cell lineage.'),
    'Kept mosaic nondisjunction but specified the embryo’s starting complement. Replaced point-mutation distractors with meiosis I, meiosis II, trisomy rescue and a Robertsonian rearrangement.',
    ['NHGRI, Mosaicism — https://www.genome.gov/genetics-glossary/Mosaicism'])

revise('mb1-032',
    'During CBT for weight management, a patient says, “If I do not snack after a stressful shift, I will stay tense all evening.” A diary has established the pattern. Which agreed task would most directly test this prediction?',
    ['Try a ten-minute walk after a shift and compare predicted with actual tension before deciding whether to snack',
     'Record snack portions and estimated calories after each shift for the next week',
     'Keep snacks in a less accessible cupboard and prepare portions at the start of the week',
     'List evidence for and against the thought that a difficult shift deserves a food reward',
     'Choose a non-food reward for meeting an agreed weekly snack-frequency target'], 0,
    'A behavioural experiment tests a specific prediction against experience. Trying another response and comparing expected with actual tension tests whether snacking is necessary for the tension to settle.',
    ['', 'Self-monitoring provides useful data, but this diary task does not test the prediction about remaining tense.',
     'Stimulus control changes access and cues; it does not directly compare the predicted emotional outcome with what happens.',
     'Cognitive restructuring examines a related appraisal. This task debates deserving a reward rather than testing the stated prediction in practice.',
     'Reinforcement can support behaviour change, but achieving a frequency target does not directly test the prediction about tension.'],
    [('I will stay tense all evening', 'This is a testable prediction about what will happen if the usual behaviour changes.', [0], [3]),
     ('A diary has established the pattern', 'The next task can move from monitoring to testing the maintaining belief.', [0], [1])],
    ['Match the CBT technique to its purpose: monitoring identifies patterns; an experiment tests a prediction.',
     'The patient and clinician agree a feasible alternative, record the prediction, try it and review the result. The outcome may support or weaken the belief; success is learning, not simply meeting a weight target.'],
    'Several options are legitimate behavioural strategies; identify which one tests this particular prediction.',
    ('What should be recorded before the experiment?', 'The predicted outcome, for example how tense the patient expects to feel if they try the alternative response.'),
    'Changed the task to identifying a behavioural experiment. All five options are plausible CBT or behaviour-change techniques; removed giveaway omissions.')

revise('mb1-055',
    'An ankle-vein pressure recording is taken while a person stands still and then walks. Calf contraction is normal, but the leg’s venous valves are incompetent. Compared with a person with competent valves, what is expected during walking?',
    ['A larger sustained fall in ankle venous pressure because blood leaves through more routes',
     'A smaller fall in ankle venous pressure because reflux refills emptied veins',
     'A similar fall in ankle venous pressure because calf contraction determines the response',
     'A smaller fall in ankle venous pressure because valve failure reduces arterial inflow',
     'A larger sustained fall in ankle venous pressure because venous capacitance increases'], 1,
    'Competent valves limit reflux after the calf pump ejects blood. Incompetent valves allow refilling from above, blunting the normal fall in distal venous pressure during walking.',
    ['Extra reflux pathways undermine sustained emptying; they do not improve the normal pressure reduction.', '',
     'Muscle contraction and valve competence work together. Normal contraction does not compensate fully for reflux.',
     'The mechanism is venous reflux, not a primary reduction in arterial inflow.',
     'Increased capacitance is not the mechanism by which valve incompetence affects the walking pressure response.'],
    [('Calf contraction is normal', 'The pump is active, so the question isolates the role of the valves.', [1], [2]),
     ('venous valves are incompetent', 'Reflux prevents the usual sustained emptying of the distal venous compartment.', [1], [0,3,4])],
    ['Predict pressure changes from both pump action and the direction permitted by valves.',
     'Walking normally reduces distal venous pressure relative to standing still. Compression generates transient pressure rises in the contracting muscle compartment; this should not be confused with the overall fall in distal ambulatory venous pressure.'],
    'Do not confuse pressure during a single contraction with sustained distal venous pressure over walking.',
    ('Why can prolonged venous hypertension cause ankle oedema?', 'Raised venous pressure increases capillary hydrostatic pressure and favours fluid filtration into tissues.'),
    'Replaced “how does the pump help?” with a prediction of walking venous pressure when valves fail, requiring application of the physiology.',
    ['Calf muscle pump pressure-flow cycle during ambulation — https://pmc.ncbi.nlm.nih.gov/articles/PMC12433825/',
     'Mechanisms of Vascular Disease, Chronic Venous Insufficiency — https://www.ncbi.nlm.nih.gov/books/NBK534282/'])

revise('mb1-044',
    'After hearing that their cancer has spread, a patient becomes tearful. The clinician allows a pause. The patient then says, “I thought the treatment had worked.” Which response best explores the patient’s perspective at this point?',
    ['“Would you like me to explain what the new scan shows?”',
     '“Would it help to hear about the treatments we can offer?”',
     '“What had you understood about the aim of the treatment?”',
     '“Would you like someone close to you to join us?”',
     '“What does this news mean for you at the moment?”'], 4,
    'The open invitation explores the meaning of the news for this patient. It follows their emotional cue without assuming whether the main concern is prognosis, family, treatment or something else.',
    ['Offering clarification is reasonable, but the patient has not yet identified a factual question about the scan.',
     'Treatment planning may follow, but this moves to solutions before the patient’s immediate concerns are understood.',
     'Checking prior understanding is useful. Here it narrows the discussion to treatment expectations rather than opening up the current impact of the news.',
     'Support from another person may help, but offering it does not itself explore the patient’s perspective.', ''],
    [('The clinician allows a pause', 'Space for the initial response has already been provided; choose what to say next.', [4], []),
     ('I thought the treatment had worked', 'This cue can carry several meanings. An open question lets the patient identify the most important one.', [4], [])],
    ['Respond to the patient’s cue with an invitation that allows their concerns to emerge.',
     'All five responses could have a place in the consultation. The distinction is the immediate purpose: exploring meaning rather than explaining the scan, planning treatment, checking previous understanding or arranging support.'],
    'Do not assume disappointment identifies a particular factual misunderstanding or the patient’s main worry.',
    ('When should the clinician move on to treatment options?', 'After exploring the response and checking whether the patient wants and is ready for that discussion.'),
    'Kept the bad-news situation but added a patient statement and a precise communication aim. Replaced insensitive actions with five credible clinician responses of similar length.',
    ['NCI, Communication in Cancer Care — https://www.cancer.gov/about-cancer/coping/adjusting-to-cancer/communication-hp-pdq'])

revise('mb1-045',
    'A patient receiving palliative care reports poor sleep despite good pain control. They say, “I am becoming a burden on my partner.” Which question would best guide the next step in a holistic assessment?',
    ['“Which personal-care tasks does your partner help you with?”',
     '“When you say burden, what are you most concerned about?”',
     '“How has your illness affected your household income?”',
     '“Have you been feeling low during the daytime as well?”',
     '“What support could other family members offer your partner?”'], 1,
    'Explore what “burden” means to this patient before choosing an intervention. It could refer to practical care, money, relationships, emotional distress or loss of meaning, each suggesting a different assessment and response.',
    ['This explores physical dependency, but assumes that care tasks are the concern behind the word “burden”.', '',
     'Financial assessment may be appropriate, but the patient has not yet identified finances as the concern.',
     'Mood assessment may be relevant, but the statement alone does not establish depression as the explanation.',
     'Family support may help, but this starts planning a solution before identifying the patient’s concern.'],
    [('good pain control', 'Poor sleep warrants assessment beyond pain intensity; it is not evidence to increase analgesia.', [], []),
     ('I am becoming a burden on my partner', 'The meaning is ambiguous. A clarifying question guides physical, psychological, social and spiritual assessment.', [1], [0,2,3,4])],
    ['Use the patient’s own language to identify which dimension of distress needs attention.',
     'If the concern proves financial, practical or benefits advice may help. If it concerns dependency, relationships or meaning, the assessment and support should follow that formulation instead.'],
    'A reasonable service or referral is not necessarily the right next step before the concern has been clarified.',
    ('Does good pain control exclude significant suffering?', 'No. Psychological, social and spiritual distress can persist despite control of physical pain.'),
    'Replaced the explicit finances-to-financial-help giveaway with the ambiguous word “burden”. All options are reasonable assessment questions; the task is to avoid prematurely assuming its meaning.',
    ['NCI, Communication in Cancer Care — https://www.cancer.gov/about-cancer/coping/adjusting-to-cancer/communication-hp-pdq'])

q = next(q for q in bank['questions'] if q['id']=='mb1-059')
revise(q['id'], q['stem'], q['options'], q['answer'],
    'Pancreatic lipase breaks triglycerides into fatty acids and monoglycerides. Bile salts help these poorly water-soluble products form mixed micelles, which carry them through the watery intestinal contents towards the enterocyte surface. Biliary obstruction impairs this delivery even when pancreatic enzymes are secreted.',
    ['Pepsin activation depends mainly on gastric acidity, not delivery of bile salts.',
     'Disaccharidases are brush-border enzymes that digest carbohydrates.',
     'Glucose absorption uses sodium-coupled transport rather than lipid micelles.', '',
     'Amylase digests starch; biliary obstruction does not directly remove pancreatic amylase secretion.'],
    [('obstruction of bile delivery', 'Loss of intestinal bile salts impairs micellar solubilisation.', [3], []),
     ('Pancreatic enzyme secretion is preserved', 'The stated defect is not lack of pancreatic lipase. Preserved enzyme secretion does not guarantee normal fat absorption.', [3], [4])],
    ['Separate triglyceride digestion by lipase from delivery of the digestion products for absorption.',
     'Bile salts also help emulsify fat, increasing the surface available for digestion. They are not digestive enzymes. Of the listed processes, micellar solubilisation is the one directly dependent on bile salts.',
     'Lipid products leave micelles at the enterocyte surface; the entire micelle is not absorbed intact. Long-chain lipids are then re-esterified and packaged into chylomicrons.'],
    'Preserved pancreatic secretion does not mean all steps of fat handling remain normal.',
    ('Why can bile obstruction cause deficiencies of vitamins A, D, E and K?', 'These fat-soluble vitamins rely on effective intestinal handling of lipids, including micellar solubilisation.'),
    'Kept the original stem, options and difficulty. Expanded the explanation into digestion → micellar delivery → absorption, and explained why preserved pancreatic enzymes do not solve the problem.',
    ['Fat Absorption and Lipid Metabolism in Cholestasis — https://www.ncbi.nlm.nih.gov/books/NBK6420/'])

revise('y2-w01-014',
    'A patient with RA has difficulty fastening clothes and preparing meals because of painful hands. Their partner is taking over these tasks, but the patient wants to remain as independent as possible. Which MDT input is most directly suited to assessing task adaptations and assistive equipment?',
    ['Occupational therapist', 'Physiotherapist', 'Rheumatology specialist nurse', 'Social worker', 'Clinical psychologist'], 0,
    'Occupational therapy addresses everyday activity and hand-function difficulties through task assessment, joint-protection strategies, adaptations and assistive equipment. The partner can support the agreed approach while preserving the patient’s independence.',
    ['', 'Physiotherapy is valuable for strength, mobility and exercise. The stated focus is adaptation of daily tasks and equipment.',
     'The specialist nurse supports education, treatment monitoring and access to advice; task and equipment assessment is most directly an occupational-therapy role.',
     'Social work can support care arrangements and social or financial needs; the requested input is practical adaptation of activities.',
     'Psychology can support coping and adjustment, but the specified need is assessment of tasks and assistive equipment.'],
    [('fastening clothes and preparing meals', 'These are activities of daily living affected by hand function.', [0], []),
     ('task adaptations and assistive equipment', 'This identifies the occupational-therapy focus within an overlapping MDT.', [0], [1,2,3,4])],
    ['Identify the main functional goal, then match it to the professional best placed to assess it.',
     'MDT roles overlap and several professionals may contribute. The question asks for the most directly suited input, not a claim that one profession has exclusive responsibility.'],
    'A rheumatology diagnosis does not make the specialist nurse the best answer to every support question.',
    ('How can an informal carer help without taking over?', 'With the patient’s agreement, support use of adaptations and the activities the patient wishes to continue doing independently.'),
    'Replaced the monitoring question and obviously poor care options with daily-task adaptation. The five answers are real MDT roles, testing occupational therapy versus other inputs.',
    ['NICE NG100, Recommendations 1.8.1–1.8.2 — https://www.nice.org.uk/guidance/ng100/chapter/Recommendations'])

revise('y2-w01-218',
    'A patient with RA is discussing treatment with a JAK inhibitor. Alongside serious infection and malignancy, which pair of adverse outcomes is associated with this drug class?',
    ['Major cardiovascular events and venous thromboembolism',
     'Retinal toxicity and corneal deposits',
     'Osteoporosis and posterior subcapsular cataracts',
     'Peptic ulceration and renal papillary injury',
     'Gingival overgrowth and hirsutism'], 0,
    'JAK inhibitors are associated with increased risks of major cardiovascular events and venous thromboembolism, as well as serious infection, malignancy and increased mortality. These class risks are explicitly covered in the arthritis teaching.',
    ['', 'This pair points towards antimalarial toxicity rather than the characteristic JAK-inhibitor risk profile.',
     'This is a characteristic long-term systemic glucocorticoid toxicity pairing.',
     'Gastrointestinal ulceration and renal injury are associated with NSAID use rather than this JAK-inhibitor risk pairing.',
     'Gingival overgrowth and hirsutism are classically associated with ciclosporin.'],
    [('JAK inhibitor', 'Recall the adverse-effect profile of targeted synthetic DMARDs.', [0], [1,2,3,4])],
    ['Learn the characteristic adverse-effect profile alongside each arthritis drug class.',
     'The teaching lists cardiovascular events, malignancy, venous thromboembolism, serious infections and mortality. The question tests those adverse effects rather than regulatory age cut-offs or prescribing exceptions.'],
    'Do not transfer a memorable toxicity from another arthritis treatment to JAK inhibitors.',
    ('What does JAK stand for?', 'Janus kinase; these inhibitors act on intracellular cytokine signalling.'),
    'Removed the 70-year-old smoker/MHRA prescribing-restriction stem. Now tests the JAK adverse-effect pair taught on slide 30, against plausible drug-toxicity pairs.',
    ['BM4 Year 2, Immunology & Pharmacology of rheumatoid arthritis – student version, slide 30.',
     'MHRA, JAK inhibitor safety review — https://www.gov.uk/drug-safety-update/janus-kinase-jak-inhibitors-new-measures-to-reduce-risks-of-major-cardiovascular-events-malignancy-venous-thromboembolism-serious-infections-and-increased-mortality'])

revise('y2-w01-003',
    'A 61-year-old with knee osteoarthritis has worked in several manual jobs. Which exposure in the occupational history is most strongly relevant to mechanical loading associated with knee OA?',
    ['Prolonged seated driving with frequent use of foot pedals',
     'Prolonged standing at a counter with the knees extended',
     'Repeated kneeling and squatting while laying flooring',
     'Frequent seated work with the knees held at a right angle',
     'Repeated short walks between workstations on level ground'], 2,
    'Repeated kneeling and squatting load the knees and are relevant occupational exposures for knee OA. Occupational loading can contribute alongside age, body weight, previous injury and other factors.',
    ['Pedal use involves the lower limb but is not the repeated loaded deep-flexion exposure described by kneeling and squatting.',
     'Standing can cause lower-limb symptoms, but repeated kneeling and squatting are the more characteristic knee-OA exposure among these choices.', '',
     'Seated knee flexion does not produce the same loading pattern as repeated weight-bearing kneeling and squatting.',
     'Ordinary short walks are not equivalent to prolonged occupational kneeling or repeated loaded deep flexion.'],
    [('knee osteoarthritis', 'Distinguish repeated loaded deep knee flexion from other common lower-limb postures and activities.', [2], [0,1,3,4])],
    ['Take an exposure history: the tasks, postures, loads and duration matter more than the job title alone.',
     'Identifying a relevant exposure supports assessment of risk and possible task modification. It does not establish work as the sole cause of disease.'],
    'Do not treat all manual work as the same exposure for every joint.',
    ('What else should be asked about the exposure?', 'How often and for how many years it occurred, associated lifting or injury, and how symptoms affect the person’s current work.'),
    'Replaced the balanced-versus-extreme causation options with five lower-limb work exposures. The distinction is repeated loaded knee flexion, rather than merely spotting the only option involving the knee.',
    ['HSE, Lower limb disorders — https://www.hse.gov.uk/msd/lld/index.htm'])

# Precisely plotted synthetic rhythm strip; no diagnosis is printed on the image.
# 12 seconds, P-P 0.75 s (80/min), R-R 12/7 s (35/min), independent phases.
W,H=2540,430
im=Image.new('RGB',(W,H),'white'); draw=ImageDraw.Draw(im)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',25)
x0,y0,pxmm=90,270,8
for x in range(x0,2491,pxmm):
    draw.line((x,65,x,365),fill='#e9a3ac' if (x-x0)%(5*pxmm)==0 else '#f8dbe0',width=1)
for y in range(70,366,pxmm):
    draw.line((x0,y,2490,y),fill='#e9a3ac' if (y-70)%(5*pxmm)==0 else '#f8dbe0',width=1)
draw.text((90,20),'Lead II     |     25 mm/s     10 mm/mV',font=font,fill='#222222')
draw.text((90,385),'Synthetic teaching trace • 12 seconds',font=font,fill='#333333')
def gauss(t,mu,sigma,amp): return amp*math.exp(-0.5*((t-mu)/sigma)**2)
points=[]
for i in range(6001):
    t=i/500
    v=sum(gauss(t,.22+j*.75,.035,.18) for j in range(16))
    for j in range(7):
        r=.68+j*12/7
        v+=gauss(t,r-.035,.012,-.15)+gauss(t,r,.018,1.15)+gauss(t,r+.045,.016,-.30)+gauss(t,r+.30,.075,.28)
    points.append((x0+t*200,y0-v*80))
draw.line(points,fill='#18212b',width=3)
asset=ROOT/'content/assets/rhythm-007.png'; asset.parent.mkdir(exist_ok=True)
im.save(asset,optimize=True)
q=next(q for q in bank['questions'] if q['id']=='mb1-007')
q=revise(q['id'],
    'A 76-year-old presents with recurrent light-headedness. The rhythm strip below is recorded at 25 mm/s and 10 mm/mV. Which diagnosis best fits?',
    q['options'],q['answer'],
    'The strip shows regular P waves at about 80/min and a slower regular QRS rhythm at about 35/min. The P waves march through independently, with changing apparent PR intervals. This supports complete heart block with an escape rhythm.',
    q['distractors'],
    [('rhythm strip below', 'On the trace, compare P–P and R–R intervals separately. The atrial and ventricular rhythms are regular but independent.', [1], [0,2,3,4])],
    ['Measure atrial rate, ventricular rate and their relationship separately.',
     'At 25 mm/s, one large square represents 0.2 seconds. P waves recur every 0.75 seconds; QRS complexes recur about every 1.71 seconds. Some P waves overlap QRS or T waves because the rhythms are independent.'],
    'One P wave appearing just before a QRS does not establish conduction; inspect the relationship across the full strip.',
    ('How does first-degree AV block differ?', 'Every P wave conducts, with a prolonged but consistent PR interval.'),
    'Removed the textual description of AV dissociation and added a calibrated, zoomable 12-second ECG. Retained the five existing diagnostic options.')
q['image']=dict(src='data:image/png;base64,'+base64.b64encode(asset.read_bytes()).decode(),
    alt='Lead II rhythm strip, 12 seconds at 25 mm/s and 10 mm/mV. Small atrial deflections recur every 0.75 seconds and QRS complexes every 1.71 seconds, with varying alignment.',
    caption='Lead II rhythm strip. Enlarge to inspect the trace.',credit='Original synthetic teaching trace; not a patient recording.')

for r in bank['releases']:
    if any(q['id'] in changes and q['collectionId']==r['id'] for q in bank['questions']):
        r['currentVersion'] += '-feedback-20261025'

path.write_text(json.dumps(bank,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
lines=['# Question report revisions — 25 October 2026','',
       '11 questions revised. The methotrexate dosing question remains removed. Original identifiers and learning objectives are preserved.','']
for q in bank['questions']:
    if q['id'] not in changes: continue
    old=next(x for x in before['questions'] if x['id']==q['id'])
    lines += [f"## {q['collection']} · {q['id']} · {q['topic']}",'', '**Previous stem**', '',old['stem'],'','**Current stem**','',q['stem'],'','**What changed**','',changes[q['id']],'','**Current options**','']
    lines += [f"{chr(65+i)}. {o}" for i,o in enumerate(q['options'])]
    lines += ['',f"**Answer: {chr(65+q['answer'])}.** {q['why']}",'','**Learning objective**','',*q['lo'],'']
    if q['id']=='mb1-007': lines+=['![Synthetic ECG](../content/assets/rhythm-007.png)','']
out=ROOT/'docs/feedback-revisions-2026-10-25.md';out.parent.mkdir(exist_ok=True)
out.write_text('\n'.join(lines),encoding='utf-8')
print(json.dumps({'revised':list(changes),'ecgBytes':asset.stat().st_size,'total':len(bank['questions'])}))
