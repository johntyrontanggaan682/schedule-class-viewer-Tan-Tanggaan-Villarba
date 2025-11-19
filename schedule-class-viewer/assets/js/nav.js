// Navigation Handler (hash-only interception for SPA on index.html)
(function () {
  function initNav() {
    try {
      const role = (sessionStorage.getItem('auth_role') || 'guest').toLowerCase();

      if (role === 'admin') {
        const wrap     = document.getElementById('profile-wrap');
        const trigger  = document.getElementById('profile-trigger');
        const dropdown = document.getElementById('profile-dropdown');
        const label    = document.getElementById('profile-label');

        if (trigger && label) {
          // change label to "Admin Dashboard"
          label.textContent = 'Admin Dashboard';

          // change icon to match admin dashboard (dashboard icon)
          const userIcon = trigger.querySelector('i.ri-user-3-line');
          if (userIcon) {
            userIcon.classList.remove('ri-user-3-line');
            userIcon.classList.add('ri-dashboard-2-line');
          }

          // hide the little arrow icon
          const arrowIcon = trigger.querySelector('i.ri-arrow-down-s-line');
          if (arrowIcon) {
            arrowIcon.classList.add('hidden');
          }

          if (dropdown) {
            dropdown.classList.add('hidden');
          }

          const newTrigger = trigger.cloneNode(true);
          newTrigger.id = trigger.id;
          newTrigger.setAttribute('href', 'admin-dashboard.html');

          if (wrap) {
            wrap.replaceChild(newTrigger, trigger);
          }
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
                // strip existing ri-* icon and replace with dashboard icon
                mobileIcon.className = mobileIcon.className
                  .split(' ')
                  .filter(cls => !/^ri-/.test(cls))
                  .join(' ');
                mobileIcon.classList.add('ri-dashboard-2-line');
              }
            }
          });
        }
      }
    } catch (e) {
      console.error('Admin header nav error:', e);
    }

    // ===== Navigation Handler (original behaviour) =====
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    function showSection(targetId) {
      if (!sections || sections.length === 0) return; // non-SPA pages: nothing to do
      sections.forEach(section => section.classList.add('hidden'));
      const targetSection = document.getElementById(targetId);
      if (targetSection) targetSection.classList.remove('hidden');

      // highlight active hash link only
      navLinks.forEach(link => link.classList.remove('bg-white/20'));
      const activeLink = document.querySelector(`.nav-link[href="#${targetId}"]`);
      if (activeLink) activeLink.classList.add('bg-white/20');
    }

    // Handle clicks: only prevent default for hash links
    navLinks.forEach(link => {
      link.addEventListener('click', function(e) {
        const href = this.getAttribute('href') || '';
        const isHashLink = href.startsWith('#');

        if (isHashLink) {
          e.preventDefault();
          const targetId = href.slice(1);
          // update URL hash so back/forward works
          if (window.location.hash !== `#${targetId}`) {
            window.location.hash = targetId;
          } else {
            showSection(targetId);
          }
        }

        // close mobile menu on any nav click
        if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
          mobileMenu.classList.add('hidden');
        }
      });
    });

    // Toggle mobile menu
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
