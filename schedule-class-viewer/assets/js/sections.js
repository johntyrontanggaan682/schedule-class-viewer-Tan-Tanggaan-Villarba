import { initializeApp }  from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import {
  doc, getDoc, setDoc, deleteDoc, updateDoc,
  collection, addDoc, onSnapshot, query, where, getDocs,
  collectionGroup, serverTimestamp, getCountFromServer, getFirestore, orderBy
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

if (!window.__FB) {
  const firebaseConfig = {
    apiKey: "AIzaSyAZLXYqe3TaVzkHZh3i4h78VBwI0KckMpE",
    authDomain: "log-in-cad70.firebaseapp.com",
    projectId: "log-in-cad70",
    storageBucket: "log-in-cad70.firebasestorage.app",
    messagingSenderId: "538387168387",
    appId: "1:538387168387:web:ef65e3ce36c5a405572fb6",
    measurementId: "G-Q6KF6ST8XF"
  };
  const app  = initializeApp(firebaseConfig);
  const db   = getFirestore(app);
  window.__FB = { app, db };
}
const { app, db } = window.__FB;

const ssRole = sessionStorage.getItem('auth_role');
let EFFECTIVE_ROLE = 'student';
if (ssRole && ssRole !== 'null') {
  EFFECTIVE_ROLE = ssRole;
}
sessionStorage.setItem('auth_role', EFFECTIVE_ROLE);

const ssSec = sessionStorage.getItem('auth_section');
let EFFECTIVE_SECTION = '';
if (ssSec && ssSec !== 'null') {
  EFFECTIVE_SECTION = ssSec;
}
sessionStorage.setItem('auth_section', EFFECTIVE_SECTION);

/* NEW: read status to detect irregular student (sessionStorage only) */
const ssStatus = sessionStorage.getItem('auth_status');
let EFFECTIVE_STATUS = '';
if (ssStatus && ssStatus !== 'null') {
  EFFECTIVE_STATUS = ssStatus;
}
sessionStorage.setItem('auth_status', EFFECTIVE_STATUS);

// NEW: read course (picked when registering / logging in)
const ssCourse = sessionStorage.getItem('auth_course');
let EFFECTIVE_COURSE = '';
if (ssCourse && ssCourse !== 'null') {
  EFFECTIVE_COURSE = ssCourse;
}
sessionStorage.setItem('auth_course', EFFECTIVE_COURSE);



const CURRENT_USER_ID = (sessionStorage.getItem('auth_id') || sessionStorage.getItem('auth_email') || '').trim();

const isStudent = EFFECTIVE_ROLE === 'student';
const isTeacher = EFFECTIVE_ROLE === 'teacher';
const isAdmin   = EFFECTIVE_ROLE === 'admin';

/* irregular / regular flags (from auth_status) */
const isIrregularStudent = isStudent && String(EFFECTIVE_STATUS || '').toLowerCase() === 'irregular';
const isRegularStudent   = isStudent && String(EFFECTIVE_STATUS || '').toLowerCase() === 'regular';

/* irregular course (read directly from sessionStorage so it never crashes) */
const IRREGULAR_COURSE = isIrregularStudent
  ? (sessionStorage.getItem('auth_course') || '')
  : null;


const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const fadeList = (el)=>{ if(!el) return; el.classList.remove('fade-in'); void el.offsetWidth; el.classList.add('fade-in'); };
const toOrdinal = (n)=>{ const s=String(n), a=s.slice(-1), b=s.slice(-2); if(b==='11'||b==='12'||b==='13')return s+'th'; if(a==='1')return s+'st'; if(a==='2')return s+'nd'; if(a==='3')return s+'rd'; return s+'th'; };
const toMinutes = (hhmm)=>{ const [h,m]=hhmm.split(':').map(Number); return h*60+m; };
const to12h = (hhmm)=>{ if(!hhmm) return ''; let [h,m]=hhmm.split(':').map(Number); const ap=h>=12?'PM':'AM'; h=h%12; if(h===0) h=12; return `${h}:${String(m).padStart(2,'0')} ${ap}`; };
const makeRange = (s,e)=> (s||e) ? (s && e ? `${to12h(s)} – ${to12h(e)}` : to12h(s||e)) : '';
const overlaps = (s1,e1,s2,e2)=> Math.max(s1,s2) < Math.min(e1,e2);

const normSubj = (s)=> (s||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const sameTeacher = (a,b)=> (a||'').trim().toLowerCase() === (b||'').trim().toLowerCase();

/* ====== COURSES & YEARS ====== */
const YEARS = ['1st Year','2nd Year','3rd Year','4th Year'];
const YEAR_SECTIONS = {
  '1st Year': ['BIT 1A-A','BIT 1A-B','BIT 1B-A','BIT 1B-B'],
  '2nd Year': ['BIT 2A-A','BIT 2A-B','BIT 2B-A','BIT 2B-B'],
  '3rd Year': ['BIT 3A-A','BIT 3A-B','BIT 3B-A','BIT 3B-B'],
  '4th Year': ['BIT 4A-A','BIT 4A-B','BIT 4B-A','BIT 4B-B']
};

const COURSES = [
  'BIT Computer Technology',
  'BTVT-ED Automotive Technology',
  'BTVT-ED Computer Programming',
  'BTVT-ED Civil Technology',
  'BTVT-ED Electrical Technology',
  'BTVT-ED Electronics Technology',
  'BTVT-ED Food & Service Management',
  'BTVT-ED Mechanical Technology'
];
const COURSE_SHORT = {
  'BIT Computer Technology': 'BIT',
  'BTVT-ED Automotive Technology': 'BTVT-ED AT',
  'BTVT-ED Computer Programming': 'BTVT-ED CP',
  'BTVT-ED Civil Technology': 'BTVT-ED CT',
  'BTVT-ED Electrical Technology': 'BTVT-ED ET',
  'BTVT-ED Electronics Technology': 'BTVT-ED ELX',
  'BTVT-ED Food & Service Management': 'BTVT-ED FSM',
  'BTVT-ED Mechanical Technology': 'BTVT-ED ME'
};
const PREFIX_TO_COURSE = Object.fromEntries(
  Object.entries(COURSE_SHORT).map(([course, prefix]) => [prefix, course])
);

/* BIT is the default / existing course */
const DEFAULT_COURSE = 'BIT Computer Technology';

/* NEW: runtime-added sections from Firestore (BIT-only union) */
const EXTRA_SECTIONS = {
  '1st Year': new Set(),
  '2nd Year': new Set(),
  '3rd Year': new Set(),
  '4th Year': new Set(),
};

/* NEW: same, but grouped per course + year */
const EXTRA_SECTIONS_BY_COURSE = {};
COURSES.forEach(c => {
  EXTRA_SECTIONS_BY_COURSE[c] = {
    '1st Year': new Set(),
    '2nd Year': new Set(),
    '3rd Year': new Set(),
    '4th Year': new Set(),
  };
});

/* NEW: selection state for filters */
let currentYear   = '3rd Year';
let currentCourse = null;   // nothing selected at first

let activeSection = null;
let studentsUnsub=null, schedulesUnsub=null, currentSchedules=[];
let studentHasOwn=false;

let remindersUnsub=null, currentReminders=[];
/* NEW: irregular selection state (session) */
let IRREGULAR_PICK = null;
/* NEW: track sections this user enrolled in during this session */
const IRREGULAR_ENROLLED = new Set();

/* NEW PERSISTENCE: load/save confirmed irregular choices in Firestore */
const CHOICES_DOC_ID = CURRENT_USER_ID || '_anon';
const choicesRef = doc(db, 'irregular_choices', CHOICES_DOC_ID);
/* sections previously confirmed (persisted); used to filter UI on next login */
let IRREGULAR_CONFIRMED = new Set();

async function loadIrregularConfirmed() {
  if (!isIrregularStudent) return;
  try {
    const snap = await getDoc(choicesRef);
    if (snap.exists()) {
      const arr = Array.isArray(snap.data().sections) ? snap.data().sections : [];
      IRREGULAR_CONFIRMED = new Set(arr);
    } else {
      IRREGULAR_CONFIRMED = new Set();
    }
  } catch {
    IRREGULAR_CONFIRMED = new Set();
  }
}
async function saveIrregularConfirmed(list) {
  try {
    await setDoc(choicesRef, { sections: list, updatedAt: serverTimestamp() }, { merge: true });
  } catch (e) {
    alert('Failed to save your choice.');
  }
}

let LIVE_TEACHERS = [];
function buildTeacherDisplay(t){
  const title = (t.title || 'Sir').replace(/\.$/,'');
  const name  = t.name || '';
  return `${title}. ${name}`.trim();
}
function idxText(s){ return (s||'').toLowerCase(); }
onSnapshot(collection(db,'teachers'), (snap)=>{
  const arr=[];
  snap.forEach(d=>{
    const data=d.data()||{};
    const display = buildTeacherDisplay(data);
    arr.push({ id:d.id, display, idx:idxText(display) });
  });
  LIVE_TEACHERS = arr.sort((a,b)=> a.display.localeCompare(b.display));
  if (!$('#teacher-options').classList.contains('hidden')) {
    filterTeacherSuggestions($('#teacher-combo').value.trim());
  }
});

async function requireAuth(){ return null; }

async function ensureSectionDoc(sectionId){
  const ref = doc(db, 'sections', sectionId);
  const snap = await getDoc(ref);
  if(!snap.exists()){
    await setDoc(ref, { name: sectionId, meta: { studentCount: 0, subjectCount: 0 } }, { merge:true });
  }
}

/* UPDATED: ensure we always tag with a course (for filtering) */
async function upsertSectionInfo(sectionId, info){
  await ensureSectionDoc(sectionId);
  const payload = { ...info };
  if (!payload.course) {
    payload.course = currentCourse || DEFAULT_COURSE;
  }
  await setDoc(doc(db,'sections',sectionId), payload, { merge:true });
}

/* NEW: parse title like "bit 1c-c", "BIT 2b", "Bit 3A-a" */
/* UPDATED: parse title for ANY course and build correct code */
/* NEW: parse title like "bit 3b-b", "btvt-ed cp 3b-b", etc – uses current course */
function parseSectionTitle(raw, courseOverride){
  const s = (raw || '').trim();
  if (!s) return null;

  // find year 1–4
  const yrMatch = s.match(/([1-4])/);
  if (!yrMatch) return null;
  const yearNum = Number(yrMatch[1]);
  const rest = s.slice(yrMatch.index + 1);

  // track + section letters (like "b-b" or "b")
  let track = 'A', section = 'A';
  const pair = rest.match(/([a-zA-Z])(?:\s*-\s*([a-zA-Z]))?/);
  if (pair){
    track = pair[1].toUpperCase();
    section = (pair[2] ? pair[2] : pair[1]).toUpperCase();
  }

  const course = courseOverride || currentCourse || DEFAULT_COURSE;
  const prefix = COURSE_SHORT[course] || 'BIT';    // BIT, BTVT-ED CP, etc.

  const code = `${prefix} ${yearNum}${track}-${section}`; // e.g. "BTVT-ED CP 3B-B"
  const yearLabel = `${toOrdinal(yearNum)} Year`;
  const degree = degreeForCourse(course);

  return {
    code,
    yearNum,
    yearLabel,
    track,
    section,
    degree
  };
}



async function refreshCounts(sectionId){
  const secRef = doc(db, 'sections', sectionId);
  const stuAgg = await getCountFromServer(collection(secRef, 'students'));
  const studentCount = stuAgg.data().count || 0;

  const schedSnap = await getDocs(collection(secRef, 'schedules'));
  const subj = new Set();
  schedSnap.forEach(d=>{ const s=d.data(); if(s.subject) subj.add(s.subject); });
  const subjectCount = subj.size;

  await setDoc(secRef, { meta: { studentCount, subjectCount } }, { merge: true });

  $$('.sec-stu').forEach(span=>{ if(span.dataset.sec===sectionId) span.textContent = studentCount; });
  $$('.sec-subj').forEach(span=>{ if(span.dataset.sec===sectionId) span.textContent = subjectCount; });
}

function getDesc(code){
  if (!code) return degreeForCourse(currentCourse || DEFAULT_COURSE);

  const upper = String(code).toUpperCase().trim();
  // match: PREFIX 3B-B  → PREFIX, 3, B, B
  const m = upper.match(/^([A-Z\- ]+)\s+(\d)([A-Z])\-([A-Z])$/);
  if (!m){
    return degreeForCourse(currentCourse || DEFAULT_COURSE);
  }
  const prefix  = m[1].trim();
  const yearNum = Number(m[2]);
  const track   = m[3];   // not used in text, but available if you want
  const sec     = m[4];

  const course = PREFIX_TO_COURSE[prefix] || degreeForCourse(DEFAULT_COURSE);
  // Example: "BTVT-ED Computer Programming - 3rd Year Section B"
  return `${course} - ${toOrdinal(yearNum)} Year Section ${sec}`;
}


/* ==== helper: map section doc → course name ==== */
function courseFromSectionDoc(data){
  if (!data) return DEFAULT_COURSE;
  if (data.course) return data.course;
  const deg = (data.degree || '').toString();
  if (!deg) return DEFAULT_COURSE;
  if (deg.startsWith('Bachelor in Industrial Technology')) return DEFAULT_COURSE;
  // If you later store full BTVT names in "degree", you can extend mapping here.
  return DEFAULT_COURSE;
}

/* ==== Firestore live sections → EXTRA_SECTIONS ==== */
let sectionsUnsub = null;
function observeSections(){
  if (sectionsUnsub) sectionsUnsub();
  sectionsUnsub = onSnapshot(collection(db,'sections'), (snap)=>{
    // Clear existing sets
    Object.keys(EXTRA_SECTIONS).forEach(k => EXTRA_SECTIONS[k].clear());
    Object.values(EXTRA_SECTIONS_BY_COURSE).forEach(byYear => {
      Object.keys(byYear).forEach(y => byYear[y].clear());
    });

    snap.forEach(d=>{
      const data = d.data() || {};
      const yearNum = data.yearNum;
      const code = data.name || d.id;
      if (!yearNum || !code) return;
      const map = {1:'1st Year',2:'2nd Year',3:'3rd Year',4:'4th Year'};
      const label = map[yearNum];
      if (!label) return;

      const course = courseFromSectionDoc(data);
      EXTRA_SECTIONS[label].add(code);
      if (!EXTRA_SECTIONS_BY_COURSE[course]) {
        EXTRA_SECTIONS_BY_COURSE[course] = {
          '1st Year': new Set(),
          '2nd Year': new Set(),
          '3rd Year': new Set(),
          '4th Year': new Set(),
        };
      }
      EXTRA_SECTIONS_BY_COURSE[course][label].add(code);
    });
    renderSectionCards();
    populateSectionOptions();
  });
}
observeSections();

function mergedSectionsForYear(yLabel){
  const base = YEAR_SECTIONS[yLabel] || [];
  const extras = Array.from(EXTRA_SECTIONS[yLabel] || []);
  const set = new Set(base);
  const merged = base.slice();
  extras.forEach(s => { if(!set.has(s)){ set.add(s); merged.push(s); } });
  return merged;
}

/* NEW: merged sections for specific course + year */
function mergedSectionsForYearCourse(yLabel, course){
  if (!course) return [];
  const base = (course === DEFAULT_COURSE ? (YEAR_SECTIONS[yLabel] || []) : []);
  const extrasSet = (EXTRA_SECTIONS_BY_COURSE[course] && EXTRA_SECTIONS_BY_COURSE[course][yLabel])
    ? EXTRA_SECTIONS_BY_COURSE[course][yLabel]
    : new Set();
  const merged = base.slice();
  const seen = new Set(base);
  extrasSet.forEach(sec => {
    if (!seen.has(sec)){
      seen.add(sec);
      merged.push(sec);
    }
  });
  return merged;
}

/* ========= RENDER SECTION CARDS ========= */
function renderSectionCards(){
  const grid = $('#sections-grid');

  /* IRREGULAR: filter UI if already confirmed earlier */
  const hasConfirmed = isIrregularStudent && IRREGULAR_CONFIRMED.size > 0;

  if (isIrregularStudent) {
  const irregularCourse = IRREGULAR_COURSE || DEFAULT_COURSE;

  // only show sections that belong to the irregular's course
  let secsAll;
  if (hasConfirmed) {
    const allYears = Object.keys(YEAR_SECTIONS);
    const combined = [];
    allYears.forEach(y=>{
      const merged = mergedSectionsForYearCourse(y, irregularCourse);
      merged.forEach(s=> combined.push(s));
    });
    secsAll = combined;
  } else {
    secsAll = mergedSectionsForYearCourse(currentYear, irregularCourse);
  }

  const secs = hasConfirmed
    ? secsAll.filter(s => IRREGULAR_CONFIRMED.has(s))
    : secsAll;


    // hide year filter & confirm button after confirmed
    const yearWrap = document.getElementById('year-filter-wrap');
    const confirmBtn = document.getElementById('confirm-choose-btn');
    if (hasConfirmed) {
      yearWrap?.classList.add('hidden');
      confirmBtn?.classList.add('hidden');
    }

    grid.className = 'grid md:grid-cols-2 lg:grid-cols-3 gap-6';
    grid.innerHTML = secs.map(sec => `
      <div class="section-card relative bg-gradient-to-br from-emerald-50 via-white to-emerald-100/50 rounded-2xl shadow-xl border border-emerald-100 p-7 cursor-pointer overflow-hidden" data-sec="${sec}">
        <div class="absolute -right-10 -top-10 w-40 h-40 bg-emerald-300/30 rounded-full blur-3xl pointer-events-none"></div>
        <div class="flex items-center justify-between mb-4 relative z-10">
          <h3 class="text-2xl font-bold text-primary drop-shadow-sm">${sec}</h3>
          <div class="w-9 h-9 flex items-center justify-center bg-white/70 rounded-full shadow"><i class="ri-arrow-right-line text-primary text-base"></i></div>
        </div>
        <p class="text-gray-700 mb-3 font-medium">${getDesc(sec)}</p>
        <div class="flex items-center justify-between text-sm text-gray-600 bg-white/60 rounded-xl px-3 py-2.5 backdrop-blur">
          <span class="flex items-center gap-1"><i class="ri-team-line text-emerald-500"></i><span class="sec-stu font-semibold" data-sec="${sec}">—</span> Students</span>
          <span class="flex items-center gap-1"><i class="ri-book-3-line text-emerald-500"></i><span class="sec-subj font-semibold" data-sec="${sec}">—</span> Subjects</span>
        </div>
      </div>
    `).join('');

    $$('.section-card').forEach(card=>{
      card.addEventListener('click', ()=>{
        const chosen = card.dataset.sec;
        IRREGULAR_PICK = chosen;
        $$('.section-card').forEach(c => c.classList.remove('card-picked'));
        card.classList.add('card-picked');
        openSection(chosen);
      });
    });

    secs.forEach(async sec=>{
      await ensureSectionDoc(sec);
      onSnapshot(doc(db,'sections',sec), snap=>{
        const d=snap.data(); if(!d?.meta) return;
        const s=$(`.sec-stu[data-sec="${sec}"]`);
        const q=$(`.sec-subj[data-sec="${sec}"]`);
        if(s) s.textContent = d.meta.studentCount ?? 0;
        if(q) q.textContent = d.meta.subjectCount ?? 0;
      });
    });
    return;
  }

  if (isStudent) {
    grid.className = 'flex justify-center';
    const sec = EFFECTIVE_SECTION ? EFFECTIVE_SECTION.trim() : '';
    if (!sec) {
      grid.innerHTML = `
        <div class="w-full max-w-md p-6 bg-white border border-dashed border-gray-200 rounded-2xl text-center text-gray-600 shadow-sm">
          No section assigned to this student.
        </div>
      `;
      return;
    }
    grid.innerHTML = `
      <div class="section-card relative bg-gradient-to-br from-emerald-50 via-white to-emerald-100/50 rounded-2xl shadow-xl border border-emerald-100 p-8 w-full max-w-xl cursor-pointer overflow-hidden" data-sec="${sec}">
        <div class="absolute -right-10 -top-10 w-44 h-44 bg-emerald-300/30 rounded-full blur-3xl pointer-events-none"></div>
        <div class="flex items-center justify-between mb-5 relative z-10">
          <h3 class="text-3xl font-bold text-primary drop-shadow-sm">${sec}</h3>
          <div class="w-10 h-10 flex items-center justify-center bg-white/70 rounded-full shadow"><i class="ri-arrow-right-line text-primary text-lg"></i></div>
        </div>
        <p class="text-gray-700 mb-4 font-medium">${getDesc(sec)}</p>
        <div class="flex items-center justify-between text-sm text-gray-600 bg-white/60 rounded-xl px-4 py-3 backdrop-blur">
          <span class="flex items-center gap-1"><i class="ri-team-line text-emerald-500"></i><span class="sec-stu font-semibold" data-sec="${sec}">—</span> Students</span>
          <span class="flex items-center gap-1"><i class="ri-book-3-line text-emerald-500"></i><span class="sec-subj font-semibold" data-sec="${sec}">—</span> Subjects</span>
        </div>
      </div>
    `;
    const card = grid.querySelector('.section-card');
    card?.addEventListener('click', ()=> openSection(sec));

    (async ()=>{
      await ensureSectionDoc(sec);
      onSnapshot(doc(db,'sections',sec), snap=>{
        const d=snap.data(); if(!d?.meta) return;
        const s=$(`.sec-stu[data-sec="${sec}"]`);
        const q=$(`.sec-subj[data-sec="${sec}"]`);
        if(s) s.textContent = d.meta.studentCount ?? 0;
        if(q) q.textContent = d.meta.subjectCount ?? 0;
      });
    })();
    return;
  }

  /* ====== TEACHER / ADMIN ====== */
  const emptyStateHtml = `
    <div class="col-span-full flex flex-col items-center justify-center text-center py-10 text-gray-500">
      <i class="ri-book-2-line text-3xl mb-3 text-gray-400"></i>
      <p class="font-semibold text-gray-700 mb-1">No sections to display yet.</p>
      <p class="text-sm">Select a course and year level to display sections.</p>
    </div>
  `;

  grid.className = 'grid md:grid-cols-2 lg:grid-cols-3 gap-6';

  // If course not chosen yet → show empty indication
  if (!currentCourse) {
    grid.innerHTML = emptyStateHtml;
    return;
  }

  const secs = mergedSectionsForYearCourse(currentYear, currentCourse);

  if (!secs.length) {
    grid.innerHTML = `
      <div class="col-span-full flex flex-col items-center justify-center text-center py-10 text-gray-500">
        <i class="ri-book-2-line text-3xl mb-3 text-gray-400"></i>
        <p class="font-semibold text-gray-700 mb-1">No sections found.</p>
        <p class="text-sm">No sections yet for <span class="font-semibold">${currentCourse}</span> • <span class="font-semibold">${currentYear}</span>.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = secs.map(sec=>`
    <div class="section-card group soft-card bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer" data-sec="${sec}">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-2xl font-bold text-primary">${sec}</h3>
        <div class="flex items-center gap-2">
          ${isAdmin ? `
            <button class="sec-edit w-[30px] h-[30px] rounded-[10px] bg-blue-500 text-white hover:opacity-90 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition" title="Edit" data-sec="${sec}">
              <i class="ri-pencil-line text-sm"></i>
            </button>
            <button class="sec-del w-[30px] h-[30px] rounded-[10px] bg-red-500 text-white hover:opacity-90 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition" title="Delete" data-sec="${sec}">
              <i class="ri-delete-bin-6-line text-sm"></i>
            </button>
          `:''}
          <div class="w-8 h-8 flex items-center justify-center bg-primary/10 rounded-full"><i class="ri-arrow-right-line text-primary"></i></div>
        </div>
      </div>
      <p class="text-gray-600 mb-3">${getDesc(sec)}</p>
      <div class="flex items-center justify-between text-sm text-gray-500">
        <span><span class="sec-stu" data-sec="${sec}">—</span> Students</span>
        <span><span class="sec-subj" data-sec="${sec}">—</span> Subjects</span>
      </div>
    </div>`).join('');

  $$('.section-card').forEach(card=>{
    card.addEventListener('click', (e)=>{
      if (e.target.closest('.sec-edit') || e.target.closest('.sec-del')) return;
      openSection(card.dataset.sec);
    });
  });

  secs.forEach(async sec=>{
    await ensureSectionDoc(sec);
    onSnapshot(doc(db,'sections',sec), snap=>{
      const d=snap.data(); if(!d?.meta) return;
      const s=$(`.sec-stu[data-sec="${sec}"]`);
      const q=$(`.sec-subj[data-sec="${sec}"]`);
      if(s) s.textContent = d.meta.studentCount ?? 0;
      if (q) q.textContent = d.meta.subjectCount ?? 0;
    });
  });

  grid.addEventListener('click', async (e)=>{
    const editBtn = e.target.closest('.sec-edit');
    const delBtn  = e.target.closest('.sec-del');
    if (!editBtn && !delBtn) return;
    e.stopPropagation();
    if (!isAdmin) return;

    if (editBtn){
      const sec = editBtn.dataset.sec;
      const parsedNow = parseSectionTitle(sec);
      $('#add-section-form').reset();
      $('#add-sec-degree').value = parsedNow?.degree || 'Bachelor in Industrial Technology';
      $('#add-sec-yearlabel').value = parsedNow?.yearLabel || '';
      $('#add-sec-track').value = parsedNow?.track || '';
      $('#add-sec-section').value = parsedNow?.section || '';
      $('#add-sec-code').value = parsedNow?.code || '';
      $('#add-sec-title').value = sec.toLowerCase();
      $('#add-sec-mismatch').classList.add('hidden');
      const form = $('#add-section-form');
      form.dataset.editOldId = sec;
      $('.modal-head .font-bold').textContent = 'Edit Section';
      $('#add-sec-text').textContent = 'Save Changes';
      openAddSection();
      return;
    }
    if (delBtn){
      pendingDeleteId = delBtn.dataset.sec;
      openDelModal('section');
      return;
    }
  });
}

/* ===== STUDENTS ===== */
function studentActionHtml(stu){
  if (isAdmin) {
    return `
      <div class="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition pointer-events-none group-hover:pointer-events-auto">
        <button class="stu-edit w-[30px] h-[30px] rounded-[10px] bg-blue-500 text-white hover:opacity-90 flex items-center justify-center" title="Edit" data-id="${stu.__id}">
          <i class="ri-pencil-line text-sm"></i>
        </button>
        <button class="stu-del w-[30px] h-[30px] rounded-[10px] bg-red-500 text-white hover:opacity-90 flex items-center justify-center" title="Delete" data-id="${stu.__id}">
          <i class="ri-delete-bin-6-line text-sm"></i>
        </button>
      </div>
    `;
  }
  if (isTeacher) return '';
  if (isStudent && CURRENT_USER_ID && stu.ownerId === CURRENT_USER_ID) {
    return `
      <div class="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition pointer-events-none group-hover:pointer-events-auto">
        <button class="stu-edit w-[30px] h-[30px] rounded-[10px] bg-blue-500 text-white hover:opacity-90 flex items-center justify-center" title="Edit" data-id="${stu.__id}">
          <i class="ri-pencil-line text-sm"></i>
        </button>
      </div>
    `;
  }
  return '';
}

function renderStudentsList(data){
  const listStudents = $('#section-students');
  listStudents.innerHTML = (data||[]).map(s=>`
    <div class="group relative p-4 bg-white border border-gray-200 rounded-xl">
      <div class="pr-20">
        <div class="font-semibold text-gray-800">${s.name}</div>
        <div class="text-sm text-gray-500">ID: ${s.id||''}</div>
        <div class="mt-1">
          <span class="text-xs px-2 py-1 rounded ${s.type==='Regular'?'bg-blue-100 text-blue-700':'bg-orange-100 text-orange-700'}">${s.type||'Regular'}</span>
        </div>
      </div>
      ${studentActionHtml(s)}
    </div>`).join('') || `<div class="p-4 border border-dashed border-gray-300 rounded-xl text-gray-500 text-sm">No students yet.</div>`;
}

/* ===== SCHEDULE LIST ===== */
function renderScheduleList(data){
  const listSchedule = $('#section-schedule');
  if(!data.length){
    listSchedule.innerHTML = `<div class="p-4 border border-dashed border-gray-300 rounded-xl text-gray-500 text-sm">No schedule yet.</div>`;
    return;
  }
  const order = currentYear==='1st Year' ? ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'] : ['Monday','Tuesday','Wednesday','Thursday','Friday'];
  const byDay={};
  data.forEach(it=>{ (byDay[it.day]=byDay[it.day]||[]).push(it); });
  order.forEach(d=>byDay[d]?.sort((a,b)=>a.startMin-b.startMin));
  listSchedule.innerHTML = order.filter(d=>byDay[d]).map(day=>{
    const items = byDay[day].map(it=>{
      let actionBtns = '';

      // ADMIN: edit + delete (same as before)
      if (isAdmin) {
        actionBtns = `
          <div class="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition pointer-events-none group-hover:pointer-events-auto">
            <button class="sched-edit w-[30px] h-[30px] rounded-[10px] bg-blue-500 text-white hover:opacity-90 flex items-center justify-center" title="Edit" data-id="${it.id}">
              <i class="ri-pencil-line text-sm"></i>
            </button>
            <button class="sched-del w-[30px] h-[30px] rounded-[10px] bg-red-500 text-white hover:opacity-90 flex items-center justify-center" title="Delete" data-id="${it.id}">
              <i class="ri-delete-bin-6-line text-sm"></i>
            </button>
          </div>
        `;
      }
      // TEACHER: edit only, and only if this teacher created the schedule
      else if (isTeacher && CURRENT_USER_ID && it.ownerId === CURRENT_USER_ID) {
        actionBtns = `
          <div class="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition pointer-events-none group-hover:pointer-events-auto">
            <button class="sched-edit w-[30px] h-[30px] rounded-[10px] bg-blue-500 text-white hover:opacity-90 flex items-center justify-center" title="Edit" data-id="${it.id}">
              <i class="ri-pencil-line text-sm"></i>
            </button>
          </div>
        `;
      }

      return `
      <div class="group relative p-4 rounded-xl border border-emerald-100 bg-emerald-50/50">
        <div class="pr-20">
          <div class="text-sm font-semibold text-emerald-700">${it.subject}</div>
          <div class="text-xs text-gray-600 mt-0.5">${it.day} • ${it.timeDisplay}</div>
          <div class="text-xs text-gray-600 mt-0.5">${it.room} - ${it.teacher}</div>
        </div>
        ${actionBtns}
      </div>`;
    }).join('');
    return `<div class="mb-4"><div class="text-primary font-semibold mb-2">${day}</div><div class="space-y-2">${items}</div></div>`;
  }).join('');
}


function wireDropdown(buttonId,panelId,hiddenId,optionClass,labelId){
  const btn    = document.getElementById(buttonId);
  const panel  = document.getElementById(panelId);
  const hidden = document.getElementById(hiddenId);
  const label  = document.getElementById(labelId);
  const setVal = (val)=>{ hidden.value=val; if(label) label.textContent=val; panel.classList.add('hidden'); btn.classList.remove('is-error'); hideFormError(); };
  btn?.addEventListener('click', (e)=>{ e.stopPropagation(); panel.classList.toggle('hidden'); });
  panel?.addEventListener('mousedown', (e)=>{ const opt=e.target.closest('.'+optionClass); if(opt){ setVal(opt.dataset.value || opt.textContent.trim()); } });
  document.addEventListener('click', (e)=>{ if(!btn.contains(e.target) && !panel.contains(e.target)) panel.classList.add('hidden'); });
}

function populateSectionOptions(){
  const panel = document.getElementById('section-options');
  if (!panel) return;

  let list = [];
  if (isTeacher || isAdmin) {
    if (currentCourse) {
      list = mergedSectionsForYearCourse(currentYear, currentCourse);
    } else {
      list = [];
    }
  } else {
    list = mergedSectionsForYear(currentYear) || [];
  }

  if (!list.length) {
    panel.innerHTML = `<div class="p-3 text-sm text-gray-500">No sections available. Select a course and year.</div>`;
  } else {
    panel.innerHTML = list.map(v=>`<div class="section-option p-3 rounded-xl hover:bg-gray-50 cursor-pointer" data-value="${v}">${v}</div>`).join('');
  }

  wireDropdown('section-dropdown','section-options','section','section-option','section-selected');
}

const __combos = [];
function closeAllCombos(exceptId=null){ __combos.forEach(c=>{ if(c.id!==exceptId){ c.close(); } }); }
function wireComboSearch(cfg){
  const { btnId, inputId, panelId, hiddenId, optionClass, labelId, chevronId } = cfg;
  const btn    = document.getElementById(btnId);
  const input  = document.getElementById(inputId);
  const panel  = document.getElementById(panelId);
  const hidden = document.getElementById(hiddenId);
  const label  = document.getElementById(labelId);
  const chev   = chevronId ? document.getElementById(chevronId) : null;

  const opts = ()=> Array.from(panel.querySelectorAll('.'+optionClass));
  const open = ()=>{ closeAllCombos(btnId); panel.classList.remove('hidden'); btn.classList.add('combo-has-text'); };
  const close = ()=>{ panel.classList.add('hidden'); if(!input.value) btn.classList.remove('combo-has-text'); };
  const apply = (val)=>{ hidden.value=val; if(label) label.textContent=val; input.value=''; input.blur(); close(); hidden.dispatchEvent(new Event('change',{bubbles:true})); };

  btn.addEventListener('click', (e)=>{ e.stopPropagation(); open(); input.focus(); });
  if (chev){ chev.addEventListener('click', (e)=>{ e.stopPropagation(); if(panel.classList.contains('hidden')){ closeAllCombos(btnId); panel.classList.remove('hidden'); btn.classList.add('combo-has-text'); } else{ close(); } }); }
  input.addEventListener('input', ()=>{ const q=input.value.trim().toLowerCase(); if(q) btn.classList.add('combo-has-text'); else btn.classList.remove('combo-has-text'); opts().forEach(op=>{ const t=(op.dataset.value || op.textContent).toLowerCase(); const show=t.includes(q); op.style.display = show ? '' : 'none'; }); panel.classList.remove('hidden'); });
  input.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); const first = opts().find(op => op.style.display !== 'none'); if(first) apply(first.dataset.value || first.textContent.trim()); } if(e.key==='Escape'){ e.preventDefault(); close(); } });
  panel.addEventListener('mousedown', (e)=>{ const op=e.target.closest('.'+optionClass); if(op){ apply(op.dataset.value || op.textContent.trim()); } });
  document.addEventListener('click', (e)=>{ if(!btn.contains(e.target) && !panel.contains(e.target)) close(); });

  __combos.push({ id: btnId, close });
}

async function openSection(sectionName){
  activeSection = sectionName;
  document.getElementById('section-detail-title').textContent = sectionName;
  document.getElementById('section-detail-modal').classList.remove('hidden');
  await ensureSectionDoc(sectionName);

  const addStudentBtn  = document.getElementById('add-section-student-btn');
  const addScheduleBtn = document.getElementById('add-section-schedule-btn');
  const addReminderBtn = document.getElementById('add-section-reminder-btn');
  const actionBar      = document.getElementById('section-action-bar');

  if (isTeacher) {
  addStudentBtn.classList.add('hidden');       
  addScheduleBtn.classList.remove('hidden');  
  addReminderBtn.classList.remove('hidden');   
}
  if (isAdmin) {
    addStudentBtn.classList.remove('hidden');
    addScheduleBtn.classList.remove('hidden');
    addReminderBtn.classList.remove('hidden');

    if (actionBar && addReminderBtn && addStudentBtn) {
      actionBar.insertBefore(addReminderBtn, addStudentBtn);
    }
  }
  if (isStudent) {
    addScheduleBtn.classList.add('hidden');
    addReminderBtn.classList.add('hidden');
    const span = addStudentBtn.querySelector('span');
    if (span) span.textContent = isIrregularStudent ? 'Enroll' : 'Add Student';
    addStudentBtn.classList.add('hidden');
  }

  if(studentsUnsub) studentsUnsub();
  studentsUnsub = onSnapshot(collection(doc(db,'sections',sectionName),'students'), snap=>{
    const data=[]; 
    let hasOwn=false;
    snap.forEach(d=>{
      const obj = d.data()||{};
      obj.__id = d.id;
      obj.ownerId = obj.ownerId || '';
      data.push(obj);
      if (isStudent && CURRENT_USER_ID && obj.ownerId === CURRENT_USER_ID) hasOwn = true;
    });
    studentHasOwn = hasOwn;

    if (isStudent) {
      const btn = document.getElementById('add-section-student-btn');
      btn.classList.toggle('hidden', studentHasOwn);
      const span = btn?.querySelector('span');
      if (span) span.textContent = isIrregularStudent ? 'Enroll' : 'Add Student';
    }

    renderStudentsList(data);
    refreshCounts(sectionName);

    if (isIrregularStudent) {
      if (hasOwn) IRREGULAR_ENROLLED.add(sectionName); else IRREGULAR_ENROLLED.delete(sectionName);
      const cbtn = document.getElementById('confirm-choose-btn');
      const alreadyConfirmed = IRREGULAR_CONFIRMED.size > 0;
      if (cbtn) cbtn.classList.toggle('hidden', IRREGULAR_ENROLLED.size === 0 || alreadyConfirmed);
    }
  });

  if(schedulesUnsub) schedulesUnsub();
  schedulesUnsub = onSnapshot(collection(doc(db,'sections',sectionName),'schedules'), snap=>{
    const data=[]; snap.forEach(d=>data.push({id:d.id,...d.data()}));
    currentSchedules = data; renderScheduleList(data); refreshCounts(sectionName);
    buildReminderSubjectSource();
  });

  const prevBtn = document.getElementById('rem-preview');
  if (remindersUnsub) remindersUnsub();
  if (isTeacher) {
    const qOwn = query(
      collection(doc(db,'sections',sectionName),'reminders'),
      where('ownerId','==', CURRENT_USER_ID || '__none__')
    );
    remindersUnsub = onSnapshot(qOwn, snap=>{
      const arr=[]; snap.forEach(d=> arr.push({ id:d.id, ...(d.data()||{}) }));
      currentReminders = arr;
      if (prevBtn) prevBtn.classList.toggle('hidden', currentReminders.length === 0);
    });
  } else if (isAdmin) {
    const qMine = query(
      collection(doc(db,'sections',sectionName),'reminders'),
      where('ownerId','==', CURRENT_USER_ID || '__none__')
    );
    remindersUnsub = onSnapshot(qMine, snap=>{
      const arr=[]; snap.forEach(d=> arr.push({ id:d.id, ...(d.data()||{}) }));
      currentReminders = arr;
      if (prevBtn) prevBtn.classList.toggle('hidden', currentReminders.length === 0);
    });
  } else {
    currentReminders = [];
    if (prevBtn) prevBtn.classList.add('hidden');
  }

  fadeList(document.getElementById('section-students')); 
  fadeList(document.getElementById('section-schedule'));

  document.getElementById('rem-section').value = sectionName;
}

/* ======= Delete modal handlers (kept) ======= */
const delModal = document.getElementById('delete-confirm');
let pendingDeleteId = null;
let deleteMode = null;
const openDelModal = (mode)=>{
  deleteMode = mode;
  const t = document.getElementById('delete-title');
  const d = document.getElementById('delete-desc');
  if (mode==='student'){
    t.textContent = 'Delete student?';
    d.textContent = 'Are you sure you want to delete this student record?';
  } else if (mode==='schedule'){
    t.textContent = 'Delete schedule?';
    d.textContent = 'Are you sure you want to delete it?';
  } else if (mode==='reminder'){
    t.textContent = 'Delete reminder?';
    d.textContent = 'Are you sure you want to delete this reminder?';
  } else if (mode==='section'){
    t.textContent = 'Delete section?';
    d.textContent = 'This will remove the section and all its students, schedules, and reminders.';
  } else {
    t.textContent = 'Delete item?';
    d.textContent = 'Are you sure you want to delete it?';
  }
  delModal.classList.remove('hidden'); 
  delModal.style.display='flex';
};
const closeDelModal = ()=>{ pendingDeleteId=null; deleteMode=null; delModal.style.display='none'; delModal.classList.add('hidden'); };
document.getElementById('del-cancel').onclick = closeDelModal;
document.getElementById('del-yes').onclick = async ()=>{
  if(!pendingDeleteId) { closeDelModal(); return; }
  await requireAuth();
  if (deleteMode === 'schedule') {
    await deleteDoc(doc(db, 'sections', activeSection, 'schedules', pendingDeleteId));
  } else if (deleteMode === 'student') {
    if (!isAdmin) { closeDelModal(); return; }
    await deleteDoc(doc(db, 'sections', activeSection, 'students', pendingDeleteId));
  } else if (deleteMode === 'reminder') {
    if (!(isTeacher || isAdmin)) { closeDelModal(); return; }
    await deleteDoc(doc(db, 'sections', activeSection, 'reminders', pendingDeleteId));
    currentReminders = currentReminders.filter(r => r.id !== pendingDeleteId);
    const previewModalEl = document.getElementById('rem-preview-modal');
    if (previewModalEl && !previewModalEl.classList.contains('hidden')) {
      renderPreviewReminders(currentReminders);
    }
    const prevBtn = document.getElementById('rem-preview');
    if (prevBtn) prevBtn.classList.toggle('hidden', currentReminders.length === 0);
  } else if (deleteMode === 'section'){
    if (!isAdmin) { closeDelModal(); return; }
    const secId = pendingDeleteId;
    try{
      await cascadeDeleteSection(secId);
      Object.keys(EXTRA_SECTIONS).forEach(k=> EXTRA_SECTIONS[k].delete(secId));
      Object.values(EXTRA_SECTIONS_BY_COURSE).forEach(byYear=>{
        Object.keys(byYear).forEach(y=> byYear[y].delete(secId));
      });
      renderSectionCards();
      populateSectionOptions();
      if (activeSection === secId){
        activeSection = null;
        document.getElementById('section-detail-modal').classList.add('hidden');
      }
    }catch(err){
      console.error(err);
      alert('Failed to delete section.');
    }
  }
  closeDelModal();
};

document.getElementById('section-schedule').addEventListener('click', (e)=>{
  const editBtn = e.target.closest('.sched-edit');
  const delBtn  = e.target.closest('.sched-del');
  if (!editBtn && !delBtn) return;

  // DELETE: only admin can delete
  if (delBtn) {
    if (!isAdmin) return;
    pendingDeleteId = delBtn.dataset.id;
    openDelModal('schedule');
    return;
  }

  // EDIT: admin OR teacher who owns this schedule
  if (editBtn) {
    const it = currentSchedules.find(s => s.id === editBtn.dataset.id);
    if (!it) return;

    if (!(isAdmin || (isTeacher && CURRENT_USER_ID && it.ownerId === CURRENT_USER_ID))) {
      return;
    }

    document.getElementById('subject').value = it.subject || '';
    document.getElementById('section').value = activeSection;
    document.getElementById('section-selected').textContent = activeSection;
    document.getElementById('room').value = it.room || '';
    document.getElementById('room-selected').textContent   = it.room || 'Select room';
    document.getElementById('teacher').value = it.teacher || '';
    document.getElementById('teacher-selected').textContent = it.teacher || 'Select teacher';
    document.getElementById('day').value = it.day || '';
    document.getElementById('day-selected').textContent = it.day || 'Select day';
    const toHHMM = (m)=> `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
    document.getElementById('start-time').value = toHHMM(it.startMin);
    document.getElementById('end-time').value   = toHHMM(it.endMin);
    const formEl = document.getElementById('schedule-form');
    formEl.dataset.editId = it.id;
    document.getElementById('submit-text').textContent = 'Save Changes';
    document.getElementById('modal-title').textContent = 'Edit Schedule';
    document.getElementById('form-error').classList.add('hidden');
    document.getElementById('conflict').classList.add('hidden');
    document.getElementById('schedule-modal').classList.remove('hidden');
  }
});


document.getElementById('section-students').addEventListener('click', async (e)=>{
  const editBtn = e.target.closest('.stu-edit');
  const delBtn  = e.target.closest('.stu-del');
  if (!editBtn && !delBtn) return;

  const id = editBtn?.dataset.id || delBtn?.dataset.id || null;
  if (!id) return;

  if (delBtn) {
    if (!isAdmin) return;
    pendingDeleteId = id;
    openDelModal('student');
    return;
  }

  if (editBtn) {
    const stuRef = doc(db,'sections',activeSection,'students',id);
    const snap = await getDoc(stuRef);
    if(!snap.exists()) return;
    const data = snap.data() || {};
    if (isStudent && (!CURRENT_USER_ID || data.ownerId !== CURRENT_USER_ID)) return;

    document.getElementById('student-modal-title').textContent = 'Edit Student';
    document.getElementById('student-name').value = data.name || '';
    document.getElementById('student-id').value   = data.id || '';
    const typeVal = (data.type || 'Regular');
    Array.from(document.querySelectorAll('#student-type-group input[name="student-type"]')).forEach(r=> r.checked = (r.value===typeVal));
    refreshChoiceStyles();

    const form = document.getElementById('student-form');
    form.dataset.editId = id;

    document.getElementById('student-submit-text').textContent = 'Save Changes';
    document.getElementById('student-modal').classList.remove('hidden');
  }
});

/* ===== Student modal open/submit ===== */
const studentModal = document.getElementById('student-modal');
document.getElementById('add-section-student-btn').onclick = async ()=>{
  await requireAuth();
  if (isTeacher) return;
  if (isStudent && studentHasOwn) return;

  const form = document.getElementById('student-form');
  form.reset();
  delete form.dataset.editId;
  refreshChoiceStyles();

  if (isIrregularStudent) {
    const radios = Array.from(document.querySelectorAll('#student-type-group input[name="student-type"]'));
    radios.forEach(r => { r.checked = (r.value === 'Irregular'); r.disabled = true; });
    refreshChoiceStyles();
    document.getElementById('student-modal-title').textContent = 'Enroll to Section';
    document.getElementById('student-submit-text').textContent = 'Enroll';
  } else {
    document.getElementById('student-modal-title').textContent = 'Add New Student';
    document.getElementById('student-submit-text').textContent = 'Add Student';
    const radios = Array.from(document.querySelectorAll('#student-type-group input[name="student-type"]'));
     radios.forEach(r => {
      // If the logged-in student is REGULAR, block "Irregular" option
      if (isRegularStudent && r.value === 'Irregular') {
        r.disabled = true;
        r.checked = false;
        const label = r.closest('.choice');
        if (label) {
          label.classList.add('opacity-50', 'pointer-events-none');
        }
      } else {
        r.disabled = false;
        const label = r.closest('.choice');
        if (label) {
          label.classList.remove('opacity-50', 'pointer-events-none');
        }
      }
    });

    // Make sure Regular remains selected by default
    const regularRadio = radios.find(r => r.value === 'Regular');
    if (regularRadio && !regularRadio.checked) {
      regularRadio.checked = true;
    }
    refreshChoiceStyles();
  }

  studentModal.classList.remove('hidden');
};
document.getElementById('close-student-modal-btn').onclick = ()=> studentModal.classList.add('hidden');
document.getElementById('cancel-student-btn').onclick = ()=> studentModal.classList.add('hidden');

function refreshChoiceStyles(){
  Array.from(document.querySelectorAll('#student-type-group .choice')).forEach(lbl=>lbl.classList.remove('choice-active'));
  const checked=document.querySelector('#student-type-group input[name="student-type"]:checked');
  checked?.closest('.choice')?.classList.add('choice-active');
}
Array.from(document.querySelectorAll('#student-type-group input[name="student-type"]')).forEach(r=> r.addEventListener('change',refreshChoiceStyles));
refreshChoiceStyles();

document.getElementById('student-form').addEventListener('submit', async e=>{
  e.preventDefault();
  await requireAuth();

  const sBtn   = document.getElementById('student-submit');
  const sText  = document.getElementById('student-submit-text');
  const sSpin  = document.getElementById('student-loader');
  sBtn.disabled = true; sSpin.classList.remove('hidden'); sText.textContent = (e.target.dataset.editId ? 'Saving Changes...' : (isIrregularStudent ? 'Enrolling...' : 'Adding Student...')); sBtn.classList.add('opacity-90','cursor-not-allowed');

  try{
    const name=document.getElementById('student-name').value.trim();
    const id=document.getElementById('student-id').value.trim();
    const picked=Array.from(document.querySelectorAll('#student-type-group input[name="student-type"]')).find(r=>r.checked);
    const type=picked?picked.value:'Regular';
    const sec=activeSection;
    if(!name||!id||!sec) throw new Error('Please complete all required fields.');

    if (isStudent && studentHasOwn && !e.target.dataset.editId) {
      throw new Error('You can only add once.');
    }
    await ensureSectionDoc(sec);
    const payload = { name, id, type, updatedAt: serverTimestamp() };

    const editingId = e.target.dataset.editId;
    if (editingId) {
      if (isStudent) {
        const snap = await getDoc(doc(db,'sections',sec,'students',editingId));
        const data = snap.exists() ? (snap.data()||{}) : {};
        if (!CURRENT_USER_ID || data.ownerId !== CURRENT_USER_ID) throw new Error('Not allowed.');
      }
      await updateDoc(doc(db,'sections',sec,'students',editingId), payload);
    } else {
      await addDoc(collection(doc(db,'sections',sec),'students'), {
        ...payload,
        ownerId: CURRENT_USER_ID || '',
        createdAt: serverTimestamp()
      });
    }

    await refreshCounts(sec);
    studentModal.classList.add('hidden');
    e.target.reset();
    delete e.target.dataset.editId;
    refreshChoiceStyles();
  }catch(err){
    alert(err?.message || 'Failed to save student.');
  }finally{
    sBtn.disabled = false; sSpin.classList.add('hidden'); sText.textContent = isIrregularStudent ? 'Enroll' : 'Add Student'; sBtn.classList.remove('opacity-90','cursor-not-allowed');
  }
});

wireDropdown('section-dropdown','section-options','section','section-option','section-selected');

wireComboSearch({
  btnId:'room-dropdown', inputId:'room-combo', panelId:'room-options',
  hiddenId:'room', optionClass:'room-option', labelId:'room-selected', chevronId:'room-chevron'
});

const teacherBtn     = document.getElementById('teacher-dropdown');
const teacherInput   = document.getElementById('teacher-combo');
const teacherPanel   = document.getElementById('teacher-options');
const teacherHidden  = document.getElementById('teacher');
const teacherLabel   = document.getElementById('teacher-selected');

function applyTeacher(val){
  teacherHidden.value = val;
  teacherLabel.textContent = val || 'Select teacher';
  teacherInput.value = '';
  teacherBtn.classList.remove('combo-has-text');
  teacherPanel.classList.add('hidden');
  teacherHidden.dispatchEvent(new Event('change',{bubbles:true}));
}
function renderTeacherOptions(list){
  teacherPanel.innerHTML = list.length
    ? list.map(t=>`<div class="teacher-option p-3 rounded-xl hover:bg-gray-50 cursor-pointer" data-value="${t.display.replace(/"/g,'&quot;')}">${t.display}</div>`).join('')
    : `<div class="p-3 text-sm text-gray-500">No matches</div>`;
}
function filterTeacherSuggestions(qRaw){
  const q = (qRaw||'').trim().toLowerCase();
  const starts = LIVE_TEACHERS.filter(t=> t.idx.startsWith(q));
  const contains = LIVE_TEACHERS.filter(t=> !t.idx.startsWith(q) && t.idx.includes(q));
  const merged = [...starts, ...contains].slice(0, 3);
  renderTeacherOptions(merged);
  teacherPanel.classList.toggle('hidden', merged.length===0);
}
function clearTeacherSelection(){
  if (teacherHidden.value || teacherLabel.textContent) { teacherHidden.value = ''; teacherLabel.textContent = ''; }
  teacherBtn.classList.add('combo-has-text');
}
teacherInput.addEventListener('focus', clearTeacherSelection);
teacherInput.addEventListener('click', clearTeacherSelection);
teacherBtn.addEventListener('click', (e)=>{ e.stopPropagation(); teacherInput.focus(); if (teacherInput.value.trim()) { filterTeacherSuggestions(teacherInput.value); } });
teacherInput.addEventListener('input', ()=>{ teacherBtn.classList.toggle('combo-has-text', !!teacherInput.value.trim()); filterTeacherSuggestions(teacherInput.value); });
teacherInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); const first = teacherPanel.querySelector('.teacher-option'); if(first) applyTeacher(first.dataset.value || first.textContent.trim()); } if(e.key==='Escape'){ teacherPanel.classList.add('hidden'); } });
teacherPanel.addEventListener('mousedown', (e)=>{ const op=e.target.closest('.teacher-option'); if(op){ applyTeacher(op.dataset.value || op.textContent.trim()); } });
document.addEventListener('click', (e)=>{ if(!teacherBtn.contains(e.target) && !teacherPanel.contains(e.target)) teacherPanel.classList.add('hidden'); });

