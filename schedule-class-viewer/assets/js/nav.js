// Navigation Handler (hash-only interception for SPA on index.html) 
(function () {
  function initNav() {
    try {
      const role = (sessionStorage.getItem('auth_role') || 'guest').toLowerCase();

      /* ---------------------------------------------------------
         NEW: SET PROFILE PHOTO IN DROPDOWN (ALL ROLES)
      --------------------------------------------------------- */
      (function () {
        const photoUrl = sessionStorage.getItem('auth_photo');
        const avatarEl = document.getElementById('acc-avatar');

        if (
          avatarEl &&
          photoUrl &&
          photoUrl !== 'null' &&
          photoUrl !== 'undefined' &&
          String(photoUrl).trim() !== ''
        ) {
          avatarEl.innerHTML =
            '<img src="' + photoUrl + '" class="w-full h-full object-cover" alt="Profile Picture">';
        }
      })();

      /* ---------------------------------------------------------
         NEW: HIDE ID IN PROFILE DROPDOWN IF TEACHER
      --------------------------------------------------------- */
      if (role === "teacher") {
        const idText = document.getElementById('acc-id');
        const idRowContainer = idText ? idText.closest('.flex') : null;

        if (idRowContainer) idRowContainer.classList.add('hidden');
      }

      /* ======================= ADMIN ======================== */
      if (role === 'admin') {
        const wrap     = document.getElementById('profile-wrap');
        const trigger  = document.getElementById('profile-trigger');
        const dropdown = document.getElementById('profile-dropdown');
        const label    = document.getElementById('profile-label');

        if (trigger && label) {
          label.textContent = 'Admin Dashboard';

          const userIcon = trigger.querySelector('i.ri-user-3-line');
          if (userIcon) {
            userIcon.classList.remove('ri-user-3-line');
            userIcon.classList.add('ri-dashboard-2-line');
          }

          const arrowIcon = trigger.querySelector('i.ri-arrow-down-s-line');
          if (arrowIcon) {
            arrowIcon.classList.add('hidden');
          }

          if (dropdown) dropdown.classList.add('hidden');

          const newTrigger = trigger.cloneNode(true);
          newTrigger.id = trigger.id;
          newTrigger.setAttribute('href', 'admin-dashboard.html');

          if (wrap) wrap.replaceChild(newTrigger, trigger);
        }

        const mobileMenuEl = document.getElementById('mobile-menu');
        if (mobileMenuEl) {
          const mobileLinks = mobileMenuEl.querySelectorAll('a.nav-link');
          mobileLinks.forEach(link => {
            const textSpan = link.querySelector('span');
            if (!textSpan) return;

            if (textSpan.textContent.trim().toLowerCase() === 'profile') {
              textSpan.textContent = 'Admin Dashboard';
              link.setAttribute('href', 'admin-dashboard.html');

              const mobileIcon = link.querySelector('i');
              if (mobileIcon) {
                mobileIcon.className = mobileIcon.className
                  .split(' ')
                  .filter(cls => !/^ri-/.test(cls))
                  .join(' ');
                mobileIcon.classList.add('ri-dashboard-2-line');
              }
            }
          });
        }

        (function hideFooterProfileQuicklinks() {
          const roots = [
            document.getElementById('footer-quicklinks'),
            document.getElementById('footer'),
            ...document.querySelectorAll('footer, .site-footer, .app-footer')
          ].filter(Boolean);

          const hide = (el) => {
            if (!el) return;
            if (el.classList) el.classList.add('hidden');
            else el.style.display = 'none';
          };

          roots.forEach(root => {
            ['footer-profile', 'footer-profile-link', 'profile-quicklink'].forEach(id => {
              const elByIdInRoot = root.querySelector(`#${id}`);
              const elByIdGlobal = document.getElementById(id);
              hide(elByIdInRoot || elByIdGlobal);
            });

            root.querySelectorAll('.footer-quicklink, .quicklink, a, button, li').forEach(node => {
              const target = node.closest('a, button') || node;
              const text = (target.textContent || '').trim().toLowerCase();
              if (text === 'profile' || text === 'view profile' || text === 'my profile') {
                hide(node.tagName === 'LI' ? node : (target.closest('li') || target));
              }
            });
          });
        })();
      }

      /* ---------------------------------------------------------
         ⭐⭐⭐ NEW REQUESTED FEATURE ⭐⭐⭐
         Change schedule page title for teacher/admin ONLY
      --------------------------------------------------------- */
      (function () {
        const isSchedulePage = window.location.pathname.endsWith("schedules.html");
        if (!isSchedulePage) return;

        if (role === "teacher" || role === "admin") {
          const title = document.getElementById("sched-title");
          const subtitle = document.getElementById("sched-subtitle");

          if (title) title.textContent = "Master Schedule";
          if (subtitle)
            subtitle.textContent = "Complete overview of all classes, rooms, and faculty assignments.";
        }
      })();

    } catch (e) {
      console.error('Admin header nav error:', e);
    }
  (function () {
    const logo = document.querySelector('nav img[alt="SLSU Lucena Logo"]');
    if (!logo) return;

    logo.style.cursor = 'pointer';
    logo.addEventListener('click', function () {
      window.location.reload();
    });
  })();

    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    function showSection(targetId) {
      if (!sections || sections.length === 0) return;
      sections.forEach(section => section.classList.add('hidden'));
      const targetSection = document.getElementById(targetId);
      if (targetSection) targetSection.classList.remove('hidden');

      navLinks.forEach(link => link.classList.remove('bg-white/20'));
      const activeLink = document.querySelector(`.nav-link[href="#${targetId}"]`);
      if (activeLink) activeLink.classList.add('bg-white/20');
    }

    navLinks.forEach(link => {
      link.addEventListener('click', function(e) {
        const href = this.getAttribute('href') || '';
        const isHashLink = href.startsWith('#');

        if (isHashLink) {
          e.preventDefault();
          const targetId = href.slice(1);

          if (window.location.hash !== `#${targetId}`) {
            window.location.hash = targetId;
          } else {
            showSection(targetId);
          }
        }

        if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
          mobileMenu.classList.add('hidden');
        }
      });
    });

    if (mobileMenuBtn && mobileMenu) {
      mobileMenuBtn.addEventListener('click', function() {
        mobileMenu.classList.toggle('hidden');
      });
    }

    function showSectionFromHash() {
      if (!sections || sections.length === 0) return;
      const hash = (window.location.hash || '#home').slice(1);
      showSection(hash);
    }

    window.addEventListener('hashchange', showSectionFromHash);
    showSectionFromHash();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNav);
  } else {
    initNav();
  }
})();
