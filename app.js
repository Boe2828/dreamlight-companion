const CATEGORIES = [
{id:'characters',name:'Personnages',icon:'👑',file:'characters.json',description:'Tes personnages, leur amitié et leur rôle.'},
{id:'recipes',name:'Recettes',icon:'🍲',file:'recipes.json',description:'Recettes, ingrédients, énergie et prix de vente.'},
{id:'resources',name:'Ressources',icon:'💎',file:'resources.json',description:'Fleurs, gemmes, bois, poissons, fruits et autres ressources.'},
{id:'crops',name:'Cultures',icon:'🌱',file:'crops.json',description:'Graines, prix, temps de pousse, récoltes et lieux de culture.'},
{id:'biomes',name:'Biomes',icon:'🌳',file:'biomes.json',description:'Déblocage, améliorations, étals, habitants et ressources.'},
{id:'realms',name:'Château & royaumes',icon:'🏰',file:'realms.json',description:'Portes du château, royaumes, personnages et éléments débloqués.'},
{id:'crafting',name:'Artisanat',icon:'🛠️',file:'crafting.json',description:'Objets à fabriquer et matériaux nécessaires.'},
{id:'collections',name:'Collections',icon:'👗',file:'collections.json',description:'Vêtements, accessoires, motifs, meubles et décorations obtenus.'},
{id:'creatures',name:'Créatures',icon:'🐿️',file:'creatures.json',description:'Espèces, nourriture préférée, horaires et compagnons.'},
{id:'quests',name:'Quêtes',icon:'📜',file:'quests.json',description:'Histoire principale, quêtes des personnages et devoirs permanents.'},
{id:'currencies',name:'Dreamlight & monnaies',icon:'✨',file:'currencies.json',description:'À quoi servent les monnaies et comment les obtenir.'}
];

const STORAGE_KEY='dreamlight-companion-v1';

const ROLES=[
{id:'jardinage',label:'Jardinage',image:'assets/roles/jardinage.png'},
{id:'minage',label:'Extraction',image:'assets/roles/extraction.png'},
{id:'peche',label:'Pêche',image:'assets/roles/peche.png'},
{id:'recolte',label:'Cueillette',image:'assets/roles/cueillette.png'},
{id:'creusage',label:'Excavation',image:'assets/roles/excavation.png'}
];

function roleIcon(r){
  return `<img src="${r.image}" alt="${r.label}" style="display:block;width:46px;height:46px;max-width:46px;max-height:46px;object-fit:contain;">`;
}

const defaultState={
checks:{},
currencies:{starCoins:'',dreamlight:''},
sessions:[],
activeSession:null,
notes:'',
tasks:[
{id:'discussions',label:'Faire les discussions quotidiennes avec les personnages'},
{id:'gift',label:'Offrir les cadeaux préférés du jour'},
{id:'harvest',label:'Récolter les cultures'},
{id:'resources',label:'Ramasser les ressources'},
{id:'animals',label:'Nourrir les animaux'},
{id:'dreamlight',label:'Faire les tâches Dreamlight'},
{id:'shop',label:'Visiter la boutique de Picsou'},
{id:'remy',label:'Vérifier les commandes de Chez Rémy'},
{id:'vaiana-boat',label:'Récupérer les poissons et objets du bateau de Vaiana'}
],
tasksVersion:2,
taskChecks:{},
taskDate:new Date().toLocaleDateString('fr-CA'),
characterProgress:{},
goals:[]
};

let state=loadState(),
catalogData={},
filters={
search:'',
unlocked:'all',
friendship:'all',
role:'all',
biome:'all',
show:true
};

let characterListScrollY=0;

function getPageScrollY(){
return Math.max(
window.pageYOffset || 0,
document.documentElement.scrollTop || 0,
document.body.scrollTop || 0
);
}

function restorePageScrollY(){
const html=document.documentElement;
const previousBehavior=html.style.scrollBehavior;

html.style.scrollBehavior='auto';

requestAnimationFrame(()=>{
window.scrollTo(0,characterListScrollY);

requestAnimationFrame(()=>{
window.scrollTo(0,characterListScrollY);
html.style.scrollBehavior=previousBehavior;
});
});
}
let currentCharacterId=null;