document.getElementById('day-dropdown').addEventListener('click',(e)=>{ e.stopPropagation(); openDayPortal(); });
function openDayPortal(){
  const btn    = document.getElementById('day-dropdown');
  const hidden = document.getElementById('day');
  const label  = document.getElementById('day-selected');
  const source = document.getElementById('day-options');
  const portal = document.createElement('div');
  portal.id = 'day-portal';
  portal.className = 'fixed z-[9999] bg-white border border-gray-300 rounded-2xl shadow-2xl';
  portal.style.minWidth = btn.getBoundingClientRect().width + 'px';
  if (currentYear === '1st Year'){ portal.style.maxHeight='220px'; portal.style.overflowY='auto'; portal.style.padding='4px'; portal.style.fontSize='13px'; portal.style.lineHeight='1.2'; }
  portal.innerHTML = source.innerHTML; document.body.appendChild(portal);
  const updatePos = ()=>{ const r=btn.getBoundingClientRect(); portal.style.left=r.left+'px'; portal.style.top=(r.bottom+6)+'px'; portal.style.minWidth=r.width+'px'; };
  updatePos();
  const prevOverflow=document.body.style.overflow; document.body.style.overflow='hidden';
  const close = ()=>{ portal.remove(); document.body.style.overflow=prevOverflow; document.removeEventListener('mousedown', outside); window.removeEventListener('resize', updatePos); window.removeEventListener('scroll', updatePos, true); };
  const outside = (ev)=>{ if(!portal.contains(ev.target) && ev.target!==btn) close(); };
  portal.addEventListener('mousedown', (ev)=>{ const opt = ev.target.closest('.day-option'); if (opt){ const val = opt.dataset.value || opt.textContent.trim(); hidden.value = val; label.textContent = val; btn.classList.remove('is-error'); hideFormError(); close(); } });
  window.addEventListener('resize', updatePos);
  window.addEventListener('scroll', updatePos, true);
  document.addEventListener('mousedown', outside);
}
function showFormError(msg){ const el=document.getElementById('form-error'); if(!el) return; el.textContent=msg; el.classList.remove('hidden'); }
function hideFormError(){ const el=document.getElementById('form-error'); if(!el) return; el.textContent=''; el.classList.add('hidden'); }
function clearErrors(){ ['subject','section-dropdown','room-dropdown','teacher-dropdown','day-dropdown','start-time','end-time'].forEach(id=>document.getElementById(id)?.classList.remove('is-error')); hideFormError(); }
function markError(id){ document.getElementById(id)?.classList.add('is-error'); }
function validateScheduleForm(){
  clearErrors();
  const subject=document.getElementById('subject').value.trim();
  const section=document.getElementById('section').value.trim();
  const room=document.getElementById('room').value.trim();
  const teacher=document.getElementById('teacher').value.trim();
  const day=document.getElementById('day').value.trim();
  const startHHMM=document.getElementById('start-time').value;
  const endHHMM=document.getElementById('end-time').value;
  let ok=true;
  if(!subject){ markError('subject'); ok=false; }
  if(!section){ markError('section-dropdown'); ok=false; }
  if(!room){    markError('room-dropdown'); ok=false; }
  if(!teacher){ markError('teacher-dropdown'); ok=false; }
  if(!day){     markError('day-dropdown'); ok=false; }
  if(!startHHMM){ markError('start-time'); ok=false; }
  if(!endHHMM){   markError('end-time'); ok=false; }
  if(!ok) showFormError('Please complete all required fields.');
  return { ok, values:{subject,section,room,teacher,day,startHHMM,endHHMM} };
}
function checkConflictInline(){
  const section=document.getElementById('section').value.trim();
  const day=document.getElementById('day').value.trim();
  const s=document.getElementById('start-time').value;
  const e=document.getElementById('end-time').value;
  const bar=document.getElementById('conflict');
  if(!section||!day||!s||!e){ bar.classList.add('hidden'); return false; }
  const sm=toMinutes(s), em=toMinutes(e);
  if(em<=sm){ bar.textContent='Invalid time: end must be after start.'; bar.classList.remove('hidden'); return true; }
  const secSameDay = currentSchedules.filter(x=>x.day===day);
  for(const it of secSameDay){
    if(overlaps(it.startMin, it.endMin, sm, em)){
      bar.textContent='Section conflict: this section already has a class at this time.';
      bar.classList.remove('hidden'); 
      return true;
    }
  }
  bar.classList.add('hidden'); return false;
}
;['start-time','end-time','day','section','room'].forEach(id=> document.getElementById(id).addEventListener('change',checkConflictInline));

