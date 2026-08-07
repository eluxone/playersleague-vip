(() => {
  'use strict';

  const mobileStyles = document.createElement('link');
  mobileStyles.rel = 'stylesheet';
  mobileStyles.href = 'whitepaper-mobile.css?v=20260807-live-beta';
  document.head.appendChild(mobileStyles);

  // Keep the living White Paper aligned with the platform that is actually live.
  const statusTitle = document.querySelector('.wp-status-head strong');
  if (statusTitle) statusTitle.textContent = 'Player beta live';

  const platformRows = [...document.querySelectorAll('#platform .wp-stack article')];
  const platformStates = ['LIVE · BETA', 'LIVE · BETA', 'LIVE · BETA', 'FUTURE DIRECTION'];
  platformRows.forEach((row, index) => {
    const state = row.querySelector('b');
    if (state && platformStates[index]) state.textContent = platformStates[index];
  });

  const platformNote = document.querySelector('#platform .wp-note');
  if (platformNote) {
    platformNote.textContent = 'Player profiles, badges, community challenges and the recognition leaderboard are available in beta. Beta features may change as moderation, security, usability and community feedback are tested.';
  }

  const roadmapRows = [...document.querySelectorAll('#roadmap .wp-roadmap article')];
  const roadmapStates = ['COMPLETE', 'LIVE · BETA', 'LIVE · BETA', 'FUTURE'];
  roadmapRows.forEach((row, index) => {
    const state = row.querySelector('b');
    if (state && roadmapStates[index]) state.textContent = roadmapStates[index];
    row.classList.toggle('current', index === 1 || index === 2);
  });

  const progress = document.querySelector('[data-reading-progress]');
  const tocLinks = [...document.querySelectorAll('.wp-toc a[href^="#"]')];
  const chapters = tocLinks
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  const updateProgress = () => {
    if (!progress) return;
    const root = document.documentElement;
    const scrollable = root.scrollHeight - window.innerHeight;
    const percent = scrollable > 0 ? Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100)) : 0;
    progress.style.width = `${percent}%`;
  };

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      updateProgress();
      ticking = false;
    });
  }, { passive: true });
  updateProgress();

  if ('IntersectionObserver' in window && chapters.length) {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      tocLinks.forEach((link) => {
        link.classList.toggle('active', link.getAttribute('href') === `#${visible.target.id}`);
      });
    }, { rootMargin: '-20% 0px -65% 0px', threshold: [0, .15, .4] });
    chapters.forEach((chapter) => observer.observe(chapter));
  }

  const visionContent = {
    player: {
      label: 'FOR PLAYERS',
      title: 'A profile that tells a fuller story.',
      text: 'Players can create a public Players League VIP identity with selected games, platforms, biography, badges and challenge history while the beta continues to develop.'
    },
    community: {
      label: 'FOR COMMUNITIES',
      title: 'Better ways to recognise contribution.',
      text: 'The beta combines public profiles, reviewed community challenges, badges and a recognition leaderboard. Broader community signals may be added after testing.'
    },
    partners: {
      label: 'FOR PARTNERS',
      title: 'A responsible path to relevant opportunities.',
      text: 'Future partners may explore carefully defined benefits, events or experiences, subject to clear terms, availability and user choice.'
    }
  };

  const switcher = document.querySelector('[data-vision-switcher]');
  if (switcher) {
    const buttons = [...switcher.querySelectorAll('[data-vision]')];
    const label = switcher.querySelector('[data-vision-label]');
    const title = switcher.querySelector('[data-vision-title]');
    const text = switcher.querySelector('[data-vision-text]');

    if (text) text.textContent = visionContent.player.text;

    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        const content = visionContent[button.dataset.vision];
        if (!content) return;
        buttons.forEach((item) => {
          const active = item === button;
          item.classList.toggle('active', active);
          item.setAttribute('aria-selected', String(active));
        });
        if (label) label.textContent = content.label;
        if (title) title.textContent = content.title;
        if (text) text.textContent = content.text;
      });
    });
  }

  const contract = '0xD06Db34A4BD78f2F059646FDc45530297bE50449';
  const copyButton = document.querySelector('[data-copy-contract]');
  if (copyButton) {
    copyButton.addEventListener('click', async () => {
      const original = copyButton.textContent;
      try {
        await navigator.clipboard.writeText(contract);
        copyButton.textContent = 'Address copied ✓';
      } catch {
        const area = document.createElement('textarea');
        area.value = contract;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        area.remove();
        copyButton.textContent = 'Address copied ✓';
      }
      window.setTimeout(() => { copyButton.textContent = original; }, 2200);
    });
  }
})();