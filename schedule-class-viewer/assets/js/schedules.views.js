document.addEventListener('DOMContentLoaded', () => {
  // read session from login page
  const USER_ROLE    = sessionStorage.getItem('auth_role')    || 'guest';
  const USER_SECTION = sessionStorage.getItem('auth_section') || '';
  const USER_NAME    = sessionStorage.getItem('auth_name')    || '';

  const tableBody       = document.getElementById('schedule-table-body');
  const sectionBtns     = document.querySelectorAll('.section-filter-btn');
  const singleContainer = document.getElementById('single-table-container');   // the big master table
  const stackContainer  = document.getElementById('all-sections-stack');       // 4 stacked tables
  const cardContainer   = document.getElementById('section-card-container');   // 1 section only (card style)

  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
  const fade = (el) => { if(!el) return; el.classList.remove('fade-in'); void el.offsetWidth; el.classList.add('fade-in'); };

  // try to grab "Browse by Section" card and title/subtitle from the page
  const schedulesSection = document.getElementById('schedules');
  const pageTitle   = schedulesSection ? schedulesSection.querySelector('h2') : null;
  const pageSub     = schedulesSection ? schedulesSection.querySelector('p')  : null;
  // this is the card that has Year / Browse by Section... no id in html, so we pick the first one
  const browseCard  = schedulesSection
    ? schedulesSection.querySelector('.bg-white.rounded-xl.shadow-sm.border.border-gray-200.mb-6')
    : null;

  function harvestMasterRows() {
    const bySection = new Map();
    const rows = tableBody ? Array.from(tableBody.querySelectorAll('.schedule-row')) : [];

    rows.forEach(tr => {
      const sectionName = tr.dataset.section || '';
      const day         = tr.dataset.day || '';
      const timeStr     = tr.querySelector('td:first-child')?.textContent.trim() || '';

      if (!sectionName || !day || !timeStr) return;

      let timeMap = bySection.get(sectionName);
      if (!timeMap) {
        timeMap = new Map();
        bySection.set(sectionName, timeMap);
      }

      let rec = timeMap.get(timeStr);
      if (!rec) {
        rec = {};
        timeMap.set(timeStr, rec);
      }

      const dayIndex = DAYS.indexOf(day);
      if (dayIndex >= 0) {
        const dayCell = tr.children[dayIndex + 1];
        rec[day] = dayCell ? dayCell.innerHTML.trim() : '';
      }
    });

    return bySection;
  }

  function tableHTMLFromTimeMap(timeMap, title) {
    const timeRows = Array.from(timeMap.keys());

    const headerCell = (txt) => `
      <div class="font-semibold tracking-wide uppercase text-[11px]">
        ${txt}
      </div>`;

    const emptyRow = `
      <tr class="hover:bg-gray-50 divide-x divide-gray-200">
        <td colspan="6" class="px-4 py-10 text-center text-gray-500">
          <div class="flex flex-col items-center gap-2">
            <i class="ri-calendar-2-line text-3xl text-gray-400"></i>
            <div class="italic">No classes scheduled yet</div>
          </div>
        </td>
      </tr>`;

    return `
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h4 class="text-sm font-semibold text-gray-800">${title}</h4>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead class="bg-gradient-to-r from-primary to-secondary text-white">
              <tr class="divide-x divide-white/20">
                <th class="px-4 py-3 text-left">${headerCell('Time')}</th>
                <th class="px-4 py-3 text-left">${headerCell('Monday')}</th>
                <th class="px-4 py-3 text-left">${headerCell('Tuesday')}</th>
                <th class="px-4 py-3 text-left">${headerCell('Wednesday')}</th>
                <th class="px-4 py-3 text-left">${headerCell('Thursday')}</th>
                <th class="px-4 py-3 text-left">${headerCell('Friday')}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              ${
                timeRows.length === 0
                  ? emptyRow
                  : timeRows.map(timeStr => {
                      const rec = timeMap.get(timeStr) || {};
                      return `
                        <tr class="hover:bg-gray-50 divide-x divide-gray-200">
                          <td class="px-4 py-3 font-medium text-gray-800">${timeStr}</td>
                          ${DAYS.map(d => `<td class="px-4 py-3">${rec[d] || ''}</td>`).join('')}
                        </tr>
                      `;
                    }).join('')
              }
            </tbody>
          </table>
        </div>
      </div>`;
  }

  function buildAllSectionsFromMaster() {
    const bySection = harvestMasterRows();

    const labels = Array.from(document.querySelectorAll('.section-filter-btn'))
      .filter(b => (b.dataset.section || '').toLowerCase() !== 'all')
      .slice(0, 4)
      .map(b => b.dataset.section);

    stackContainer.innerHTML = '';
    labels.forEach(sectionName => {
      const timeMap = bySection.get(sectionName) || new Map();
      stackContainer.insertAdjacentHTML('beforeend', tableHTMLFromTimeMap(timeMap, sectionName));
    });
  }

  function buildOneSectionFromMaster(sectionName) {
    const bySection = harvestMasterRows();
    const timeMap = bySection.get(sectionName) || new Map();
    cardContainer.innerHTML = tableHTMLFromTimeMap(timeMap, sectionName);
  }

  function showAllSections() {
    if (singleContainer) singleContainer.classList.add('hidden');
    if (cardContainer)  { cardContainer.classList.add('hidden'); cardContainer.innerHTML = ''; }
    if (stackContainer) { stackContainer.classList.remove('hidden'); fade(stackContainer); }
    buildAllSectionsFromMaster();
  }

  function showOneSection(sec) {
    if (singleContainer) singleContainer.classList.add('hidden');
    if (stackContainer)  stackContainer.classList.add('hidden');
    if (cardContainer)   { cardContainer.classList.remove('hidden'); fade(cardContainer); }
    buildOneSectionFromMaster(sec);
  }

  // ============================================================
  // STUDENT MODE
  // ============================================================
  if (USER_ROLE === 'student') {
    // show the page immediately (remove "pick a year" logic)
    document.body.classList.add('year-picked');

    // hide the browse-by-section card (the one with Year dropdown)
    if (browseCard) browseCard.style.display = 'none';

    // hide teacher/admin views
    if (singleContainer) singleContainer.classList.add('hidden');   // master table
    if (stackContainer)  stackContainer.classList.add('hidden');    // 4 sections
    if (cardContainer)   cardContainer.classList.remove('hidden');  // student view

    // change title
    if (pageTitle) pageTitle.textContent = 'Your Schedule';
    if (pageSub) {
      if (USER_SECTION) pageSub.textContent = 'Schedule for ' + USER_SECTION;
      else pageSub.textContent = 'Your enrolled class schedule';
    }

    // render right away (maybe empty if Firestore not loaded yet)
    const renderStudentSchedule = () => {
      if (!cardContainer) return;
      if (!USER_SECTION) {
        cardContainer.innerHTML = tableHTMLFromTimeMap(new Map(), 'Your Section');
        return;
      }
      buildOneSectionFromMaster(USER_SECTION);
    };
    renderStudentSchedule();

    // re-render when Firestore rows arrive / change
    if (tableBody) {
      const mo = new MutationObserver(() => {
        renderStudentSchedule();
      });
      mo.observe(tableBody, { childList: true, subtree: true });
    }

    // student should NOT see / use the section buttons
    sectionBtns.forEach(btn => {
      btn.style.display = 'none';
    });

    // student mode ends here – do NOT run the default "all" click
    // also exit before signout modal code? no, keep signout below
  } else {
    // ============================================================
    // TEACHER / ADMIN MODE (old behaviour)
    // ============================================================
    sectionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const sec = (btn.getAttribute('data-section') || '').trim();

        sectionBtns.forEach(b => b.classList.remove('bg-primary','text-white','font-semibold'));
        if (sec.toLowerCase() === 'all') {
          btn.classList.add('bg-primary','text-white','font-semibold');
          showAllSections();
        } else {
          btn.classList.add('bg-primary','text-white','font-semibold');
          showOneSection(sec);
        }
      });
    });

    // old behaviour: when NOT student, open "All" by default
    const defaultBtn = document.querySelector('.section-filter-btn[data-section="all"]');
    if (defaultBtn) defaultBtn.click();
  }

  // ============================================================
  // signout modal (keep as is)
  // ============================================================
  const LOGIN_PAGE = 'index.html';
  const signoutBtn = document.getElementById('signout-btn');
  const modal      = document.getElementById('signout-modal');
  const cancelBtn  = document.getElementById('cancel-signout');
  const yesBtn     = document.getElementById('confirm-signout');

  function openModal(){ if(modal){ modal.classList.remove('hidden'); modal.classList.add('flex'); } }
  function closeModal(){ if(modal){ modal.classList.add('hidden'); modal.classList.remove('flex'); } }

  if (signoutBtn) signoutBtn.addEventListener('click', openModal);
  if (cancelBtn)  cancelBtn.addEventListener('click', closeModal);
  if (yesBtn)     yesBtn.addEventListener('click', () => { sessionStorage.clear(); location.href = LOGIN_PAGE; });
  if (modal)      modal.addEventListener('click', (e) => { if(e.target === modal) closeModal(); });
});