function loadState(){
try{
const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
const loaded={...defaultState,...saved};

if((saved.tasksVersion||0)<2){
const previousDefaultIds=['gift','shop','harvest','valley'];
const previousTasks=Array.isArray(saved.tasks)?saved.tasks:[];
const previousById=Object.fromEntries(previousTasks.map(t=>[t.id,t]));

const migratedDefaults=defaultState.tasks.map(task=>({
...task,
label:previousById[task.id]?.label||task.label
}));

const customTasks=previousTasks.filter(task=>
!previousDefaultIds.includes(task.id)&&
!migratedDefaults.some(defaultTask=>defaultTask.id===task.id)
);

loaded.tasks=[...migratedDefaults,...customTasks];
loaded.tasksVersion=2;
}

if(!Array.isArray(loaded.tasks))loaded.tasks=structuredClone(defaultState.tasks);
if(!loaded.taskChecks||typeof loaded.taskChecks!=='object')loaded.taskChecks={};

return loaded;
}catch{
return structuredClone(defaultState);
}
}
function saveState(){
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
updateProgress();
}
function formatSessionDate(date){
return new Date(date).toLocaleDateString('fr-FR',{
day:'2-digit',
month:'2-digit',
year:'numeric'
});
}

function formatSessionTime(date){
return new Date(date).toLocaleTimeString('fr-FR',{
hour:'2-digit',
minute:'2-digit'
});
}

function formatSessionDuration(start,end){
const minutes=Math.max(0,Math.floor((new Date(end)-new Date(start))/60000));
const hours=Math.floor(minutes/60);
const remaining=minutes%60;

return hours>0
?`${hours} h ${remaining.toString().padStart(2,'0')} min`
:`${remaining} min`;
}

function formatSessionGain(value){
const sign=value>0?'+':'';
return sign+value.toLocaleString('fr-FR');
}

function renderSessions(){
const startArea=document.getElementById('session-start-area');
const activeArea=document.getElementById('session-active-area');
const historyArea=document.getElementById('session-history');

if(!startArea||!activeArea||!historyArea)return;

if(state.activeSession){
const session=state.activeSession;

startArea.classList.add('hidden');
activeArea.classList.remove('hidden');

activeArea.innerHTML=`
<div class="session-active">
<strong>Session en cours</strong>
<p>Commencée le ${formatSessionDate(session.startedAt)}
à ${formatSessionTime(session.startedAt)}</p>

<p>Pièces étoiles au départ :
<strong>${session.startCoins.toLocaleString('fr-FR')}</strong></p>

<p>Dreamlight au départ :
<strong>${session.startDreamlight.toLocaleString('fr-FR')}</strong></p>

<form id="session-end-form" class="session-form">
<label for="session-end-coins">Pièces étoiles à la fin</label>
<input id="session-end-coins" type="number" min="0"
inputmode="numeric" placeholder="Quantité" required>

<label for="session-end-dreamlight">Dreamlight à la fin</label>
<input id="session-end-dreamlight" type="number" min="0"
inputmode="numeric" placeholder="Quantité" required>

<button class="small-button" type="submit">
Terminer la session
</button>
</form>
</div>
`;
}else{
startArea.classList.remove('hidden');
activeArea.classList.add('hidden');
activeArea.innerHTML='';
}

if(!state.sessions.length){
historyArea.innerHTML=`
<p class="muted">Aucune session enregistrée pour le moment.</p>
`;
return;
}

historyArea.innerHTML=`
<div class="session-history">
<h3>Historique des sessions</h3>

${state.sessions.map(session=>`
<div class="session-history-item">
<strong>${formatSessionDate(session.startedAt)}</strong>

<p>${formatSessionTime(session.startedAt)}
– ${formatSessionTime(session.endedAt)}</p>

<p>Durée : <strong>${formatSessionDuration(session.startedAt,session.endedAt)}</strong></p>

<p>Pièces étoiles :
<strong>${formatSessionGain(session.endCoins-session.startCoins)}</strong></p>

<p>Dreamlight :
<strong>${formatSessionGain(session.endDreamlight-session.startDreamlight)}</strong></p>
</div>
`).join('')}
</div>
`;
}

