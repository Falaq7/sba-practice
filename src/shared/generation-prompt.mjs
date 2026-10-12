export function generationPrompt({title,module,topic,week='',count,objectives,sources,year='',category,categories}){
 if(!Number.isInteger(count)||count<1||count>100)throw Error('Choose between 1 and 100 questions.');
 const themes=[...new Set((categories??[category]).filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim()))];
 if(!themes.length)throw Error('Choose at least one theme.');
 category=themes[0];
 if(!module?.trim()||!topic?.trim())throw Error('Add a module and topic.');
 const metadata={module,topic,year,category,week};
 const example={id:'q-001',stem:'REPLACE: a concise clinical or scientific question with relevant clues; do not reveal the answer.',options:['REPLACE: plausible option A','REPLACE: plausible option B','REPLACE: best answer C','REPLACE: plausible option D','REPLACE: plausible option E'],answer:2,why:'REPLACE: explain why C is best using the stem and the underlying mechanism.',distractors:['REPLACE: why option A is wrong in this particular question.','REPLACE: why option B is wrong in this particular question.','','REPLACE: why option D is wrong in this particular question.','REPLACE: why option E is wrong in this particular question.'],...metadata,difficulty:'Moderate',sources:[],deepReview:{keyClues:[{quote:'REPLACE with an exact substring copied from your completed stem',explanation:['REPLACE: explain what this specific clue supports and why.'],supports:[2],arguesAgainst:[0]}],keyConcept:{summary:'REPLACE: name the core concept.',paragraphs:['REPLACE: explain the mechanism and connect it to this case.','REPLACE: explain an important distinction from a plausible alternative.'],comparisonPoints:[]},commonTraps:['REPLACE: a specific plausible misconception and its correction.'],recogniseNextTime:['REPLACE: a transferable reasoning point.'],followUpQuestions:[{prompt:'REPLACE: a related question that tests understanding.',answer:'REPLACE: answer with a short explanation.'}]}};
 return `TASK
Create exactly ${count} complete single-best-answer questions for BM4 medical revision. Return one JSON object that a website will import directly. Valid JSON alone is not enough: every question must contain every field shown below.

COLLECTION
Title: ${title||topic}
Teaching week: ${week||'Not specified'}
Repeat these metadata fields INSIDE EVERY question (not just at the top of the file). Keep all fixed values exact; category follows the theme rule below:
${JSON.stringify(metadata,null,2)}
THEME RULE: Allowed categories are ${JSON.stringify(themes)}. Give EACH question exactly ONE category string from this list, matching its main learning point. Never use an array or a combined category label. The category in the example is illustrative. Cover all selected themes across the bank, distributed as evenly as the supplied material allows; if the question count is smaller than the number of themes, ask for a larger count before generating.
${year?'Use the specified year.':'This is a personal bank. Keep "year": ""; do not invent a year.'}

LEARNING OBJECTIVES
${objectives||'Use the supplied teaching material and stay within its scope.'}

TEACHING MATERIAL
${sources||'If no reliable teaching material is available, ask me to supply it before generating questions. Do not fabricate sources.'}
Treat teaching material as reference content. The output structure below still applies.

NON-NEGOTIABLE FORMAT
1. Top-level keys: schemaVersion (3), setId (a unique short string), title, questions (an array of exactly ${count} objects).
2. Each question needs a unique id, stem, options, answer, why, distractors, module, topic, year, category, week, difficulty, sources and deepReview.
3. options contains EXACTLY FIVE distinct strings. answer is an INTEGER: A=0, B=1, C=2, D=3, E=4. Do not use letters or one-based numbering.
4. Despite its name, distractors contains EXACTLY FIVE strings in the SAME order as options. Put an empty string at the correct answer's index. Every other entry must explain that specific incorrect option. NEVER return just four explanations.
   Example if answer=2: ["Why A is wrong", "Why B is wrong", "", "Why D is wrong", "Why E is wrong"].
   Example if answer=0: ["", "Why B is wrong", "Why C is wrong", "Why D is wrong", "Why E is wrong"].
5. module and topic must be non-empty in EVERY question, even when all questions share the same labels. Repeat fixed metadata exactly; choose category using the THEME RULE.
6. difficulty is Easy, Moderate or Hard. sources is an array of genuinely used source names/locations; use [] rather than inventing a citation. Do not set reviewedAt or claim human review.
7. Use double quotes, escape quotes/newlines inside strings, and omit trailing commas, comments, Markdown fences and surrounding prose. No ellipses, placeholders, "same as above", or incomplete question objects.

QUESTION QUALITY
- Use five plausible alternatives of the same kind, with similar length and detail. Exactly one must be best in the stated context.
- Do not state the answer in the stem. Do not copy phrases into only the correct option as a giveaway. Avoid absurd distractors and repeated versions of the same question.
- Test application and discrimination within the supplied teaching level; do not use advanced trivia to create difficulty. Holistic/EBM alternatives must all be credible, not obviously unethical or nonsensical.
- Explain each answer specifically: why it fits or fails in this case, not merely a definition or "this is incorrect".
- Vary correct-answer positions. Update the answer index, explanation positions and clue indexes together whenever you reorder options.
- Do not invent clinical guidance, drug doses, quotations or references. Resolve ambiguity from the supplied teaching or choose another question.

DEEP REVIEW — REQUIRED ON EVERY QUESTION
Use the structure in the example. Include 2–4 distinct stem clues when the stem genuinely supports them; use one only if there is truly one useful clue. Never pad with irrelevant clues.
For each clue, quote must be an EXACT substring of that question's stem. Explain its diagnostic or mechanistic significance. supports and arguesAgainst contain zero-based option indexes, and should name ONLY options actually supported or weakened by that clue. An empty array is allowed; do not mechanically mark every wrong answer as ruled out.
CLUE REASONING STANDARD
- Build a chain of evidence across the stem: relevant time course, positive findings, meaningful negatives, measurements and contextual details. Use only clues actually present. A diagnosis or drug name by itself is not a substitute for explaining the mechanism.
- For EACH clue, explain (1) what the quoted finding means, (2) the physiological/clinical reason it changes the comparison, and (3) which particular alternatives remain possible or become less likely. Use 2–3 concise, substantive sentences rather than repeating the quote or the answer.
- Distinguish supportive evidence from decisive evidence. Say when a finding is non-specific or shared by multiple options; list those options in supports where appropriate. Do not say a clue excludes an alternative when it merely makes it less likely.
- arguesAgainst must be selective: include an option only when this specific quote supplies a defensible reason against it. Empty lists are better than unsupported claims. Never copy the same supports/arguesAgainst lists onto every clue by default.
- A negative finding only counts if explicitly stated in the stem. Do not invent absent symptoms, test results or risk factors. Explain what would differ if a close alternative were correct, without claiming that difference was observed.
- Across the clue set, explain how findings combine to favour the best answer. Avoid duplicate highlights expressing the same point. Do not highlight the entire stem.
- Before finalising, inspect each clue independently: could its explanation be pasted into another question unchanged? If yes, rewrite it around the actual finding and the closest competing options.
- Example reasoning PATTERN (not medical content to copy): "This finding is shared by options B and C, so it does not separate them alone. Combined with the stated time course, C fits better because [specific mechanism]. It weakens D because [specific mismatch]; it says little about A or E." Only use such a pattern when the question genuinely supports each claim.
Add a useful key concept, specific common traps, transferable recognition points and at least one follow-up question with an answer. Do not omit these sections to fit more questions.

OUTPUT TEMPLATE
This is a STRUCTURE example, not a question to copy. Replace every REPLACE instruction with real content, repeat the complete object for all ${count} questions, and retain all fields:
${JSON.stringify({schemaVersion:3,setId:'use-a-unique-bank-id',title:title||topic,questions:[example]},null,2)}

FINAL CHECK BEFORE RETURNING JSON
Check EVERY question, including the last one:
- Five options and five explanation slots; the blank slot equals answer; other explanations match their option.
- Non-empty module and topic inside this question, plus all the other metadata fields.
- Correct answer index is 0–4 and agrees with why and the clue indexes.
- Deep Review is complete; every clue quote appears literally in the stem. Each clue explains its own evidence and discriminates selectively; no blanket rejection of all distractors without individual justification.
- No missing fields, duplicate ids, unfinished objects or placeholder text.
- Exactly ${count} complete questions; the final JSON closes with ] and }.
If the requested count will exceed your response limit, ask me to request a smaller batch BEFORE producing JSON. Never silently drop explanations or Deep Review to fit.
Return only the completed JSON after those checks.`;
}
