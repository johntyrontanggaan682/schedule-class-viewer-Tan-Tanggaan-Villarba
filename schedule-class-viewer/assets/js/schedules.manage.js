// Schedule Management Handler (from <script id="schedule-management-handler">)
document.addEventListener('DOMContentLoaded', function() {
  const scheduleModal = document.getElementById('schedule-modal');
  const confirmModal = document.getElementById('confirm-modal');
  const addScheduleBtn = document.getElementById('add-schedule-btn');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  const scheduleForm = document.getElementById('schedule-form');
  const modalTitle = document.getElementById('modal-title');
  const submitText = document.getElementById('submit-text');

  let isEditMode = false;
  let editingElement = null;
  let deletingElement = null;

  // Dropdown functionality
  function setupDropdowns() {
    const dropdowns = [
      { trigger: 'section-dropdown', options: 'section-options', selected: 'section-selected', input: 'section', optionClass: 'section-option' },
      { trigger: 'room-dropdown', options: 'room-options', selected: 'room-selected', input: 'room', optionClass: 'room-option' },
      { trigger: 'teacher-dropdown', options: 'teacher-options', selected: 'teacher-selected', input: 'teacher', optionClass: 'teacher-option' },
      { trigger: 'day-dropdown', options: 'day-options', selected: 'day-selected', input: 'day', optionClass: 'day-option' },
      { trigger: 'time-dropdown', options: 'time-options', selected: 'time-selected', input: 'time', optionClass: 'time-option' }
    ];

    dropdowns.forEach(dropdown => {
      const trigger = document.getElementById(dropdown.trigger);
      const options = document.getElementById(dropdown.options);
      const selected = document.getElementById(dropdown.selected);
      const input = document.getElementById(dropdown.input);

      if (trigger && options && selected && input) {
        trigger.addEventListener('click', function(e) {
          e.stopPropagation();
          document.querySelectorAll('[id$="-options"]').forEach(opt => {
            if (opt !== options) opt.classList.add('hidden');
          });
          options.classList.toggle('hidden');
        });

        options.addEventListener('click', function(e) {
          if (e.target.classList.contains(dropdown.optionClass)) {
            const value = e.target.getAttribute('data-value');
            selected.textContent = value;
            input.value = value;
            options.classList.add('hidden');
          }
        });
      }
    });

    document.addEventListener('click', function() {
      document.querySelectorAll('[id$="-options"]').forEach(opt => {
        opt.classList.add('hidden');
      });
    });
  }

  function openModal(mode = 'add', scheduleData = null) {
    isEditMode = mode === 'edit';
    modalTitle.textContent = isEditMode ? 'Edit Schedule' : 'Add New Schedule';
    submitText.textContent = isEditMode ? 'Update Schedule' : 'Add Schedule';

    if (isEditMode && scheduleData) {
      document.getElementById('subject').value = scheduleData.subject;
      document.getElementById('section-selected').textContent = scheduleData.section;
      document.getElementById('section').value = scheduleData.section;
      document.getElementById('room-selected').textContent = scheduleData.room;
      document.getElementById('room').value = scheduleData.room;
      document.getElementById('teacher-selected').textContent = scheduleData.teacher;
      document.getElementById('teacher').value = scheduleData.teacher;
      document.getElementById('day-selected').textContent = scheduleData.day;
      document.getElementById('day').value = scheduleData.day;
      document.getElementById('time-selected').textContent = scheduleData.time;
      document.getElementById('time').value = scheduleData.time;
    } else {
      scheduleForm.reset();
      document.getElementById('section-selected').textContent = 'Select section';
      document.getElementById('room-selected').textContent = 'Select room';
      document.getElementById('teacher-selected').textContent = 'Select teacher';
      document.getElementById('day-selected').textContent = 'Select day';
      document.getElementById('time-selected').textContent = 'Select time';
    }

    scheduleModal.classList.remove('hidden');
  }

  function closeModal() {
    scheduleModal.classList.add('hidden');
    isEditMode = false;
    editingElement = null;
  }

  function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-button text-white ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => { notification.remove(); }, 3000);
  }

  // Event listeners
  if (addScheduleBtn) addScheduleBtn.addEventListener('click', () => openModal('add'));
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  if (scheduleForm) {
    scheduleForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const formData = new FormData(this);
      const scheduleData = {
        subject: formData.get('subject'),
        section: formData.get('section'),
        room: formData.get('room'),
        teacher: formData.get('teacher'),
        day: formData.get('day'),
        time: formData.get('time')
      };

      if (isEditMode && editingElement) {
        editingElement.querySelector('.font-medium').textContent = scheduleData.subject;
        editingElement.querySelector('.text-gray-600').textContent = `${scheduleData.section} • ${scheduleData.room}`;
        editingElement.querySelector('.text-gray-500').textContent = scheduleData.teacher;
        editingElement.querySelector('.edit-schedule-btn').setAttribute('data-schedule', JSON.stringify(scheduleData));
        showNotification('Schedule updated successfully!');
      } else {
        showNotification('Schedule added successfully!');
      }
      closeModal();
    });
  }

  // Edit and delete button handlers
  document.addEventListener('click', function(e) {
    if (e.target.closest('.edit-schedule-btn')) {
      const btn = e.target.closest('.edit-schedule-btn');
      const scheduleData = JSON.parse(btn.getAttribute('data-schedule'));
      editingElement = btn.closest('.group');
      openModal('edit', scheduleData);
    } else if (e.target.closest('.delete-schedule-btn')) {
      deletingElement = e.target.closest('.group');
      confirmModal.classList.remove('hidden');
    }
  });

  if (confirmCancelBtn) {
    confirmCancelBtn.addEventListener('click', function() {
      confirmModal.classList.add('hidden');
      deletingElement = null;
    });
  }

  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', function() {
      if (deletingElement) {
        deletingElement.remove();
        showNotification('Schedule deleted successfully!');
      }
      confirmModal.classList.add('hidden');
      deletingElement = null;
    });
  }

  setupDropdowns();
});
