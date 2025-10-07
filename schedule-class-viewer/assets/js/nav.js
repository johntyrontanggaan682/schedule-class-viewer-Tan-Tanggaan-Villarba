// Navigation Handler (hash-only interception for SPA on index.html)
document.addEventListener('DOMContentLoaded', function() {
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

  // If we're on the SPA (index.html) and have sections, sync to hash
  function showSectionFromHash() {
    if (!sections || sections.length === 0) return; // not the SPA
    const hash = (window.location.hash || '#home').slice(1);
    showSection(hash);
  }

  window.addEventListener('hashchange', showSectionFromHash);
  showSectionFromHash(); // initial render
});
