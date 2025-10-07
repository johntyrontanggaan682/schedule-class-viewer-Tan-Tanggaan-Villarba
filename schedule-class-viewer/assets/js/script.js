document.addEventListener('DOMContentLoaded', function () {
  ['home', 'about-merged'].forEach(function(id){
    var el = document.getElementById(id);
    if(!el) return;
    el.classList.remove('fade-in');
    void el.offsetWidth;
    el.classList.add('fade-in');
  });
  document.querySelectorAll('a.nav-link').forEach(function(a){
    a.addEventListener('click', function(){
      var href = a.getAttribute('href') || '';
      if(href.startsWith('#')) return;
      document.body.classList.add('page-fade-out');
    });
  });
  var btn = document.getElementById('mobile-menu-btn');
  var menu = document.getElementById('mobile-menu');
  if(btn && menu){
    btn.addEventListener('click', function(){ menu.classList.toggle('hidden'); });
  }
});