function startSession(coins,dreamlight){
state.activeSession={
id:Date.now(),
startedAt:new Date().toISOString(),
startCoins:coins,
startDreamlight:dreamlight
};

saveState();
renderSessions();
}

function endSession(coins,dreamlight){
if(!state.activeSession)return;

const session={
...state.activeSession,
endedAt:new Date().toISOString(),
endCoins:coins,
endDreamlight:dreamlight
};

state.sessions.unshift(session);
state.activeSession=null;

saveState();
renderSessions();
}

function escapeHTML(v=''){
return String(v).replace(/[&<>"']/g,c=>({
'&':'&amp;',
'<':'&lt;',
'>':'&gt;',
'"':'&quot;',
"'":'&#39;'
}[c]));
}

function progress(ch){
return state.characterProgress[ch.id]||{
unlocked:false,
friendship_level:0,
assigned_role:null,
current_home_biome:''
};
}

function isComplete(item,cat){
return cat==='characters'
?progress(item).unlocked
:!!state.checks[item.id];
}

function categoryStats(c){
const a=catalogData[c.id]||[];
const done=a.filter(x=>isComplete(x,c.id)).length;
return {
done,
total:a.length,
pct:a.length?Math.round(done/a.length*100):0
};
}

function renderCategories(q=''){
const grid=document.getElementById('category-grid');
const s=(q||'').trim().toLocaleLowerCase('fr');

grid.innerHTML=CATEGORIES
.filter(c=>
!s||
c.name.toLocaleLowerCase('fr').includes(s)||
(catalogData[c.id]||[]).some(x=>
(x.name||'').toLocaleLowerCase('fr').includes(s)
)
)
.map(c=>{
const z=categoryStats(c);
return `
<button class="category-card" data-category="${c.id}">
<span class="category-top">
<span class="category-icon">${c.icon}</span>
<span class="category-progress">${z.total?z.pct+' %':'À compléter'}</span>
</span>
<strong>${c.name}</strong>
<span class="category-progress">
${z.total?z.done+' / '+z.total+' découverts':'Catalogue en préparation'}
</span>
</button>`;
})
.join('');

grid.querySelectorAll('[data-category]').forEach(b=>{
b.onclick=()=>openCategory(b.dataset.category);
});
}

function updateProgress(){
const all=CATEGORIES.flatMap(c=>
(catalogData[c.id]||[]).map(item=>({item,cat:c.id}))
);

const done=all.filter(x=>isComplete(x.item,x.cat)).length;
const p=all.length?Math.round(done/all.length*100):0;

document.getElementById('overall-percent').textContent=p+' %';
document.getElementById('overall-bar').style.width=p+'%';

renderCategories(document.getElementById('global-search').value);
}

async function loadCatalogs(){
await Promise.all(CATEGORIES.map(async c=>{
try{
const r=await fetch('data/'+c.file+'?v=20261127-2',{cache:'no-store'});
if(!r.ok)throw Error();
const d=await r.json();
catalogData[c.id]=Array.isArray(d)?d:[];
}catch{
catalogData[c.id]=[];
}
}));

renderCategories();
updateProgress();
}

function openCategory(id){
const c=CATEGORIES.find(x=>x.id===id);
if(!c)return;

currentCharacterId=null;
characterListScrollY=getPageScrollY();

document.getElementById('catalog-title').textContent=c.name;
document.getElementById('catalog-description').textContent=c.description;
document.getElementById('catalog-view').classList.remove('hidden');

id==='characters'?renderCharacters():renderGeneric(id);

document.getElementById('catalog-view').scrollIntoView({
behavior:'smooth',
block:'start'
});
}

