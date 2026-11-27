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
{id:'jardinage',label:'Jardinage',icon:'🌱'},
{id:'minage',label:'Extraction',icon:'⛏️'},
{id:'peche',label:'Pêche',icon:'🎣'},
{id:'recolte',label:'Cueillette',icon:'🌸'},
{id:'creusage',label:'Excavation',icon:'🪏'}
];

const defaultState={
checks:{},
currencies:{starCoins:'',dreamlight:''},
notes:'',
tasks:[
{id:'gift',label:'Offrir les cadeaux préférés'},
{id:'shop',label:'Faire un tour à la boutique de Picsou'},
{id:'harvest',label:'Vérifier mes récoltes'},
{id:'valley',label:'Faire un petit tour dans la vallée'}
],
taskChecks:{},
taskDate:new Date().toLocaleDateString('fr-CA'),
characterProgress:{}
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
return {...defaultState,...JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')};
}catch{
return structuredClone(defaultState);
}
}

function saveState(){
localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
updateProgress();
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
const r=await fetch('data/'+c.file);
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
`<option value="${r.id}">${r.icon} ${r.label}</option>`
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
${r?r.icon+' '+r.label:'Rôle non attribué'}
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
<span>${r.icon}</span>
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
function renderTasks(){
const host=document.getElementById('daily-tasks');

host.innerHTML=state.tasks.map(t=>`
<label class="task-row ${state.taskChecks[t.id]?'done':''}">
<input class="round-check" type="checkbox"
data-task="${escapeHTML(t.id)}"
${state.taskChecks[t.id]?'checked':''}>
<span>${escapeHTML(t.label)}</span>
</label>
`).join('');

host.querySelectorAll('[data-task]').forEach(el=>{
el.onchange=()=>{
state.taskChecks[el.dataset.task]=el.checked;
saveState();
renderTasks();
};
});
}

document.getElementById('edit-tasks').addEventListener('click',()=>{
document.getElementById('new-task-form').classList.toggle('hidden');
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
loadCatalogs();
