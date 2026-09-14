'use strict';

(function () {
  const root = document;

  // Mobile navigation: app.js also contains a legacy toggle listener.
  // Use one capture-phase handler here so the two handlers cannot toggle each other back off.
  const menu = root.getElementById('navToggle');
  const mobile = root.getElementById('mobileNav');
  if (menu && mobile) {
    const setMenuState = (open) => {
      mobile.classList.toggle('open', open);
      menu.classList.toggle('is-open', open);
      menu.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.classList.toggle('nav-locked', open && window.matchMedia('(max-width: 820px)').matches);
    };

    setMenuState(false);

    menu.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      setMenuState(!mobile.classList.contains('open'));
    }, true);

    mobile.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => setMenuState(false));
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && mobile.classList.contains('open')) {
        setMenuState(false);
        menu.focus();
      }
    });

    document.addEventListener('click', (event) => {
      if (!mobile.classList.contains('open')) return;
      if (!mobile.contains(event.target) && !menu.contains(event.target)) setMenuState(false);
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 820) setMenuState(false);
    }, { passive: true });
  }

  // Primary service-family tabs and nested service tabs.
  const familyTabs = [...root.querySelectorAll('[data-family-tab]')];
  const familyPanels = [...root.querySelectorAll('[data-family-panel]')];

  function activateFamily(name) {
    familyTabs.forEach((tab) => {
      const active = tab.dataset.familyTab === name;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    familyPanels.forEach((panel) => {
      panel.hidden = panel.dataset.familyPanel !== name;
    });
  }

  familyTabs.forEach((tab) => {
    tab.addEventListener('click', () => activateFamily(tab.dataset.familyTab));
  });

  const serviceGroups = [...root.querySelectorAll('[data-service-group]')];
  serviceGroups.forEach((group) => {
    const tabs = [...group.querySelectorAll('[data-service-tab]')];
    const panels = [...group.querySelectorAll('[data-service-panel]')];
    const activateService = (name) => {
      tabs.forEach((tab) => {
        const active = tab.dataset.serviceTab === name;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', String(active));
      });
      panels.forEach((panel) => {
        panel.hidden = panel.dataset.servicePanel !== name;
      });
    };
    tabs.forEach((tab) => tab.addEventListener('click', () => activateService(tab.dataset.serviceTab)));
  });

  // Reveal animation for new content. The original quote/form submission logic remains in app.js unchanged.
  const observer = new IntersectionObserver(
    (entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('on');
        observer.unobserve(entry.target);
      }
    }),
    { threshold: 0.04, rootMargin: '0px 0px -40px 0px' }
  );
  root.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

  // Update header treatment while scrolling.
  const navbar = root.getElementById('navbar');
  if (navbar) window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', window.scrollY > 20), { passive: true });

  // Close the acknowledgement strip.
  const ack = root.getElementById('ack-close');
  if (ack) ack.addEventListener('click', () => root.getElementById('ack')?.remove());
})();


(function(){
  'use strict';
  const root=document;
  // Gallery lightbox for real project images.
  const lightbox=root.getElementById('galleryLightbox');
  const lightboxImg=root.getElementById('lightboxImage');
  const lightboxCaption=root.getElementById('lightboxCaption');
  const close=root.getElementById('lightboxClose');
  if(lightbox && lightboxImg){
    root.querySelectorAll('[data-gallery-image]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        lightboxImg.src=btn.dataset.galleryImage;
        lightboxImg.alt=btn.dataset.galleryAlt||'';
        if(lightboxCaption) lightboxCaption.textContent=btn.dataset.galleryCaption||'';
        lightbox.removeAttribute('hidden');
        document.body.classList.add('locked');
        close?.focus();
      });
    });
    const hide=()=>{lightbox.setAttribute('hidden','');document.body.classList.remove('locked');};
    close?.addEventListener('click',hide);
    lightbox.addEventListener('click',(e)=>{if(e.target===lightbox) hide();});
    document.addEventListener('keydown',(e)=>{if(e.key==='Escape' && !lightbox.hasAttribute('hidden')) hide();});
  }
})();