function renderGeneric(id){
const c=CATEGORIES.find(x=>x.id===id);
const a=catalogData[id]||[];
const host=document.getElementById('catalog-items');

host.innerHTML=a.length
?a.map(x=>`
<label class="catalog-item">
<span class="item-icon">${escapeHTML(x.icon||c.icon)}</span>
<span class="item-copy">
<strong>${escapeHTML(x.name||'Élément sans nom')}</strong>
<small>${escapeHTML(x.description||x.category||'')}</small>
</span>
<input class="item-check" type="checkbox"
data-check="${escapeHTML(x.id)}"
${state.checks[x.id]?'checked':''}>
</label>
`).join('')
:'<p class="muted">Cette liste sera remplie avec le catalogue français du jeu. Aucun élément n’est précoché.</p>';

host.querySelectorAll('[data-check]').forEach(el=>{
el.onchange=()=>{
state.checks[el.dataset.check]=el.checked;
saveState();
};
});
}

function filteredCharacters(){
return (catalogData.characters||[]).filter(ch=>{
const p=progress(ch);
const q=filters.search.toLocaleLowerCase('fr');

if(q&&
!ch.name.toLocaleLowerCase('fr').includes(q)&&
!(ch.universe||'').toLocaleLowerCase('fr').includes(q)
)return false;

if(filters.unlocked==='yes'&&!p.unlocked)return false;
if(filters.unlocked==='no'&&p.unlocked)return false;

if(filters.friendship!=='all'&&
String(p.friendship_level)!==filters.friendship
)return false;

if(filters.role!=='all'&&p.assigned_role!==filters.role)
return false;

if(filters.biome!=='all'&&
(p.current_home_biome||'')!==filters.biome
)return false;

return true;
});
}

function renderCharacters(restoreScroll=false){
const host=document.getElementById('catalog-items');
const list=filteredCharacters();

const biomes=[
...new Set(
(catalogData.characters||[])
.map(x=>progress(x).current_home_biome)
.filter(Boolean)
)
].sort((a,b)=>a.localeCompare(b,'fr'));

host.innerHTML=`
<div class="character-toolbar">
<label class="character-search">
⌕
<input id="character-search" type="search"
placeholder="Rechercher un personnage…"
value="${escapeHTML(filters.search)}">
</label>
<button class="character-filter-toggle" id="toggle-filters">
⚙ Filtres
</button>
</div>

<div class="character-filters ${filters.show?'':'is-collapsed'}"
id="character-filters">

<label>Déblocage
<select id="f-unlocked">
<option value="all">Tous</option>
<option value="yes">Débloqués</option>
<option value="no">Non débloqués</option>
</select>
</label>

<label>Niveau d'amitié
<select id="f-friendship">
<option value="all">Tous les niveaux</option>
${Array.from({length:11},(_,i)=>
`<option value="${i}">${i}/10</option>`
).join('')}
</select>
</label>

<label>Rôle principal
<select id="f-role">
<option value="all">Tous les rôles</option>
${ROLES.map(r=>
`<option value="${r.id}">${r.label}</option>`
).join('')}
</select>
</label>

<label>Biome
<select id="f-biome">
<option value="all">Tous les biomes</option>
${biomes.map(b=>
`<option value="${escapeHTML(b)}">${escapeHTML(b)}</option>`
).join('')}
</select>
</label>

<button class="character-reset" id="reset-filters">
Réinitialiser les filtres
</button>
</div>

<p class="character-count">
${list.length} personnage(s) affiché(s) sur
${(catalogData.characters||[]).length}
</p>

<div class="character-grid">
${list.map(ch=>{
const p=progress(ch);
const r=ROLES.find(x=>x.id===p.assigned_role);

return `
<button class="character-card"
data-character="${ch.id}" type="button">

<span class="character-avatar">
${ch.image
?`<img src="${escapeHTML(ch.image)}" alt="">`
:'✦'}
</span>

<strong>${escapeHTML(ch.name)}</strong>

<span class="character-status ${p.unlocked?'is-unlocked':'is-locked'}">
${p.unlocked?'Débloqué':'Non débloqué'}
</span>

<span class="character-level">
Amitié ${p.friendship_level}/10
</span>

<span class="character-role">
${r?`${roleIcon(r)}<small>${r.label}</small>`:'Rôle non attribué'}
</span>

</button>`;
}).join('')}
</div>

${list.length?'':'<p class="muted">Aucun personnage ne correspond à ces critères.</p>'}
`;

const search=host.querySelector('#character-search');

search.oninput=e=>{
filters.search=e.target.value;
const pos=e.target.selectionStart;

renderCharacters();

const n=host.querySelector('#character-search');
n.focus();
n.setSelectionRange(pos,pos);
};

host.querySelector('#toggle-filters').onclick=()=>{
filters.show=!filters.show;
renderCharacters();
};

[
['f-unlocked','unlocked'],
['f-friendship','friendship'],
['f-role','role'],
['f-biome','biome']
].forEach(([id,k])=>{
const el=host.querySelector('#'+id);
el.value=filters[k];
el.onchange=e=>{
filters[k]=e.target.value;
renderCharacters();
};
});

host.querySelector('#reset-filters').onclick=()=>{
filters={
search:'',
unlocked:'all',
friendship:'all',
role:'all',
biome:'all',
show:true
};
renderCharacters();
};

host.querySelectorAll('[data-character]').forEach(b=>{
b.onclick=()=>{
characterListScrollY=getPageScrollY();openCharacter(b.dataset.character);
};
});

if(restoreScroll){
restorePageScrollY();
}
}
function returnToCharacterList(){
currentCharacterId=null;
renderCharacters(true);
}

