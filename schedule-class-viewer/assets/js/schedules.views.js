document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('schedule-table-body');
  const dayOptions = document.querySelectorAll('.day-filter-option');
  const sectionBtns = document.querySelectorAll('.section-filter-btn');
  const scheduleModal = document.getElementById('schedule-modal');

  const single = document.getElementById('single-table-container');
  const stack  = document.getElementById('all-sections-stack');
  const sectionCard = document.getElementById('section-card-container');

  const fade = (el) => { if(!el) return; el.classList.remove('fade-in'); void el.offsetWidth; el.classList.add('fade-in'); };

  sectionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const sec = btn.getAttribute('data-section');

      if (sec === 'all') {
        buildAllSectionsFromMaster();
        single.classList.add('hidden');
        sectionCard.classList.add('hidden');
        stack.classList.remove('hidden');
        fade(stack);
      } else {
        buildOneSectionFromMaster(sec);
        stack.classList.add('hidden');
        single.classList.add('hidden');
        sectionCard.classList.remove('hidden');
        fade(sectionCard);
      }
    });
  });

  fade(tableBody);
  dayOptions.forEach(opt => opt.addEventListener('click', () => {
    const visible = !stack.classList.contains('hidden') ? stack
                    : !sectionCard.classList.contains('hidden') ? sectionCard
                    : tableBody;
    fade(visible);
  }));

  const mo = new MutationObserver(() => fade(tableBody));
  mo.observe(tableBody, { childList: true, subtree: true });

  const modalObserver = new MutationObserver(() => {
    const isOpen = !scheduleModal.classList.contains('hidden');
    if (isOpen) fade(scheduleModal.querySelector('.bg-white.rounded-xl'));
  });
  modalObserver.observe(scheduleModal, { attributes: true, attributeFilter: ['class'] });

  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday'];

  function harvestMasterRows() {
    const rows = Array.from(document.querySelectorAll('#schedule-table-body .schedule-row'));
    const bySection = new Map();

    rows.forEach(tr => {
      const section = tr.getAttribute('data-section') || 'Unknown';
      const day = tr.getAttribute('data-day');
      const time = tr.querySelector('td:first-child')?.textContent.trim() || '';

      const tds = Array.from(tr.children);
      const dayIndex = DAYS.indexOf(day);
      let cellHTML = '';
      if (dayIndex >= 0) {
        const td = tds[1 + dayIndex];
        if (td) cellHTML = td.innerHTML;
      }

      if (!bySection.has(section)) bySection.set(section, new Map());
      const timeMap = bySection.get(section);
      if (!timeMap.has(time)) timeMap.set(time, {});
      const rec = timeMap.get(time);
      rec[day] = (rec[day] || '') + (cellHTML ? `<div class="mb-2 last:mb-0">${cellHTML}</div>` : '');
    });

    return bySection;
  }

  function tableHTMLFromTimeMap(timeMap, title) {
    const timeRows = Array.from(timeMap.keys());
    return `
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h4 class="text-sm font-semibold text-gray-800">${title}</h4>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead class="bg-primary text-white">
              <tr class="divide-x divide-white/40">
                <th class="px-4 py-3 text-left font-semibold">Time</th>
                <th class="px-4 py-3 text-left font-semibold">Monday</th>
                <th class="px-4 py-3 text-left font-semibold">Tuesday</th>
                <th class="px-4 py-3 text-left font-semibold">Wednesday</th>
                <th class="px-4 py-3 text-left font-semibold">Thursday</th>
                <th class="px-4 py-3 text-left font-semibold">Friday</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              ${timeRows.map(timeStr => {
                const rec = timeMap.get(timeStr) || {};
                return `
                  <tr class="hover:bg-gray-50 divide-x divide-gray-200">
                    <td class="px-4 py-3 font-medium text-gray-800">${timeStr}</td>
                    ${DAYS.map(d => `<td class="px-4 py-3">${rec[d] || ''}</td>`).join('')}
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  function buildAllSectionsFromMaster() {
    const bySection = harvestMasterRows();
    const stackContainer = document.getElementById('all-sections-stack');
    stackContainer.innerHTML = '';
    bySection.forEach((timeMap, sectionName) => {
      stackContainer.insertAdjacentHTML('beforeend', tableHTMLFromTimeMap(timeMap, sectionName));
    });
  }

  function buildOneSectionFromMaster(sectionName) {
    const bySection = harvestMasterRows();
    const timeMap = bySection.get(sectionName) || new Map();
    sectionCard.innerHTML = tableHTMLFromTimeMap(timeMap, sectionName);
  }

  const defaultBtn = document.querySelector('.section-filter-btn[data-section="all"]');
  if (defaultBtn) defaultBtn.click();
});