/* ===== SMART room conflict across ALL sections ===== */
async function hasRoomConflictAllSections(day, room, startMin, endMin, subject, teacher, skipSectionId=null, skipScheduleId=null){
  const qRoom = query(collectionGroup(db,'schedules'), where('room','==', room));
  const snap = await getDocs(qRoom);

  const want = normSubj(subject);
  for(const docu of snap.docs){
    const d = docu.data();
    if(d.day !== day) continue;
    const secId = docu.ref.parent.parent.id;

    if(skipSectionId && secId===skipSectionId && skipScheduleId && docu.id===skipScheduleId) continue;

    if(overlaps(d.startMin, d.endMin, startMin, endMin)){
      const otherSubj = normSubj(d.subject || '');
      const teacherOk = (!teacher || !d.teacher) ? true : sameTeacher(d.teacher, teacher);
      if (otherSubj === want && teacherOk){
        continue;
      }
      return {
        conflict: true,
        withSection: secId,
        withSubj: d.subject || 'another class',
        withTeacher: d.teacher || ''
      };
    }
  }
  return { conflict:false };
}

const scheduleModal = document.getElementById('schedule-modal');
document.getElementById('add-section-schedule-btn').onclick = async ()=>{
  if (!(isAdmin || isTeacher)) return;
  await requireAuth();
  resetScheduleForm();
  delete document.getElementById('schedule-form').dataset.editId;
  document.getElementById('section').value=activeSection;
  document.getElementById('section-selected').textContent=activeSection;
  document.getElementById('submit-text').textContent = 'Add Schedule';
  document.getElementById('modal-title').textContent = 'Add New Schedule';
  hideFormError(); document.getElementById('conflict').classList.add('hidden');
  scheduleModal.classList.remove('hidden');
  closeAllCombos();
};
document.getElementById('close-section-detail-btn').onclick = ()=> document.getElementById('section-detail-modal').classList.add('hidden');
document.getElementById('close-modal-btn').onclick = ()=>{ scheduleModal.classList.add('hidden'); resetScheduleForm(); delete document.getElementById('schedule-form').dataset.editId; };
document.getElementById('cancel-btn').onclick = ()=>{ scheduleModal.classList.add('hidden'); resetScheduleForm(); delete document.getElementById('schedule-form').dataset.editId; };