function openCharacter(id){
const ch=(catalogData.characters||[]).find(x=>x.id===id);
if(!ch)return;

currentCharacterId=id;

const p=progress(ch);
const host=document.getElementById('catalog-items');

host.innerHTML=`
<button class="character-back" id="character-back">
← Retour à la liste
</button>

<div class="character-detail">

<div class="character-detail-avatar">
${ch.image
?`<img src="${escapeHTML(ch.image)}" alt="">`
:'✦'}
</div>

<p class="character-universe">
${escapeHTML(ch.universe||'Personnage')}
</p>

<h3>${escapeHTML(ch.name)}</h3>

<section class="detail-field">
<h4>Personnage débloqué</h4>
<div class="choice-row">
<button data-unlocked="yes"
class="${p.unlocked?'selected':''}">Oui</button>
<button data-unlocked="no"
class="${!p.unlocked?'selected':''}">Non</button>
</div>
</section>

<section class="detail-field">
<h4>
Niveau d'amitié
<strong id="friendship-value">${p.friendship_level}/10</strong>
</h4>

<div class="friendship-scale">
${Array.from({length:11},(_,i)=>`
<button data-friendship="${i}"
class="${p.friendship_level===i?'selected':''}"
aria-label="Niveau ${i}">${i}</button>
`).join('')}
</div>
</section>

<section class="detail-field">
<h4>Rôle principal</h4>

<div class="role-choices">
${ROLES.map(r=>`
<button data-role="${r.id}"
class="${p.assigned_role===r.id?'selected':''}">
<span class="role-icon">${roleIcon(r)}</span>
<small>${r.label}</small>
</button>
`).join('')}

<button data-role=""
class="${!p.assigned_role?'selected':''}">
<span>—</span>
<small>Aucun</small>
</button>
</div>
</section>

</div>
`;

host.querySelector('#character-back').onclick=returnToCharacterList;

host.querySelectorAll('[data-unlocked]').forEach(b=>{
b.onclick=()=>{
const v=progress(ch);
v.unlocked=b.dataset.unlocked==='yes';
state.characterProgress[id]=v;
saveState();
openCharacter(id);
};
});

host.querySelectorAll('[data-friendship]').forEach(b=>{
b.onclick=()=>{
const v=progress(ch);
v.friendship_level=Number(b.dataset.friendship);
state.characterProgress[id]=v;
saveState();
openCharacter(id);
};
});

host.querySelectorAll('[data-role]').forEach(b=>{
b.onclick=()=>{
const v=progress(ch);
v.assigned_role=b.dataset.role||null;
state.characterProgress[id]=v;
saveState();
openCharacter(id);
};
});
}

