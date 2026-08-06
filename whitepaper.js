(() => {
  'use strict';

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
      text: 'Players may eventually present selected games, badges, challenge history and reputation signals through one Players League VIP identity.'
    },
    community: {
      label: 'FOR COMMUNITIES',
      title: 'Better ways to recognise contribution.',
      text: 'Communities may eventually highlight participation, teamwork, leadership and trusted contributions alongside competitive results.'
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