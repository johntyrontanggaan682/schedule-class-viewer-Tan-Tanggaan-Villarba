document.addEventListener('DOMContentLoaded', function () {
  const sectionFilterBtns = document.querySelectorAll('.section-filter-btn');
  const subjectFilter = document.getElementById('subject-filter');
  const roomFilter = document.getElementById('room-filter');
  const teacherFilter = document.getElementById('teacher-filter');

  const dayFilterDropdown = document.getElementById('day-filter-dropdown');
  const dayFilterSelected = document.getElementById('day-filter-selected');
  const dayFilterOptions = document.getElementById('day-filter-options');

  const singleContainer = document.getElementById('single-table-container');
  const stackContainer = document.getElementById('all-sections-stack');
  const sectionCardContainer = document.getElementById('section-card-container');

  const scheduleRows = document.querySelectorAll('.schedule-row');

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  let currentSectionFilter = 'all';
  let currentDayFilter = 'all';

  function isHidden(el) {
    return el && el.classList.contains('hidden');
  }

  function ensureOriginal(cell) {
    if (!cell) return;
    if (cell.dataset && cell.dataset.origHtml == null) {
      cell.dataset.origHtml = cell.innerHTML;
    }
  }

  function applyDayBlankingToTable(table) {
    if (!table) return;

    const ths = table.querySelectorAll('thead tr th');
    const rows = table.querySelectorAll('tbody tr');

    ths.forEach((th) => ensureOriginal(th));
    rows.forEach((tr) =>
      tr.querySelectorAll('td').forEach((td) => ensureOriginal(td))
    );

    ths.forEach((th, i) => {
      if (th.dataset && th.dataset.origHtml != null) th.innerHTML = th.dataset.origHtml;
      th.classList.remove('hidden');
    });

    rows.forEach((tr) => {
      tr.classList.remove('hidden');
      const tds = tr.querySelectorAll('td');
      tds.forEach((td) => {
        if (td.dataset && td.dataset.origHtml != null) td.innerHTML = td.dataset.origHtml;
        td.classList.remove('hidden');
      });
    });

    if (currentDayFilter === 'all') return;

    const keepIndex = 1 + DAYS.indexOf(currentDayFilter);
    if (keepIndex < 1) return;

    rows.forEach((tr) => {
      const tds = tr.querySelectorAll('td');
      tds.forEach((td, i) => {
        if (i !== 0 && i !== keepIndex) {
          td.innerHTML = '';
        }
      });
    });
  }

  function applyDayBlankingToGenerated(rootEl) {
    if (!rootEl || isHidden(rootEl)) return;
    const tables = rootEl.querySelectorAll('table');
    tables.forEach(applyDayBlankingToTable);
  }

  function applyDayBlankingToMaster() {
    if (!singleContainer || isHidden(singleContainer)) return;
    const table = singleContainer.querySelector('table');
    applyDayBlankingToTable(table);
  }

  function filterSchedules() {
    const subjectText = subjectFilter ? subjectFilter.value.toLowerCase() : '';
    const roomText = roomFilter ? roomFilter.value.toLowerCase() : '';
    const teacherText = teacherFilter ? teacherFilter.value.toLowerCase() : '';

    scheduleRows.forEach((row) => {
      const rowSection = row.getAttribute('data-section') || '';
      const rowSubject = (row.getAttribute('data-subject') || '').toLowerCase();
      const rowRoom = (row.getAttribute('data-room') || '').toLowerCase();
      const rowTeacher = (row.getAttribute('data-teacher') || '').toLowerCase();

      const sectionMatch = currentSectionFilter === 'all' || rowSection === currentSectionFilter;
      const subjectMatch = !subjectText || rowSubject.includes(subjectText);
      const roomMatch = !roomText || rowRoom.includes(roomText);
      const teacherMatch = !teacherText || rowTeacher.includes(teacherText);

      if (sectionMatch && subjectMatch && roomMatch && teacherMatch) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });

    const visibleRows = Array.from(scheduleRows).filter((row) => row.style.display !== 'none');
    const tbody = document.getElementById('schedule-table-body');
    let emptyMessage = tbody ? tbody.querySelector('.empty-message') : null;

    if (tbody) {
      if (visibleRows.length === 0) {
        if (!emptyMessage) {
          emptyMessage = document.createElement('tr');
          emptyMessage.className = 'empty-message';
          emptyMessage.innerHTML = `
            <td colspan="6" class="px-6 py-12 text-center">
              <div class="flex flex-col items-center justify-center">
                <div class="w-16 h-16 flex items-center justify-center bg-gray-100 rounded-full mb-4">
                  <i class="ri-calendar-line text-2xl text-gray-400"></i>
                </div>
                <h3 class="text-lg font-medium text-gray-800 mb-2">No Schedules Found</h3>
                <p class="text-gray-600">Try adjusting your filters to see more results.</p>
              </div>
            </td>
          `;
          tbody.appendChild(emptyMessage);
        }
      } else if (emptyMessage) {
        emptyMessage.remove();
      }
    }

    applyDayBlankingToMaster();
    applyDayBlankingToGenerated(stackContainer);
    applyDayBlankingToGenerated(sectionCardContainer);
  }

  sectionFilterBtns.forEach((btn) => {
    btn.addEventListener('click', function () {
      sectionFilterBtns.forEach((b) => {
        b.classList.remove('bg-primary', 'text-white');
        b.classList.add('bg-gray-100', 'text-gray-700');
      });
      this.classList.remove('bg-gray-100', 'text-gray-700');
      this.classList.add('bg-primary', 'text-white');

      currentSectionFilter = this.getAttribute('data-section');

      Promise.resolve().then(() => {
        filterSchedules();
      });
    });
  });

  if (dayFilterDropdown && dayFilterOptions) {
    dayFilterDropdown.addEventListener('click', function (e) {
      e.stopPropagation();
      dayFilterOptions.classList.toggle('hidden');
    });

    dayFilterOptions.addEventListener('click', function (e) {
      if (e.target.classList.contains('day-filter-option')) {
        const value = e.target.getAttribute('data-value');
        const text = e.target.textContent;
        dayFilterSelected.textContent = text;
        currentDayFilter = value;
        dayFilterOptions.classList.add('hidden');
        filterSchedules();
      }
    });

    document.addEventListener('click', function () {
      dayFilterOptions.classList.add('hidden');
    });
  }

  function setupTextFilters() {
    [subjectFilter, roomFilter, teacherFilter].forEach((filter) => {
      if (filter) filter.addEventListener('input', filterSchedules);
    });
  }

  setupTextFilters();

  filterSchedules();
});