document.getElementById('back-home').addEventListener('click',()=>{
currentCharacterId=null;
document.getElementById('catalog-view').classList.add('hidden');
});

document.getElementById('global-search').addEventListener('input',e=>{
renderCategories(e.target.value);
});

// Retour par glissement horizontal sur une fiche personnage.
let pointerStartX=0;
let pointerStartY=0;

document.addEventListener('pointerdown',e=>{
if(!currentCharacterId||e.pointerType!=='touch')return;

pointerStartX=e.clientX;
pointerStartY=e.clientY;
});

document.addEventListener('pointerup',e=>{
if(!currentCharacterId||e.pointerType!=='touch')return;

const dx=e.clientX-pointerStartX;
const dy=e.clientY-pointerStartY;

if(dx>75&&Math.abs(dx)>Math.abs(dy)*1.25){
returnToCharacterList();
}
});

function renderGoals(){
const host=document.getElementById('goals-list');

if(!state.goals)state.goals=[];

host.innerHTML=`
${state.goals.length
?state.goals.map(g=>`
<article class="goal-card ${g.done?'is-done':''}">
  <div class="goal-card-heading">
    <label class="goal-check">
      <input type="checkbox" data-goal-check="${escapeHTML(g.id)}"
        ${g.done?'checked':''}>
      <span>${escapeHTML(g.title)}</span>
    </label>
    <button type="button" class="goal-expand"
      data-goal-expand="${escapeHTML(g.id)}"
      aria-label="Afficher les détails">⌄</button>
  </div>

  <div class="goal-details hidden" id="goal-details-${escapeHTML(g.id)}">
    <p>${escapeHTML(g.details||'Aucun détail pour le moment.')}</p>
    <div class="goal-actions">
      <button type="button" data-goal-edit="${escapeHTML(g.id)}">Modifier</button>
      <button type="button" data-goal-delete="${escapeHTML(g.id)}">Supprimer</button>
    </div>
  </div>
</article>
`).join('')
:'<p class="muted">Aucun objectif pour le moment. Ajoute ton premier projet !</p>'}
`;

host.querySelectorAll('[data-goal-check]').forEach(el=>{
el.onchange=()=>{
const goal=state.goals.find(g=>g.id===el.dataset.goalCheck);
if(!goal)return;
goal.done=el.checked;
saveState();
renderGoals();
};
});

host.querySelectorAll('[data-goal-expand]').forEach(el=>{
el.onclick=()=>{
const details=document.getElementById('goal-details-'+el.dataset.goalExpand);
details.classList.toggle('hidden');
el.textContent=details.classList.contains('hidden')?'⌄':'⌃';
};
});

host.querySelectorAll('[data-goal-delete]').forEach(el=>{
el.onclick=()=>{
if(!confirm('Supprimer cet objectif ?'))return;
state.goals=state.goals.filter(g=>g.id!==el.dataset.goalDelete);
saveState();
renderGoals();
};
});

host.querySelectorAll('[data-goal-edit]').forEach(el=>{
el.onclick=()=>{
const goal=state.goals.find(g=>g.id===el.dataset.goalEdit);
if(!goal)return;
showGoalForm(goal);
};
});
}

function showGoalForm(goal=null){
const host=document.getElementById('goals-list');

const oldForm=document.getElementById('goal-form');
if(oldForm)oldForm.remove();

const form=document.createElement('form');
form.id='goal-form';
form.className='goal-form';

form.innerHTML=`
<label>
Titre de l'objectif
<input name="title" maxlength="70" required
placeholder="Ex. : Débloquer un nouveau biome">
</label>
<label>
Détails
<textarea name="details" rows="3"
placeholder="Les étapes, les idées ou les informations utiles…"></textarea>
</label>
<div class="goal-form-actions">
<button type="submit" class="small-button">
${goal?'Enregistrer':'Ajouter'}
</button>
<button type="button" class="goal-cancel">Annuler</button>
</div>
`;

host.prepend(form);

form.elements.title.value=goal?.title||'';
form.elements.details.value=goal?.details||'';

form.onsubmit=e=>{
e.preventDefault();

const title=form.elements.title.value.trim();
const details=form.elements.details.value.trim();

if(!title)return;

if(goal){
goal.title=title;
goal.details=details;
}else{
state.goals.push({
id:'goal-'+Date.now(),
title,
details,
done:false
});
}

saveState();
renderGoals();
};

form.querySelector('.goal-cancel').onclick=renderGoals;

form.scrollIntoView({behavior:'smooth',block:'nearest'});
}