document.getElementById('schedule-form').addEventListener('submit', async (e)=>{
  e.preventDefault();
  if (!(isAdmin || isTeacher)) return;
  try{
    await requireAuth();
    const check=validateScheduleForm();
    if(!check.ok) return;

    const {subject,section,room,teacher,day,startHHMM,endHHMM}=check.values;
    const sm=toMinutes(startHHMM), em=toMinutes(endHHMM);
    if(em<=sm){ markError('end-time'); showFormError('End time must be after start time.'); return; }

    const editId = document.getElementById('schedule-form').dataset.editId;
    const secSameDay = currentSchedules.filter(x=>x.day===day && (!editId || x.id!==editId));
    for(const it of secSameDay){
      if(overlaps(it.startMin, it.endMin, sm, em)){
        showFormError('Section conflict: this section already has a class at this time.');
        return;
      }
    }

    const roomChk = await hasRoomConflictAllSections(day, room, sm, em, subject, teacher, section, editId || null);
    if(roomChk.conflict){
      const who = `${roomChk.withSubj}${roomChk.withTeacher ? ' • '+roomChk.withTeacher : ''}`;
      const where = roomChk.withSection ? ` (${roomChk.withSection})` : '';
      showFormError(`Room conflict: ${room} already booked at this time by ${who}${where}.`);
      return;
    }

    const aBtn  = document.getElementById('schedule-submit');
    const aText = document.getElementById('submit-text');
    const aSpin = document.getElementById('schedule-loader');
    aBtn.disabled = true; aSpin.classList.remove('hidden'); aText.textContent = editId ? 'Saving Changes...' : 'Adding Schedule...'; aBtn.classList.add('opacity-90','cursor-not-allowed');

    const timeRange=makeRange(startHHMM,endHHMM);
    const basePayload = {
      day,
      subject,
      room,
      teacher,
      startMin: sm,
      endMin: em,
      timeDisplay: timeRange
    };

    const secRef = doc(db,'sections',section);
    await ensureSectionDoc(section);

    if (editId) {
      // Extra safety: teacher can only edit their own schedule
      if (isTeacher && !isAdmin) {
        const snap = await getDoc(doc(secRef,'schedules',editId));
        const existing = snap.exists() ? (snap.data() || {}) : {};
        if (!CURRENT_USER_ID || existing.ownerId !== CURRENT_USER_ID) {
          showFormError('You are not allowed to edit this schedule.');
          aBtn.disabled = false; aSpin.classList.add('hidden'); aText.textContent = 'Add Schedule'; aBtn.classList.remove('opacity-90','cursor-not-allowed');
          return;
        }
      }
      await updateDoc(doc(secRef,'schedules',editId), basePayload);
    } else {
      // New schedule: store who created it
      await addDoc(collection(secRef,'schedules'), {
        ...basePayload,
        ownerId: CURRENT_USER_ID || '',
        createdAt: serverTimestamp()
      });
    }

    await refreshCounts(section);
    resetScheduleForm();
    scheduleModal.classList.add('hidden');

    aBtn.disabled = false; aSpin.classList.add('hidden'); aText.textContent = 'Add Schedule'; aBtn.classList.remove('opacity-90','cursor-not-allowed');
  }catch(err){
    console.error(err);
    showFormError(err?.message || 'Something went wrong while saving the schedule.');
    const aBtn  = document.getElementById('schedule-submit');
    const aText = document.getElementById('submit-text');
    const aSpin = document.getElementById('schedule-loader');
    aBtn.disabled = false; aSpin.classList.add('hidden'); aText.textContent = 'Add Schedule'; aBtn.classList.remove('opacity-90','cursor-not-allowed');
  }
});


