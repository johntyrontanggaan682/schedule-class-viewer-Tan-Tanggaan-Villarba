// Student Management Handler (from <script id="student-management-handler">)
document.addEventListener('DOMContentLoaded', function() {
  const studentModal = document.getElementById('student-modal');
  const closeStudentModalBtn = document.getElementById('close-student-modal-btn');
  const cancelStudentBtn = document.getElementById('cancel-student-btn');
  const studentForm = document.getElementById('student-form');
  const irregularSubjectsSection = document.getElementById('irregular-subjects-section');
  const regularTypeRadio = document.getElementById('regular-type');
  const irregularTypeRadio = document.getElementById('irregular-type');

  function closeStudentModal() {
    studentModal.classList.add('hidden');
    studentForm.reset();

    // Reset radio buttons
    document.querySelectorAll('.student-type-indicator').forEach(indicator => {
      indicator.classList.remove('scale-100');
      indicator.classList.add('scale-0');
    });
    document.querySelectorAll('.student-type-radio').forEach(radio => {
      radio.classList.remove('border-primary', 'bg-primary/10');
      radio.classList.add('border-gray-300');
    });

    // Reset checkboxes
    document.querySelectorAll('.irregular-checkbox-indicator').forEach(indicator => {
      indicator.classList.remove('scale-100');
      indicator.classList.add('scale-0');
    });
    document.querySelectorAll('.irregular-checkbox').forEach(checkbox => {
      checkbox.classList.remove('border-primary', 'bg-primary/10', 'border-secondary', 'bg-secondary/10');
      checkbox.classList.add('border-gray-300');
    });

    // Hide irregular subjects section
    if (irregularSubjectsSection) {
      irregularSubjectsSection.classList.add('hidden');
    }
  }

  function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-button text-white ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => { notification.remove(); }, 3000);
  }

  // Radio button functionality
  document.querySelectorAll('input[name="student-type"]').forEach(radio => {
    radio.addEventListener('change', function() {
      // Reset all radio buttons
      document.querySelectorAll('.student-type-indicator').forEach(indicator => {
        indicator.classList.remove('scale-100');
        indicator.classList.add('scale-0');
      });
      document.querySelectorAll('.student-type-radio').forEach(radioDiv => {
        radioDiv.classList.remove('border-primary', 'bg-primary/10');
        radioDiv.classList.add('border-gray-300');
      });

      // Activate selected radio button
      if (this.checked) {
        const indicator = this.parentElement.querySelector('.student-type-indicator');
        const radioDiv = this.parentElement.querySelector('.student-type-radio');
        indicator.classList.remove('scale-0');
        indicator.classList.add('scale-100');
        radioDiv.classList.remove('border-gray-300');
        radioDiv.classList.add('border-primary', 'bg-primary/10');

        // Show/hide irregular subjects section
        if (irregularSubjectsSection) {
          if (this.value === 'Irregular') {
            irregularSubjectsSection.classList.remove('hidden');
          } else {
            irregularSubjectsSection.classList.add('hidden');
          }
        }
      }
    });
  });

  // Checkbox functionality for irregular subjects
  document.querySelectorAll('.irregular-subject-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      const indicator = this.parentElement.querySelector('.irregular-checkbox-indicator');
      const checkboxDiv = this.parentElement.querySelector('.irregular-checkbox');
      const isSelected = this.checked;
      const checkboxLabel = this.closest('label');
      const isSecondarySubject = this.value.includes('BSIT');

      if (isSelected) {
        indicator.classList.remove('scale-0');
        indicator.classList.add('scale-100');
        checkboxDiv.classList.remove('border-gray-300');
        if (isSecondarySubject) {
          checkboxDiv.classList.add('border-secondary', 'bg-secondary/10');
          checkboxLabel.classList.add('border-secondary');
        } else {
          checkboxDiv.classList.add('border-primary', 'bg-primary/10');
          checkboxLabel.classList.add('border-primary');
        }
      } else {
        indicator.classList.remove('scale-100');
        indicator.classList.add('scale-0');
        checkboxDiv.classList.remove('border-primary', 'bg-primary/10', 'border-secondary', 'bg-secondary/10');
        checkboxDiv.classList.add('border-gray-300');
        checkboxLabel.classList.remove('border-primary', 'border-secondary');
      }
    });
  });

  if (closeStudentModalBtn) {
    closeStudentModalBtn.addEventListener('click', closeStudentModal);
  }
  if (cancelStudentBtn) {
    cancelStudentBtn.addEventListener('click', closeStudentModal);
  }

  if (studentForm) {
    studentForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const formData = new FormData(this);
      const selectedSubjects = formData.getAll('irregular-subjects');
      const studentData = {
        name: formData.get('student-name'),
        id: formData.get('student-id'),
        type: formData.get('student-type'),
        status: 'Active',
        subjects: selectedSubjects
      };

      // Validation for irregular students
      if (studentData.type === 'Irregular' && selectedSubjects.length === 0) {
        showNotification('Please select at least one subject for irregular student.', 'error');
        return;
      }

      // Get current section data
      const sectionDetailTitle = document.getElementById('section-detail-title');
      if (sectionDetailTitle) {
        const sectionName = sectionDetailTitle.textContent.split(' - ')[0];

        // Update student count in section card
        const sectionCards = document.querySelector(`[data-section="${sectionName}"]`);
        if (sectionCards) {
          const studentCountSpan = sectionCards.querySelector('.text-sm.text-gray-500 span');
          if (studentCountSpan) {
            const currentCount = parseInt(studentCountSpan.textContent.split(' ')[0]);
            studentCountSpan.textContent = `${currentCount + 1} Students`;
          }
        }

        // Add to the students list in modal if it's open
        const sectionStudents = document.getElementById('section-students');
        if (sectionStudents) {
          const studentElement = document.createElement('div');
          studentElement.className = 'bg-gray-50 rounded p-4';
          const typeColor = studentData.type === 'Regular' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700';
          let subjectsHtml = '';
          if (studentData.type === 'Irregular' && selectedSubjects.length > 0) {
            subjectsHtml = `
              <div class="mt-2">
                <p class="text-xs text-gray-500 mb-1">Selected Subjects:</p>
                <div class="flex flex-wrap gap-1">
                  ${selectedSubjects.slice(0, 3).map(subject => {
                    const subjectName = subject.split(' - ')[0];
                    return `<span class="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded">${subjectName}</span>`;
                  }).join('')}
                  ${selectedSubjects.length > 3 ? `<span class="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded">+${selectedSubjects.length - 3} more</span>` : ''}
                </div>
              </div>
            `;
          }
          studentElement.innerHTML = `
            <div class="flex items-start justify-between">
              <div class="flex items-start space-x-3">
                <div class="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <i class="ri-user-line text-primary"></i>
                </div>
                <div class="flex-1">
                  <h5 class="font-medium text-gray-800">${studentData.name}</h5>
                  <p class="text-sm text-gray-600">ID: ${studentData.id}</p>
                  ${subjectsHtml}
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <span class="text-xs px-2 py-1 ${typeColor} rounded">${studentData.type}</span>
                <span class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">${studentData.status}</span>
              </div>
            </div>
          `;
          sectionStudents.appendChild(studentElement);

          // Update subtitle counts
          const sectionDetailSubtitle = document.getElementById('section-detail-subtitle');
          if (sectionDetailSubtitle) {
            const currentText = sectionDetailSubtitle.textContent;
            const parts = currentText.split(' • ');
            const currentStudentCount = parseInt(parts[0].split(' ')[0]);
            parts[0] = `${currentStudentCount + 1} Students`;
            sectionDetailSubtitle.textContent = parts.join(' • ');
          }
        }
      }

      showNotification('Student added successfully!');
      closeStudentModal();
    });
  }
});
