document.addEventListener('DOMContentLoaded', () => {

  // --- 1. STATS COUNT-UP ANIMATION ENGINE ---
  const statItems = document.querySelectorAll('.stat-item');

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function animateStat(item, index) {
    const valueEl = item.querySelector('.stat-value');
    if (!valueEl) return;

    const target = parseFloat(item.getAttribute('data-target')) || 0;
    const decimals = parseInt(item.getAttribute('data-decimals'), 10) || 0;
    const suffix = item.getAttribute('data-suffix') || '';

    const duration = 1500 + index * 80;
    const startDelay = 480 + index * 90;

    setTimeout(() => {
      let startTime = null;

      function step(timestamp) {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const easedProgress = easeOutCubic(progress);
        const currentValue = (target * easedProgress).toFixed(decimals);

        valueEl.textContent = currentValue + suffix;

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          valueEl.textContent = target.toFixed(decimals) + suffix;
        }
      }

      requestAnimationFrame(step);
    }, startDelay);
  }

  // IntersectionObserver for trigger once at 0.25 threshold
  const statsFooter = document.querySelector('.stats-footer');
  if (statsFooter) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          statItems.forEach((item, index) => animateStat(item, index));
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.25 });

    observer.observe(statsFooter);
  }

  // --- 2. MOBILE MENU TOGGLE & ACCESSIBILITY ---
  const burgerBtn = document.getElementById('burgerBtn');
  const mobileOverlay = document.getElementById('mobileOverlay');
  const mobileSheet = document.getElementById('mobileSheet');

  function openMenu() {
    document.body.classList.add('menu-open');
    if (burgerBtn) burgerBtn.setAttribute('aria-expanded', 'true');
    if (mobileOverlay) {
      mobileOverlay.classList.add('open');
      mobileOverlay.setAttribute('aria-hidden', 'false');
    }
    if (mobileSheet) {
      mobileSheet.classList.add('open');
      mobileSheet.setAttribute('aria-hidden', 'false');
    }
  }

  function closeMenu() {
    document.body.classList.remove('menu-open');
    if (burgerBtn) burgerBtn.setAttribute('aria-expanded', 'false');
    if (mobileOverlay) {
      mobileOverlay.classList.remove('open');
      mobileOverlay.setAttribute('aria-hidden', 'true');
    }
    if (mobileSheet) {
      mobileSheet.classList.remove('open');
      mobileSheet.setAttribute('aria-hidden', 'true');
    }
  }

  if (burgerBtn) {
    burgerBtn.addEventListener('click', () => {
      const isOpen = document.body.classList.contains('menu-open');
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });
  }

  if (mobileOverlay) {
    mobileOverlay.addEventListener('click', closeMenu);
  }

  // Close menu on Link Click
  const mobileLinks = document.querySelectorAll('.mobile-link, .mobile-sign-in');
  mobileLinks.forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // Close on Escape Key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('menu-open')) {
      closeMenu();
    }
  });

  // Close on Resize > 720px
  window.addEventListener('resize', () => {
    if (window.innerWidth > 720 && document.body.classList.contains('menu-open')) {
      closeMenu();
    }
  });

});