function resetScheduleForm(){
  const form=document.getElementById('schedule-form'); if(form) form.reset();
  hideFormError(); document.getElementById('conflict')?.classList.add('hidden');
  ['section','room','teacher','day','time'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  const defaults={ 'section-selected':(activeSection||'Select section'), 'room-selected':'Select room', 'teacher-selected':'Select teacher', 'day-selected':'Select day' };
  Object.entries(defaults).forEach(([id,val])=>{ const el=document.getElementById(id); if(el) el.textContent=val; });
  clearErrors();
  document.getElementById('room-combo').value='';
  document.getElementById('teacher-combo').value='';
  document.getElementById('room-dropdown').classList.remove('combo-has-text');
  document.getElementById('teacher-dropdown').classList.remove('combo-has-text');
  const aBtn  = document.getElementById('schedule-submit');
  const aText = document.getElementById('submit-text');
  const aSpin = document.getElementById('schedule-loader');
  aBtn.disabled = false; aSpin.classList.add('hidden'); aText.textContent = 'Add Schedule'; aBtn.classList.remove('opacity-90','cursor-not-allowed');
  closeAllCombos();
}

function setDayOptionsForYear(){
  const panel = document.getElementById('day-options');
  if(!panel) return;
  const exists = panel.querySelector('.day-option[data-value="Saturday"]');
  if(currentYear === '1st Year'){
    if(!exists){
      const div = document.createElement('div');
      div.className = 'day-option p-3 rounded-xl hover:bg-gray-50 cursor-pointer';
      div.dataset.value='Saturday';
      div.textContent = 'Saturday';
      panel.appendChild(div);
    }
  } else if (exists){ exists.remove(); }
}
function setupYearDropdown(){
  const yearBtn   = document.getElementById('year-dropdown');
  const yearPanel = document.getElementById('year-options');
  const yearLabel = document.getElementById('year-selected');
  yearBtn.addEventListener('click', ()=> yearPanel.classList.toggle('hidden'));
  Array.from(yearPanel.querySelectorAll('.year-option')).forEach(opt=>{
    opt.addEventListener('click', ()=>{
      currentYear = opt.textContent.trim();
      yearLabel.textContent = currentYear;
      yearPanel.classList.add('hidden');
      resetScheduleForm();
      renderSectionCards();
      populateSectionOptions();
      setDayOptionsForYear();
      if (isIrregularStudent) {
        const btn = $('#confirm-choose-btn');
        if (IRREGULAR_PICK && !mergedSectionsForYear(currentYear).includes(IRREGULAR_PICK)) {
          IRREGULAR_PICK = null;
          btn?.classList.toggle('hidden', IRREGULAR_CONFIRMED.size > 0 || IRREGULAR_ENROLLED.size === 0);
        }
      }
    });
  });
  document.addEventListener('click', (e)=>{ if(!yearBtn.contains(e.target) && !yearPanel.contains(e.target)) yearPanel.classList.add('hidden'); });
}


function setupCourseDropdown(){
  const courseBtn   = document.getElementById('course-dropdown');
  const coursePanel = document.getElementById('course-options');
  const courseLabel = document.getElementById('course-selected');
  if (!courseBtn || !coursePanel || !courseLabel) return;

  const options = Array.from(coursePanel.querySelectorAll('.course-option'));

  // If irregular has a stored course, show that on load
  if (isIrregularStudent && IRREGULAR_COURSE) {
    currentCourse = IRREGULAR_COURSE;
    courseLabel.textContent = IRREGULAR_COURSE;
  }

  // open/close panel
  courseBtn.addEventListener('click', (e)=>{
    e.stopPropagation();
    coursePanel.classList.toggle('hidden');
  });

  // clicking an option
  options.forEach(opt=>{
    opt.addEventListener('click', ()=>{
      const clickedCourse = opt.textContent.trim();

      // IRREGULAR: lock to their course, ignore other clicks
      if (isIrregularStudent && IRREGULAR_COURSE) {
        // if they click a different course, just close panel and keep their course
        if (clickedCourse !== IRREGULAR_COURSE) {
          coursePanel.classList.add('hidden');
          return;
        }
        currentCourse = IRREGULAR_COURSE;
      } else {
        // teacher/admin/regular student → normal behavior
        currentCourse = clickedCourse;
      }

      courseLabel.textContent = currentCourse;
      coursePanel.classList.add('hidden');

      // refresh sections + section dropdown
      renderSectionCards();
      populateSectionOptions();
    });
  });

  // click outside to close
  document.addEventListener('click', (e)=>{
    if (!courseBtn.contains(e.target) && !coursePanel.contains(e.target)) {
      coursePanel.classList.add('hidden');
    }
  });
}



/* helper: degree text for Add Section modal per course */
function degreeForCourse(course){
  switch(course){
    case 'BIT Computer Technology':
      return 'Bachelor in Industrial Technology';
    case 'BTVT-ED Automotive Technology':
      return 'BTVT-ED Automotive Technology';
    case 'BTVT-ED Computer Programming':
      return 'BTVT-ED Computer Programming';
    case 'BTVT-ED Civil Technology':
      return 'BTVT-ED Civil Technology';
    case 'BTVT-ED Electrical Technology':
      return 'BTVT-ED Electrical Technology';
    case 'BTVT-ED Electronics Technology':
      return 'BTVT-ED Electronics Technology';
    case 'BTVT-ED Food & Service Management':
      return 'BTVT-ED Food & Service Management';
    case 'BTVT-ED Mechanical Technology':
      return 'BTVT-ED Mechanical Technology';
    default:
      return 'Bachelor in Industrial Technology';
  }
}


const signoutBtn = document.getElementById('signout-btn');
const signoutModal = document.getElementById('signout-modal');
const cancelSignout = document.getElementById('cancel-signout');
const confirmSignout = document.getElementById('confirm-signout');
if(signoutBtn && signoutModal){
  signoutBtn.addEventListener('click', ()=>{ signoutModal.classList.remove('hidden'); signoutModal.style.display='flex'; });
  cancelSignout.addEventListener('click', ()=>{ signoutModal.classList.add('hidden'); signoutModal.style.display='none'; });
  confirmSignout.addEventListener('click', ()=>{ signoutModal.classList.add('hidden'); signoutModal.style.display='none'; });
}

function applyRoleUI(){
  const yearWrap = document.getElementById('year-filter-wrap');
  const headTitle = document.getElementById('section-title');
  const headSubtitle = document.getElementById('section-subtitle');
  const addStuBtn = document.getElementById('add-section-student-btn');
  const addSchedBtn = document.getElementById('add-section-schedule-btn');
  const addRemBtn = document.getElementById('add-section-reminder-btn');

  const addSectionBtn = document.getElementById('add-section-btn');
  const confirmChooseBtn = document.getElementById('confirm-choose-btn');
  const courseWrap = document.getElementById('course-dropdown')?.parentElement || null;

  if (isStudent && !isIrregularStudent) {
    if (yearWrap) yearWrap.classList.add('hidden');
    if (courseWrap) courseWrap.classList.add('hidden');
    if (headTitle) headTitle.textContent = 'Your Section';
    if (headSubtitle) headSubtitle.textContent = 'View your section schedule and student list.';
    if (addSchedBtn) addSchedBtn.classList.add('hidden');
    if (addStuBtn) addStuBtn.classList.remove('hidden');
    if (addRemBtn) addRemBtn.classList.add('hidden');
    if (addSectionBtn) addSectionBtn.classList.add('hidden');
    if (confirmChooseBtn) confirmChooseBtn.classList.add('hidden');
  }

    if (isIrregularStudent) {
    // show course dropdown, but it is locked by setupCourseDropdown()
    if (courseWrap) courseWrap.classList.remove('hidden');

    // force label + currentCourse to their picked course (if any)
    if (IRREGULAR_COURSE) {
      const courseLabel = document.getElementById('course-selected');
      if (courseLabel) courseLabel.textContent = IRREGULAR_COURSE;
      currentCourse = IRREGULAR_COURSE;
    }

    if (IRREGULAR_CONFIRMED.size > 0) {
      if (headTitle) headTitle.textContent = 'Your Section';
      if (headSubtitle) headSubtitle.textContent = 'View your section schedule and student list.';
      yearWrap?.classList.add('hidden');
      confirmChooseBtn?.classList.add('hidden');
    } else {
      if (headTitle) headTitle.textContent = 'Choose Your Section';
      if (headSubtitle) headSubtitle.textContent = 'Select a section for your course.';
      yearWrap?.classList.remove('hidden');
      confirmChooseBtn?.classList.add('hidden');
    }
    if (addSectionBtn) addSectionBtn.classList.add('hidden');
  }


  if (isTeacher) {
    if (yearWrap) yearWrap.classList.remove('hidden');
    if (courseWrap) courseWrap.classList.remove('hidden');
    if (addStuBtn) addStuBtn.classList.add('hidden');
    if (addSchedBtn) addSchedBtn.classList.add('hidden');
    if (addRemBtn) addRemBtn.classList.remove('hidden');
    if (addSectionBtn) addSectionBtn.classList.add('hidden');
    if (confirmChooseBtn) confirmChooseBtn.classList.add('hidden');
  }

  if (isAdmin) {
    if (yearWrap) yearWrap.classList.remove('hidden');
    if (courseWrap) courseWrap.classList.remove('hidden');
    if (addStuBtn) addStuBtn.classList.remove('hidden');
    if (addSchedBtn) addSchedBtn.classList.remove('hidden');
    if (addRemBtn) addRemBtn.classList.remove('hidden');
    if (addSectionBtn) addSectionBtn.classList.remove('hidden');
    if (confirmChooseBtn) confirmChooseBtn.classList.add('hidden');
  }
}

/* ======= ADD / EDIT SECTION UI (Admin) ======= */
const addSecBtn = document.getElementById('add-section-btn');
const addSecModal = document.getElementById('add-section-modal');
const addSecForm = document.getElementById('add-section-form');
const addSecClose = document.getElementById('add-sec-close');
const addSecCancel = document.getElementById('add-sec-cancel');
const addSecTitle = document.getElementById('add-sec-title');
const addSecDegree = document.getElementById('add-sec-degree');
const addSecYearLabel = document.getElementById('add-sec-yearlabel');
const addSecTrack = document.getElementById('add-sec-track');
const addSecSection = document.getElementById('add-sec-section');
const addSecCode = document.getElementById('add-sec-code');
const addSecSave = document.getElementById('add-sec-save');
const addSecLoader = document.getElementById('add-sec-loader');
const addSecText = document.getElementById('add-sec-text');
const addSecMismatch = document.getElementById('add-sec-mismatch');

function openAddSection(){
  addSecModal.classList.remove('hidden');
  addSecModal.classList.add('flex');
}
function closeAddSection(){
  addSecModal.classList.add('hidden');
  addSecModal.classList.remove('flex');
  delete addSecForm.dataset.editOldId;
  document.querySelector('#add-section-modal .modal-head .font-bold').textContent = 'Add Section';
  addSecText.textContent = 'Save';
}

// NEW: inline warning element
const addSecWarning = document.getElementById('add-section-warning');

addSecBtn?.addEventListener('click', ()=>{
  if (!isAdmin) return;

  if (!currentCourse) {
  if (addSecWarning) {

    addSecWarning.style.setProperty("display", "inline-flex", "important");
    addSecWarning.classList.remove("hidden");

    addSecWarning.classList.remove("add-section-shake");
    void addSecWarning.offsetWidth; 
    addSecWarning.classList.add("add-section-shake");

    clearTimeout(addSecWarning.hideTimer);
    addSecWarning.hideTimer = setTimeout(() => {
      addSecWarning.classList.add("hidden");
      addSecWarning.style.removeProperty("display");
    }, 2000);
  }
  return;
}

  if (addSecWarning) addSecWarning.classList.add('hidden');

  addSecForm.reset();
  addSecDegree.value = degreeForCourse(currentCourse);
  addSecYearLabel.value = '';
  addSecTrack.value = '';
  addSecSection.value = '';
  addSecCode.value = '';
  addSecMismatch.classList.add('hidden');

  const short = (COURSE_SHORT[currentCourse] || 'BIT');
  addSecTitle.placeholder = `e.g. ${short} 3B-B`;
  openAddSection();
});

addSecClose?.addEventListener('click', closeAddSection);
addSecCancel?.addEventListener('click', closeAddSection);

function checkYearMismatchUI(parsed){
  if (!parsed){ addSecMismatch.classList.add('hidden'); return false; }
  const expect = currentYear;
  const mismatch = parsed.yearLabel !== expect;
  if (mismatch){
    const expectNum = expect.match(/^(\d)/)?.[1] || '';
    addSecMismatch.textContent = `You are adding under ${expect}. Please use year ${expectNum} in the title.`;
    addSecMismatch.classList.remove('hidden');
  } else {
    addSecMismatch.classList.add('hidden');
  }
  return mismatch;
}

addSecTitle?.addEventListener('input', ()=>{
  const parsed = parseSectionTitle(addSecTitle.value, currentCourse);
  if (!parsed){
    addSecYearLabel.value = '';
    addSecTrack.value = '';
    addSecSection.value = '';
    addSecCode.value = '';
    addSecMismatch.classList.add('hidden');
    return;
  }
  addSecYearLabel.value = parsed.yearLabel;
  addSecTrack.value = parsed.track;
  addSecSection.value = parsed.section;
  addSecCode.value = parsed.code;
  checkYearMismatchUI(parsed);
});


addSecForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  if (!isAdmin) return;

  const parsed = parseSectionTitle(addSecTitle.value, currentCourse);

  if (!parsed || !parsed.code){
    const course = currentCourse || DEFAULT_COURSE;
    const short = (COURSE_SHORT[course] || 'BIT').toLowerCase();
    addSecMismatch.textContent =
      `Please enter a valid title like "${short} 1c-c" or "${short.toUpperCase()} 2a".`;
    addSecMismatch.classList.remove('hidden');
    return;
  }

  if (checkYearMismatchUI(parsed)) return;

  try{
    addSecSave.disabled = true;
    addSecLoader.classList.remove('hidden');
    addSecText.textContent = addSecForm.dataset.editOldId ? 'Saving...' : 'Saving...';

    const editingOld = addSecForm.dataset.editOldId || null;

    if (editingOld){
      if (editingOld !== parsed.code){
        await renameSection(editingOld, parsed);
      } else {
        await upsertSectionInfo(parsed.code, {
          name: parsed.code,
          degree: parsed.degree,
          yearNum: parsed.yearNum,
          yearLabel: parsed.yearLabel,
          track: parsed.track,
          section: parsed.section,
          updatedAt: serverTimestamp(),
          course: currentCourse || DEFAULT_COURSE
        });
        await refreshCounts(parsed.code);
      }
    } else {
      await upsertSectionInfo(parsed.code, {
        name: parsed.code,
        degree: parsed.degree,
        yearNum: parsed.yearNum,
        yearLabel: parsed.yearLabel,
        track: parsed.track,
        section: parsed.section,
        createdAt: serverTimestamp(),
        meta: { studentCount: 0, subjectCount: 0 },
        course: currentCourse || DEFAULT_COURSE
      });

      const yl = parsed.yearLabel;
      EXTRA_SECTIONS[yl]?.add(parsed.code);
      if (!EXTRA_SECTIONS_BY_COURSE[currentCourse || DEFAULT_COURSE]) {
        EXTRA_SECTIONS_BY_COURSE[currentCourse || DEFAULT_COURSE] = {
          '1st Year': new Set(),
          '2nd Year': new Set(),
          '3rd Year': new Set(),
          '4th Year': new Set(),
        };
      }
      EXTRA_SECTIONS_BY_COURSE[currentCourse || DEFAULT_COURSE][yl].add(parsed.code);
    }

    renderSectionCards();
    populateSectionOptions();
    closeAddSection();
  }catch(err){
    console.error(err);
    alert('Failed to save section.');
  }finally{
    addSecSave.disabled = false;
    addSecLoader.classList.add('hidden');
    addSecText.textContent = 'Save';
  }
});


