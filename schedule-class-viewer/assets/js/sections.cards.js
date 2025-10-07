// Section Cards Handler (from <script id="section-cards-handler">)
document.addEventListener('DOMContentLoaded', function() {
  const sectionCards = document.querySelectorAll('.section-card');
  const sectionDetailModal = document.getElementById('section-detail-modal');
  const closeSectionDetailBtn = document.getElementById('close-section-detail-btn');
  const sectionDetailTitle = document.getElementById('section-detail-title');
  const sectionDetailSubtitle = document.getElementById('section-detail-subtitle');
  const sectionStudents = document.getElementById('section-students');
  const sectionSchedule = document.getElementById('section-schedule');
  const addSectionScheduleBtn = document.getElementById('add-section-schedule-btn');
  const addSectionStudentBtn = document.getElementById('add-section-student-btn');

  let currentSection = null;

  const sectionData = {
    'BIT 3A': {
      students: [
        { name: 'Michael Chen', id: '2023-001235', status: 'Active', type: 'Regular' },
        { name: 'Sarah Johnson', id: '2023-001240', status: 'Active', type: 'Regular' },
        { name: 'David Kim', id: '2023-001241', status: 'Active', type: 'Irregular' },
        { name: 'Lisa Wong', id: '2023-001242', status: 'Active', type: 'Regular' },
        { name: 'James Rodriguez', id: '2023-001243', status: 'Active', type: 'Irregular' }
      ],
      schedules: [
        { subject: 'Web Development', time: '7:00 - 8:00 AM', day: 'Tuesday', room: 'Lab 201', teacher: 'Prof. John Cruz' },
        { subject: 'Mobile Programming', time: '9:00 - 10:00 AM', day: 'Monday', room: 'Lab 202', teacher: 'Prof. John Cruz' },
        { subject: 'Software Engineering', time: '2:00 - 3:00 PM', day: 'Wednesday', room: 'Room 305', teacher: 'Prof. John Cruz' }
      ]
    },
    'BIT 3B': {
      students: [
        { name: 'Emma Thompson', id: '2023-001238', status: 'Active', type: 'Regular' },
        { name: 'Carlos Martinez', id: '2023-001244', status: 'Active', type: 'Irregular' },
        { name: 'Anna Garcia', id: '2023-001245', status: 'Active', type: 'Regular' },
        { name: 'Robert Wilson', id: '2023-001246', status: 'Active', type: 'Regular' }
      ],
      schedules: [
        { subject: 'Industrial Automation', time: '8:00 - 9:00 AM', day: 'Friday', room: 'Workshop A', teacher: 'Engr. Carlos Dela Cruz' },
        { subject: 'Manufacturing Processes', time: '10:00 - 11:00 AM', day: 'Tuesday', room: 'Workshop B', teacher: 'Engr. Carlos Dela Cruz' },
        { subject: 'Quality Control', time: '1:00 - 2:00 PM', day: 'Thursday', room: 'Lab 301', teacher: 'Engr. Carlos Dela Cruz' }
      ]
    },
    'BSIT 2A': {
      students: [
        { name: 'Alexandra Johnson', id: '2023-001234', status: 'Active', type: 'Regular' },
        { name: 'Mark Davis', id: '2023-001247', status: 'Active', type: 'Regular' },
        { name: 'Jennifer Lee', id: '2023-001248', status: 'Active', type: 'Irregular' },
        { name: 'Ryan Miller', id: '2023-001249', status: 'Active', type: 'Regular' }
      ],
      schedules: [
        { subject: 'Database Systems', time: '7:00 - 8:00 AM', day: 'Monday', room: 'Room 301', teacher: 'Prof. Maria Santos' },
        { subject: 'System Analysis', time: '11:00 - 12:00 PM', day: 'Wednesday', room: 'Room 302', teacher: 'Prof. Maria Santos' },
        { subject: 'IT Project Management', time: '3:00 - 4:00 PM', day: 'Friday', room: 'Room 303', teacher: 'Prof. Maria Santos' }
      ]
    },
    'BSIT 2B': {
      students: [
        { name: 'David Rodriguez', id: '2023-001237', status: 'Active', type: 'Regular' },
        { name: 'Maria Santos', id: '2023-001250', status: 'Active', type: 'Irregular' },
        { name: 'Kevin Brown', id: '2023-001251', status: 'Active', type: 'Regular' }
      ],
      schedules: [
        { subject: 'Network Security', time: '8:00 - 9:00 AM', day: 'Monday', room: 'Room 302', teacher: 'Prof. Robert Garcia' },
        { subject: 'Cybersecurity', time: '2:00 - 3:00 PM', day: 'Tuesday', room: 'Lab 304', teacher: 'Prof. Robert Garcia' },
        { subject: 'Network Administration', time: '4:00 - 5:00 PM', day: 'Thursday', room: 'Lab 305', teacher: 'Prof. Robert Garcia' }
      ]
    },
    'BSCS 1A': {
      students: [
        { name: 'Sarah Williams', id: '2023-001236', status: 'Active', type: 'Regular' },
        { name: 'Thomas Anderson', id: '2023-001252', status: 'Active', type: 'Regular' },
        { name: 'Nicole Taylor', id: '2023-001253', status: 'Active', type: 'Irregular' }
      ],
      schedules: [
        { subject: 'Programming Logic', time: '7:00 - 8:00 AM', day: 'Thursday', room: 'Room 205', teacher: 'Prof. Anna Reyes' },
        { subject: 'Algorithm Design', time: '9:00 - 10:00 AM', day: 'Tuesday', room: 'Lab 206', teacher: 'Prof. Anna Reyes' },
        { subject: 'Computer Mathematics', time: '1:00 - 2:00 PM', day: 'Monday', room: 'Room 207', teacher: 'Prof. Anna Reyes' }
      ]
    },
    'BSCS 1B': {
      students: [
        { name: 'James Martinez', id: '2023-001239', status: 'Active', type: 'Irregular' },
        { name: 'Ashley Wilson', id: '2023-001254', status: 'Active', type: 'Regular' },
        { name: 'Christopher Moore', id: '2023-001255', status: 'Active', type: 'Regular' }
      ],
      schedules: [
        { subject: 'Data Structures', time: '8:00 - 9:00 AM', day: 'Wednesday', room: 'Lab 203', teacher: 'Prof. Lisa Mendoza' },
        { subject: 'Object-Oriented Programming', time: '10:00 - 11:00 AM', day: 'Friday', room: 'Lab 204', teacher: 'Prof. Lisa Mendoza' },
        { subject: 'Software Development', time: '3:00 - 4:00 PM', day: 'Tuesday', room: 'Lab 205', teacher: 'Prof. Lisa Mendoza' }
      ]
    }
  };

  function openSectionDetail(sectionName) {
    currentSection = sectionName;
    const data = sectionData[sectionName];
    if (!data) return;

    sectionDetailTitle.textContent = `${sectionName} - Section Details`;
    sectionDetailSubtitle.textContent = `${data.students.length} Students • ${data.schedules.length} Scheduled Classes`;

    // Populate students
    sectionStudents.innerHTML = '';
    data.students.forEach(student => {
      const studentElement = document.createElement('div');
      studentElement.className = 'bg-gray-50 rounded p-4 flex items-center justify-between';
      const typeColor = student.type === 'Regular' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700';
      studentElement.innerHTML = `
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <i class="ri-user-line text-primary"></i>
          </div>
          <div>
            <h5 class="font-medium text-gray-800">${student.name}</h5>
            <p class="text-sm text-gray-600">ID: ${student.id}</p>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <span class="text-xs px-2 py-1 ${typeColor} rounded">${student.type}</span>
          <span class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">${student.status}</span>
        </div>
      `;
      sectionStudents.appendChild(studentElement);
    });

    // Populate schedules
    sectionSchedule.innerHTML = '';
    data.schedules.forEach((schedule, index) => {
      const scheduleElement = document.createElement('div');
      scheduleElement.className = 'bg-primary/5 rounded p-4 group relative';
      scheduleElement.innerHTML = `
        <div class="flex items-start justify-between">
          <div>
            <h5 class="font-medium text-primary mb-1">${schedule.subject}</h5>
            <p class="text-sm text-gray-600 mb-1">${schedule.day} • ${schedule.time}</p>
            <p class="text-sm text-gray-600">${schedule.room} • ${schedule.teacher}</p>
          </div>
          <div class="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
            <button class="edit-section-schedule-btn w-8 h-8 flex items-center justify-center bg-blue-500 text-white rounded hover:bg-blue-600" data-index="${index}">
              <i class="ri-edit-line text-sm"></i>
            </button>
            <button class="delete-section-schedule-btn w-8 h-8 flex items-center justify-center bg-red-500 text-white rounded hover:bg-red-600" data-index="${index}">
              <i class="ri-delete-bin-line text-sm"></i>
            </button>
          </div>
        </div>
      `;
      sectionSchedule.appendChild(scheduleElement);
    });

    sectionDetailModal.classList.remove('hidden');
  }

  function closeSectionDetail() {
    sectionDetailModal.classList.add('hidden');
    currentSection = null;
  }

  sectionCards.forEach(card => {
    card.addEventListener('click', function() {
      const sectionName = this.getAttribute('data-section');
      openSectionDetail(sectionName);
    });
  });

  if (closeSectionDetailBtn) {
    closeSectionDetailBtn.addEventListener('click', closeSectionDetail);
  }

  if (addSectionScheduleBtn) {
    addSectionScheduleBtn.addEventListener('click', function() {
      if (currentSection) {
        document.getElementById('section-selected').textContent = currentSection;
        document.getElementById('section').value = currentSection;
      }
      const addScheduleBtn = document.getElementById('add-schedule-btn');
      if (addScheduleBtn) {
        addScheduleBtn.click();
      }
      closeSectionDetail();
    });
  }

  if (addSectionStudentBtn) {
    addSectionStudentBtn.addEventListener('click', function() {
      const studentModal = document.getElementById('student-modal');
      if (studentModal) {
        studentModal.classList.remove('hidden');
      }
    });
  }

  // Handle edit and delete for section schedules
  document.addEventListener('click', function(e) {
    if (e.target.closest('.edit-section-schedule-btn')) {
      const btn = e.target.closest('.edit-section-schedule-btn');
      const index = parseInt(btn.getAttribute('data-index'));
      const schedule = sectionData[currentSection].schedules[index];
      const scheduleData = {
        subject: schedule.subject,
        section: currentSection,
        room: schedule.room,
        teacher: schedule.teacher,
        day: schedule.day,
        time: schedule.time
      };
      document.getElementById('section-selected').textContent = currentSection;
      document.getElementById('section').value = currentSection;
      const editBtn = document.querySelector('.edit-schedule-btn');
      if (editBtn) {
        editBtn.setAttribute('data-schedule', JSON.stringify(scheduleData));
        editBtn.click();
      }
      closeSectionDetail();
    } else if (e.target.closest('.delete-section-schedule-btn')) {
      const btn = e.target.closest('.delete-section-schedule-btn');
      const index = parseInt(btn.getAttribute('data-index'));
      if (confirm('Are you sure you want to delete this schedule?')) {
        sectionData[currentSection].schedules.splice(index, 1);
        openSectionDetail(currentSection); // Refresh the view
      }
    }
  });
});