document.getElementById('add-goal').addEventListener('click',()=>{
const form=document.getElementById('goal-form');
if(form){
form.remove();
return;
}
showGoalForm();
});

let tasksEditing=false;

function renderTasks(){
const host=document.getElementById('daily-tasks');

host.innerHTML=state.tasks.map(t=>`
<div class="task-row-wrap">
<label class="task-row ${state.taskChecks[t.id]?'done':''}">
<input class="round-check" type="checkbox"
data-task="${escapeHTML(t.id)}"
${state.taskChecks[t.id]?'checked':''}>
<span>${escapeHTML(t.label)}</span>
</label>
${tasksEditing?`
<div class="task-actions">
<button type="button" data-edit-task="${escapeHTML(t.id)}">Renommer</button>
<button type="button" data-delete-task="${escapeHTML(t.id)}">Supprimer</button>
</div>
`:''}
</div>
`).join('');

host.querySelectorAll('[data-task]').forEach(el=>{
el.onchange=()=>{
state.taskChecks[el.dataset.task]=el.checked;
saveState();
renderTasks();
};
});

host.querySelectorAll('[data-edit-task]').forEach(el=>{
el.onclick=()=>{
const task=state.tasks.find(t=>t.id===el.dataset.editTask);
if(!task)return;

const label=prompt('Nouveau nom de la mission :',task.label);
if(label===null)return;

const newLabel=label.trim();
if(!newLabel)return;

task.label=newLabel;
saveState();
renderTasks();
};
});

host.querySelectorAll('[data-delete-task]').forEach(el=>{
el.onclick=()=>{
const task=state.tasks.find(t=>t.id===el.dataset.deleteTask);
if(!task)return;

if(!confirm('Supprimer cette mission ?'))return;

state.tasks=state.tasks.filter(t=>t.id!==task.id);
delete state.taskChecks[task.id];
saveState();
renderTasks();
};
});
}

document.getElementById('edit-tasks').addEventListener('click',()=>{
tasksEditing=!tasksEditing;

document.getElementById('new-task-form').classList.toggle('hidden',!tasksEditing);
document.getElementById('edit-tasks').textContent=tasksEditing?'Terminer':'Modifier';

renderTasks();
});

document.getElementById('new-task-form').addEventListener('submit',e=>{
e.preventDefault();

const input=document.getElementById('new-task');
const label=input.value.trim();

if(!label)return;

state.tasks.push({
id:'task-'+Date.now(),
label
});

input.value='';
saveState();
renderTasks();
});

for(const [id,key] of [
['star-coins','starCoins'],
['dreamlight','dreamlight']
]){
const el=document.getElementById(id);
el.value=state.currencies[key]||'';

el.addEventListener('input',()=>{
state.currencies[key]=el.value;
saveState();
});
}
document.getElementById('session-start-form').addEventListener('submit',e=>{
e.preventDefault();

const coins=Number(document.getElementById('session-start-coins').value);
const dreamlight=Number(document.getElementById('session-start-dreamlight').value);

if(!Number.isFinite(coins)||!Number.isFinite(dreamlight))return;

startSession(coins,dreamlight);
});
const notes=document.getElementById('personal-notes');
notes.value=state.notes||'';

notes.addEventListener('input',()=>{
state.notes=notes.value;
saveState();
document.getElementById('notes-status').textContent='Enregistré automatiquement';
});

const today=new Date().toLocaleDateString('fr-CA');

if(state.taskDate!==today){
state.taskDate=today;
state.taskChecks={};
saveState();
}

renderTasks();
renderGoals();
loadCatalogs();