/* ====== Reminders  ====== */
const remModal   = document.getElementById('reminder-modal');
const remOpenBtn = document.getElementById('add-section-reminder-btn');
const remClose   = document.getElementById('rem-close');
const remCancel  = document.getElementById('rem-cancel');
const remForm    = document.getElementById('rem-form');
const remSecEl   = document.getElementById('rem-section');
const remTitleEl = document.getElementById('rem-title');
const remSubjectEl = document.getElementById('rem-subject');
const remDateEl  = document.getElementById('rem-date');
const remTimeEl  = document.getElementById('rem-time');
const remEndEl   = document.getElementById('rem-end-time');
const remDayEl   = document.getElementById('rem-day');
const remNotesEl = document.getElementById('rem-notes');
const remSuggest = document.getElementById('rem-subject-suggest');
const remPreviewBtn = document.getElementById('rem-preview');

const remPrevModal = document.getElementById('rem-preview-modal');
const remPrevClose = document.getElementById('rem-preview-close');
const remPrevList  = document.getElementById('reminders-list-preview');

const remSaveBtn    = document.getElementById('rem-save');
const remSaveLoader = document.getElementById('rem-save-loader');
const remSaveText   = document.getElementById('rem-save-text');

let REMINDER_SUBJECT_SOURCE = []; 

