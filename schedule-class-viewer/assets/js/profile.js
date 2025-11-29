document.getElementById('mobile-menu-btn')?.addEventListener('click',()=>document.getElementById('mobile-menu')?.classList.toggle('hidden'));
    const params = new URLSearchParams(location.search);
    const name  = sessionStorage.getItem('auth_name')  || params.get('name')  || '';
    const role  = (sessionStorage.getItem('auth_role') || params.get('role') || '').toLowerCase();
    const email = sessionStorage.getItem('auth_email') || params.get('email') || '';
    const uid   = sessionStorage.getItem('auth_id')    || params.get('id')    || '';
    function cap(s){ return s ? s.charAt(0).toUpperCase()+s.slice(1) : ''; }
    function initials(s){ if(!s) return ''; var p = s.trim().split(/\s+/).slice(0,2); return p.map(function(x){return x[0]?x[0].toUpperCase():''}).join(''); }
    const label = document.getElementById('profile-label');
    const avatar = document.getElementById('acc-avatar');
    const nEl = document.getElementById('acc-name');
    const rEl = document.getElementById('acc-role');
    const eEl = document.getElementById('acc-email');
    const iEl = document.getElementById('acc-id');
    const cta = document.getElementById('acc-cta');
    if(label) label.textContent = name ? name.split(' ')[0] : 'Profile';
    if(nEl) nEl.textContent = name || 'Guest User';
    if(rEl) rEl.textContent = role ? cap(role) : 'Guest';
    if(eEl) eEl.textContent = email || 'No email on file';
    if(iEl) iEl.textContent = uid ? ('ID: '+uid) : 'ID: —';
    if(cta){ cta.href = 'profile.html'; cta.textContent = 'View profile'; }
    function renderAvatar(){
      if(!avatar) return;
      var photo = sessionStorage.getItem('auth_photo') || '';
      avatar.innerHTML = '';
      if (photo) {
        var img = document.createElement('img');
        img.src = photo + (photo.includes('?') ? '&' : '?') + 'v=' + Date.now();
        img.alt = 'Profile';
        img.className = 'w-full h-full object-cover';
        avatar.appendChild(img);
      } else {
        avatar.textContent = initials(name) || 'GU';
      }
    }
    renderAvatar();
    window.addEventListener('storage', function(e){ if (e.key === 'auth_photo') renderAvatar(); });
    document.addEventListener('visibilitychange', function(){ if (!document.hidden) renderAvatar(); });
    window.addEventListener('focus', renderAvatar);
    const wrap = document.getElementById('profile-wrap');
    const btn = document.getElementById('profile-trigger');
    const dd = document.getElementById('profile-dropdown');
    function hide(){ if(dd) dd.classList.add('hidden'); }
    function toggle(e){
      e.preventDefault();
      e.stopPropagation();
      dd.classList.toggle('hidden');
    }
    if (btn && wrap && dd) {
      btn.addEventListener('click', toggle);
      document.addEventListener('click', function(e){ if(!wrap.contains(e.target)) hide(); });
      document.addEventListener('keydown', function(e){ if(e.key==='Escape') hide(); });
    }
    const LOGIN_PAGE = 'index.html';
    var signoutBtn = document.getElementById('signout-btn');
    var modal = document.getElementById('signout-modal');
    var cancelBtn = document.getElementById('cancel-signout');
    var yesBtn = document.getElementById('confirm-signout');
    function openModal(){ modal.classList.remove('hidden'); modal.classList.add('flex'); }
    function closeModal(){ modal.classList.add('hidden'); modal.classList.remove('flex'); }
    if (signoutBtn) signoutBtn.addEventListener('click', openModal);
    if (cancelBtn)  cancelBtn.addEventListener('click', closeModal);
    if (yesBtn) yesBtn.addEventListener('click', function(){
      sessionStorage.clear();
      location.href = LOGIN_PAGE;
    });
    if (modal) modal.addEventListener('click', function(e){ if(e.target === modal) closeModal(); });