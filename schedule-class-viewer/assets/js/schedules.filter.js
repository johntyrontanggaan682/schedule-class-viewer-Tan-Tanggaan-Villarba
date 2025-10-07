// Schedule Filtering Handler (from <script id="schedule-filtering-handler">)
document.addEventListener('DOMContentLoaded', function() {
  const sectionFilterBtns = document.querySelectorAll('.section-filter-btn');
  const subjectFilter = document.getElementById('subject-filter');
  const roomFilter = document.getElementById('room-filter');
  const teacherFilter = document.getElementById('teacher-filter');
  const dayFilterDropdown = document.getElementById('day-filter-dropdown');
  const dayFilterSelected = document.getElementById('day-filter-selected');
  const dayFilterOptions = document.getElementById('day-filter-options');
  const scheduleRows = document.querySelectorAll('.schedule-row');

  let currentSectionFilter = 'all';
  let currentDayFilter = 'all';

  sectionFilterBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      sectionFilterBtns.forEach(b => {
        b.classList.remove('bg-primary', 'text-white');
        b.classList.add('bg-gray-100', 'text-gray-700');
      });
      this.classList.remove('bg-gray-100', 'text-gray-700');
      this.classList.add('bg-primary', 'text-white');
      currentSectionFilter = this.getAttribute('data-section');
      filterSchedules();
    });
  });

  if (dayFilterDropdown && dayFilterOptions) {
    dayFilterDropdown.addEventListener('click', function(e) {
      e.stopPropagation();
      dayFilterOptions.classList.toggle('hidden');
    });

    dayFilterOptions.addEventListener('click', function(e) {
      if (e.target.classList.contains('day-filter-option')) {
        const value = e.target.getAttribute('data-value');
        const text = e.target.textContent;
        dayFilterSelected.textContent = text;
        currentDayFilter = value;
        dayFilterOptions.classList.add('hidden');
        filterSchedules();
      }
    });

    document.addEventListener('click', function() {
      dayFilterOptions.classList.add('hidden');
    });
  }

  function setupTextFilters() {
    [subjectFilter, roomFilter, teacherFilter].forEach(filter => {
      if (filter) {
        filter.addEventListener('input', filterSchedules);
      }
    });
  }

  function filterSchedules() {
    const subjectText = subjectFilter ? subjectFilter.value.toLowerCase() : '';
    const roomText = roomFilter ? roomFilter.value.toLowerCase() : '';
    const teacherText = teacherFilter ? teacherFilter.value.toLowerCase() : '';

    scheduleRows.forEach(row => {
      const rowSection = row.getAttribute('data-section');
      const rowSubject = row.getAttribute('data-subject');
      const rowRoom = row.getAttribute('data-room');
      const rowTeacher = row.getAttribute('data-teacher');
      const rowDay = row.getAttribute('data-day');

      const sectionMatch = currentSectionFilter === 'all' || rowSection === currentSectionFilter;
      const dayMatch = currentDayFilter === 'all' || rowDay === currentDayFilter;
      const subjectMatch = !subjectText || (rowSubject && rowSubject.toLowerCase().includes(subjectText));
      const roomMatch = !roomText || (rowRoom && rowRoom.toLowerCase().includes(roomText));
      const teacherMatch = !teacherText || (rowTeacher && rowTeacher.toLowerCase().includes(teacherText));

      if (sectionMatch && dayMatch && subjectMatch && roomMatch && teacherMatch) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });

    const visibleRows = Array.from(scheduleRows).filter(row => row.style.display !== 'none');
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
      } else {
        if (emptyMessage) {
          emptyMessage.remove();
        }
      }
    }
  }

  setupTextFilters();
});