function buildReminderSubjectSource(){
  const set = new Set();
  currentSchedules.forEach(s => { if (s.subject) set.add(String(s.subject).trim()); });
  REMINDER_SUBJECT_SOURCE = Array.from(set).sort((a,b)=> a.localeCompare(b));
}

function openReminderModal(){
  if (!activeSection) return;
  remSecEl.value = activeSection;

  const isEditing = !!remForm.dataset.editId;
  remSuggest.classList.add('hidden');

  document.getElementById('rem-modal-title').textContent = isEditing ? 'Editing Reminder' : 'Add New Reminder';
  document.getElementById('rem-save-text').textContent = isEditing ? 'Save Changes' : 'Save Reminder';
  remSaveLoader.classList.add('hidden'); remSaveBtn.disabled = false; remSaveBtn.classList.remove('opacity-90','cursor-not-allowed');

  if (!isEditing){
    remForm.reset();
  }

  remModal.classList.add('flex');
  remModal.classList.remove('hidden');

  remPreviewBtn.classList.toggle('hidden', currentReminders.length === 0);
}
function closeReminderModal(){
  remModal.classList.add('hidden');
  remModal.classList.remove('flex');
  delete remForm.dataset.editId;
  document.getElementById('rem-modal-title').textContent = 'Add New Reminder';
  document.getElementById('rem-save-text').textContent = 'Save Reminder';
  remSaveLoader.classList.add('hidden'); remSaveBtn.disabled = false; remSaveBtn.classList.remove('opacity-90','cursor-not-allowed');
}

if (remOpenBtn){
  remOpenBtn.addEventListener('click', ()=>{
    if (!(isTeacher || isAdmin)) return;
    delete remForm.dataset.editId;
    remForm.reset();
    openReminderModal();
  });
}
remClose?.addEventListener('click', closeReminderModal);
remCancel?.addEventListener('click', closeReminderModal);

function filterReminderSubjects(q){
  const query = (q||'').trim().toLowerCase();
  if (!query){ remSuggest.classList.add('hidden'); remSuggest.innerHTML=''; return; }
  const starts = REMINDER_SUBJECT_SOURCE.filter(s => s.toLowerCase().startsWith(query));
  const contains = REMINDER_SUBJECT_SOURCE.filter(s => !s.toLowerCase().startsWith(query) && s.toLowerCase().includes(query));
  const list = [...starts, ...contains].slice(0,3);
  if (!list.length){ remSuggest.classList.add('hidden'); remSuggest.innerHTML=''; return; }
  remSuggest.innerHTML = list.map(s => `<div class="rem-suggest-item" data-value="${s.replace(/"/g,'&quot;')}">${s}</div>`).join('');
  remSuggest.classList.remove('hidden');
}
remSubjectEl.addEventListener('input', ()=> filterReminderSubjects(remSubjectEl.value));
remSubjectEl.addEventListener('focus', ()=> filterReminderSubjects(remSubjectEl.value));
document.addEventListener('mousedown', (e)=>{
  if (!remSuggest.contains(e.target) && e.target !== remSubjectEl){
    remSuggest.classList.add('hidden');
  }
});
remSuggest.addEventListener('mousedown', (e)=>{
  const it = e.target.closest('.rem-suggest-item');
  if (!it) return;
  remSubjectEl.value = it.dataset.value || it.textContent.trim();
  remSuggest.classList.add('hidden');
});

function renderPreviewReminders(items){
  if (!remPrevList) return;
  if (!items.length){
    remPrevList.innerHTML = `<div class="text-sm text-gray-500 px-2">No reminders yet.</div>`;
    remPrevList.classList.remove('rem-scroll-capped');
    return;
  }
  remPrevList.innerHTML = items.map(r=>{
    const whenStr = [r.date, r.day, makeRange(r.time, r.endTime)].filter(Boolean).join(' • ');
    const notesPreview = r.notes ? `<div class="mt-1 text-[12px] text-gray-700 text-justify leading-relaxed rem-notes-preview">${r.notes}</div>` : '';
    return `
      <div class="rem-item group" data-id="${r.id}">
        <div class="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition">
          <button class="rem-edit w-7 h-7 rounded-[8px] bg-blue-500 text-white hover:opacity-90 flex items-center justify-center" title="Edit"><i class="ri-pencil-line text-xs"></i></button>
          <button class="rem-del  w-7 h-7 rounded-[8px] bg-red-600 text-white hover:opacity-90 flex items-center justify-center" title="Delete"><i class="ri-delete-bin-6-line text-xs"></i></button>
        </div>
        <div class="flex items-start justify-between gap-3">
          <div class="pr-2">
            <div class="text-[13px] font-semibold text-gray-800 break-anywhere">${r.title||'—'}</div>
            <div class="text-[11px] text-gray-500 break-anywhere">${r.subject||'—'}</div>
          </div>
        </div>
        <div class="mt-2 text-[11px] text-gray-600 flex items-center gap-1 break-anywhere"><i class="ri-time-line text-[13px]"></i>${whenStr||'—'}</div>
        ${notesPreview}
      </div>
    `;
  }).join('');

  const count = remPrevList.querySelectorAll('.rem-item').length;
  if (count > 3){
    remPrevList.classList.add('rem-scroll-capped');
  } else {
    remPrevList.classList.remove('rem-scroll-capped');
  }
}

function openPreview(){
  renderPreviewReminders(currentReminders);
  remPrevModal.classList.remove('hidden');
  remPrevModal.classList.add('flex');
}
function closePreview(){
  remPrevModal.classList.add('hidden');
  remPrevModal.classList.remove('flex');
}
remPreviewBtn?.addEventListener('click', openPreview);
remPrevClose?.addEventListener('click', closePreview);
remPrevModal?.addEventListener('click', (e)=>{ if (e.target === remPrevModal) closePreview(); });

remPrevList?.addEventListener('click', async (e)=>{
  const card = e.target.closest('.rem-item'); if (!card) return;
  const id = card.getAttribute('data-id');
  const editBtn = e.target.closest('.rem-edit');
  const delBtn  = e.target.closest('.rem-del');

  if (delBtn){
    if (!(isTeacher || isAdmin)) return;
    if (!activeSection) return;
    pendingDeleteId = id;
    openDelModal('reminder');
    return;
  }

  if (editBtn){
    if (!(isTeacher || isAdmin)) return;
    if (!activeSection) return;
    const snap = await getDoc(doc(db,'sections',activeSection,'reminders',id));
    if (!snap.exists()) return;
    const r = snap.data()||{};
    remForm.dataset.editId = id;
    remSecEl.value   = activeSection;
    remTitleEl.value = r.title || '';
    remSubjectEl.value = r.subject || '';
    remDateEl.value  = r.date || '';
    remDayEl.value   = r.day || '';
    remTimeEl.value  = r.time || '';
    remEndEl.value   = r.endTime || '';
    remNotesEl.value = r.notes || '';

    closePreview();
    openReminderModal();
  }
});

remForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  try{
    const section = remSecEl.value.trim();
    const title   = remTitleEl.value.trim();
    const subject = remSubjectEl.value.trim();
    const date    = remDateEl.value;
    const start   = (remTimeEl.value || '').trim();
    const end     = (remEndEl.value  || '').trim();
    const day     = (remDayEl.value  || '').trim();
    const notes   = remNotesEl.value.trim();

    if (!section || !title || !subject || !date){
      alert('Please complete the required fields: Title, Subject, Date.');
      return;
    }

    await ensureSectionDoc(section);

    const editingId = remForm.dataset.editId;

    remSaveBtn.disabled = true;
    remSaveLoader.classList.remove('hidden');
    remSaveBtn.classList.add('opacity-90','cursor-not-allowed');
    remSaveText.textContent = editingId ? 'Saving Changes...' : 'Saving Reminder...';

    if (editingId){
      await updateDoc(doc(db,'sections',section,'reminders',editingId), {
        title, subject, date,
        time: start || null,
        endTime: end || null,
        day: day || null,
        notes
      });
    } else {
      await addDoc(collection(doc(db,'sections',section),'reminders'), {
        title, subject, date,
        time: start || null,
        endTime: end || null,
        day: day || null,
        notes,
        ownerId: CURRENT_USER_ID || '',
        createdAt: serverTimestamp()
      });
      sessionStorage.setItem('reminder_target_section', section);
    }

    remSaveBtn.disabled = false;
    remSaveLoader.classList.add('hidden');
    remSaveBtn.classList.remove('opacity-90','cursor-not-allowed');
    remSaveText.textContent = editingId ? 'Save Changes' : 'Save Reminder';

    closeReminderModal();
    remForm.reset();
    delete remForm.dataset.editId;
  }catch(err){
    console.error(err);
    alert('Failed to save reminder.');
    remSaveBtn.disabled = false;
    remSaveLoader.classList.add('hidden');
    remSaveBtn.classList.remove('opacity-90','cursor-not-allowed');
    remSaveText.textContent = remForm.dataset.editId ? 'Save Changes' : 'Save Reminder';
  }
});


function weekdayFromISO(iso){
  if(!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y,m,d] = iso.split('-').map(Number);
  const dt = new Date(y, m-1, d);
  const names = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  return names[dt.getDay()];
}
remDateEl.addEventListener('change', ()=>{
  const w = weekdayFromISO(remDateEl.value);
  if (w){
    remDayEl.value = w;
  }
});

/* ===== Irregular Confirm Choice flow (PERSISTENT, no localStorage) ===== */
const confirmBtn = document.getElementById('confirm-choose-btn');
const confirmModal = document.getElementById('confirm-choose-modal');
const confirmClose = document.getElementById('confirm-choose-close');
const confirmCancel = document.getElementById('confirm-choose-cancel');
const confirmSave = document.getElementById('confirm-choose-save');
const confirmText = document.getElementById('confirm-choose-text');
const confirmSpin = document.getElementById('confirm-choose-loader');

async function unenrollFromSection(sectionId){
  try{
    const secRef = doc(db,'sections',sectionId);
    const qMine = query(collection(secRef,'students'), where('ownerId','==', CURRENT_USER_ID || '__none__'));
    const snap = await getDocs(qMine);
    for (const d of snap.docs){
      await deleteDoc(d.ref);
    }
    IRREGULAR_ENROLLED.delete(sectionId);
    const cbtn = document.getElementById('confirm-choose-btn');
    cbtn?.classList.toggle('hidden', IRREGULAR_ENROLLED.size === 0);
  }catch(e){
    alert('Failed to delete your enrollment. Please try again.');
  }
}

function openConfirmModal(){
  const list = Array.from(IRREGULAR_ENROLLED);
  const singleWrap = document.getElementById('confirm-choose-single');
  const listWrap   = document.getElementById('confirm-choose-list');

  if (list.length <= 1){
    const one = list[0] || IRREGULAR_PICK || '—';
    document.getElementById('confirm-choose-name').textContent = one;
    document.getElementById('confirm-choose-desc').textContent = one && one !== '—' ? getDesc(one) : '—';

    const delBtnId = 'confirm-single-del';
    let del = document.getElementById(delBtnId);
    if (!del){
      del = document.createElement('button');
      del.id = delBtnId;
      del.className = 'mt-2 px-3 py-1.5 rounded-button bg-red-600 text-white text-xs';
      del.textContent = 'Delete';
      singleWrap.appendChild(del);
    }
    del.onclick = async ()=>{
      if (!one || one==='—') return;
      await unenrollFromSection(one);
      closeConfirmModal();
      if (IRREGULAR_ENROLLED.size > 0) openConfirmModal();
    };

    singleWrap.classList.remove('hidden');
    listWrap.classList.add('hidden');
    listWrap.classList.remove('rem-scroll-capped');
  } else {
    listWrap.innerHTML = list.map(sec => `
      <div class="p-3 rounded-xl border border-emerald-100 bg-emerald-50/50 flex items-start justify-between gap-3">
        <div>
          <div class="text-base font-semibold text-primary">${sec}</div>
          <div class="text-xs text-gray-700">${getDesc(sec)}</div>
        </div>
        <button data-sec="${sec}" class="choose-del px-2.5 py-1.5 rounded-button bg-red-600 text-white text-xs">Delete</button>
      </div>
    `).join('');
    listWrap.classList.remove('hidden');
    singleWrap.classList.add('hidden');

    const makeScrollable = list.length > 3;
    listWrap.classList.toggle('rem-scroll-capped', makeScrollable);

    listWrap.querySelectorAll('.choose-del').forEach(btn=>{
      btn.addEventListener('click', async (e)=>{
        const sec = e.currentTarget.getAttribute('data-sec');
        await unenrollFromSection(sec);
        closeConfirmModal();
        if (IRREGULAR_ENROLLED.size > 0) openConfirmModal();
      });
    });
  }

  confirmModal.classList.remove('hidden');
  confirmModal.classList.add('flex');
}
function closeConfirmModal(){
  confirmModal.classList.add('hidden');
  confirmModal.classList.remove('flex');
}

confirmBtn?.addEventListener('click', ()=>{
  if (!isIrregularStudent || IRREGULAR_ENROLLED.size === 0) return;
  openConfirmModal();
});
confirmClose?.addEventListener('click', closeConfirmModal);
confirmCancel?.addEventListener('click', closeConfirmModal);

confirmSave?.addEventListener('click', async ()=>{
  if (IRREGULAR_ENROLLED.size === 0 && !IRREGULAR_PICK) return;

  confirmSave.disabled = true;
  confirmSpin.classList.remove('hidden');
  confirmText.textContent = 'Saving...';

  const preferredList = Array.from(
    IRREGULAR_ENROLLED.size ? IRREGULAR_ENROLLED : (IRREGULAR_PICK ? [IRREGULAR_PICK] : [])
  );
  await saveIrregularConfirmed(preferredList);
  IRREGULAR_CONFIRMED = new Set(preferredList);

  closeConfirmModal();
  applyRoleUI();
  renderSectionCards();

  confirmSave.disabled = false;
  confirmSpin.classList.add('hidden');
  confirmText.textContent = 'Save';
});

/* ========= Section edit/delete helpers ========= */
async function copyDocs(srcParentRef, dstParentRef, subcol){
  const src = collection(srcParentRef, subcol);
  const dst = collection(dstParentRef, subcol);
  const snap = await getDocs(src);
  for (const d of snap.docs){
    const data = d.data();
    await addDoc(dst, data);
  }
}
async function deleteSubcollection(parentRef, subcol){
  const colRef = collection(parentRef, subcol);
  const snap = await getDocs(colRef);
  for (const d of snap.docs){
    await deleteDoc(d.ref);
  }
}
async function cascadeDeleteSection(sectionId){
  const oldRef = doc(db,'sections', sectionId);
  await deleteSubcollection(oldRef, 'students');
  await deleteSubcollection(oldRef, 'schedules');
  await deleteSubcollection(oldRef, 'reminders');
  await deleteDoc(oldRef);
}
async function renameSection(oldId, newParsed){
  const oldRef = doc(db,'sections', oldId);
  const newRef = doc(db,'sections', newParsed.code);

  const oldSnap = await getDoc(oldRef);
  const oldData = oldSnap.exists() ? oldSnap.data() || {} : {};

  await upsertSectionInfo(newParsed.code, {
    name: newParsed.code,
    degree: newParsed.degree,
    yearNum: newParsed.yearNum,
    yearLabel: newParsed.yearLabel,
    track: newParsed.track,
    section: newParsed.section,
    createdAt: serverTimestamp(),
    meta: { studentCount: 0, subjectCount: 0 },
    course: oldData.course || currentCourse || DEFAULT_COURSE
  });

  await copyDocs(oldRef, newRef, 'students');
  await copyDocs(oldRef, newRef, 'schedules');
  await copyDocs(oldRef, newRef, 'reminders');

  await cascadeDeleteSection(oldId);
  await refreshCounts(newParsed.code);

  const map = {'1st Year':1,'2nd Year':2,'3rd Year':3,'4th Year':4};
  const oldYearLabel = Object.keys(EXTRA_SECTIONS).find(k => EXTRA_SECTIONS[k].has(oldId)) || null;
  if (oldYearLabel) EXTRA_SECTIONS[oldYearLabel].delete(oldId);
  EXTRA_SECTIONS[newParsed.yearLabel]?.add(newParsed.code);

  const course = oldData.course || currentCourse || DEFAULT_COURSE;
  if (!EXTRA_SECTIONS_BY_COURSE[course]) {
    EXTRA_SECTIONS_BY_COURSE[course] = {
      '1st Year': new Set(),
      '2nd Year': new Set(),
      '3rd Year': new Set(),
      '4th Year': new Set(),
    };
  }
  if (oldYearLabel) EXTRA_SECTIONS_BY_COURSE[course][oldYearLabel].delete(oldId);
  EXTRA_SECTIONS_BY_COURSE[course][newParsed.yearLabel].add(newParsed.code);

  if (activeSection === oldId) activeSection = newParsed.code;
}

async function init(){
  await loadIrregularConfirmed();

  setupCourseDropdown();
  setupYearDropdown();
  applyRoleUI();
  renderSectionCards();
  populateSectionOptions();
  setDayOptionsForYear();
}
init();

