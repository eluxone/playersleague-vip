(async () => {
  'use strict';

  const founderStyles = document.createElement('link');
  founderStyles.rel = 'stylesheet';
  founderStyles.href = 'story-founders.css?v=20260805-photos';
  document.head.appendChild(founderStyles);

  const loadScript = (src) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  try {
    await loadScript('assets/founders/yamil-data-1.js?v=1');
    await loadScript('assets/founders/yamil-data-2.js?v=1');
    await loadScript('assets/founders/mill-data-1.js?v=1');
    await loadScript('assets/founders/mill-data-2.js?v=1');
  } catch (error) {
    console.error('Founder portrait data could not be loaded', error);
  }

  const prepareFounderImage = (founder, encodedImage, fallback) => {
    const image = document.querySelector(`[data-founder-card="${founder}"] [data-founder-image]`);
    if (!image) return;

    const photo = image.closest('.founder-photo');
    const markLoaded = () => {
      photo?.classList.remove('photo-missing');
      photo?.classList.add('photo-loaded');
    };
    const markMissing = () => {
      photo?.classList.add('photo-missing');
      image.remove();
    };

    image.addEventListener('load', markLoaded, { once: true });
    image.addEventListener('error', markMissing, { once: true });
    image.src = encodedImage
      ? `data:image/webp;base64,${encodedImage}`
      : fallback;

    if (image.complete && image.naturalWidth > 0) markLoaded();
  };

  prepareFounderImage(
    'yamil',
    window.__PLVIP_YAMIL_IMAGE,
    'assets/founders/yamil-angura.jpg'
  );
  prepareFounderImage(
    'mill',
    window.__PLVIP_MILL_IMAGE,
    'assets/founders/mill-sugi.jpg'
  );

  window.__PLVIP_YAMIL_IMAGE = '';
  window.__PLVIP_MILL_IMAGE = '';

  const founderStories = {
    yamil: {
      number: '01',
      label: "YAMIL'S SPARK",
      title: 'Challenge the reset button.',
      text: "Imagine if joining a new game did not erase the reputation you had already earned. Yamil's side of the dream pushes the project to think beyond one title, one platform and one season."
    },
    mill: {
      number: '02',
      label: "MILL'S SPARK",
      title: 'Make the league feel human.',
      text: "Technology can connect accounts, but community connects people. Mill's side of the dream keeps Players League VIP focused on belonging, recognition and giving every genuine player a place in the story."
    },
    together: {
      number: '03',
      label: 'THE SHARED DREAM',
      title: 'Remember the player, not only the score.',
      text: 'Together, Yamil and Mill imagine one global league where participation creates identity, competition earns recognition and progress becomes a legacy that can keep growing.'
    }
  };

  const dreamStories = {
    play: {
      label: 'PLAY',
      title: 'Start with the player, not the wallet.',
      text: 'Joining the community should begin with participation. No token purchase or wallet is required to join the founding-player list.',
      width: '33%'
    },
    compete: {
      label: 'COMPETE',
      title: 'Make recognition meaningful.',
      text: 'Challenges and leaderboards should recognise skill, consistency and fair participation—not simply who spends the most.',
      width: '66%'
    },
    rise: {
      label: 'RISE',
      title: 'Turn progress into a lasting story.',
      text: 'The long-term dream is a player identity where achievements, badges and reputation can become part of one growing journey.',
      width: '100%'
    }
  };

  const storyPanel = {
    number: document.querySelector('[data-story-number]'),
    label: document.querySelector('[data-story-label]'),
    title: document.querySelector('[data-story-title]'),
    text: document.querySelector('[data-story-text]')
  };

  const dreamPanel = {
    label: document.querySelector('[data-dream-label]'),
    title: document.querySelector('[data-dream-title]'),
    text: document.querySelector('[data-dream-text]'),
    meter: document.querySelector('[data-dream-meter]')
  };

  const animatePanel = (container) => {
    if (!container) return;
    container.classList.remove('panel-changing');
    void container.offsetWidth;
    container.classList.add('panel-changing');
  };

  document.querySelectorAll('[data-story-choice]').forEach((button) => {
    button.addEventListener('click', () => {
      const choice = button.dataset.storyChoice;
      const content = founderStories[choice];
      if (!content) return;

      document.querySelectorAll('[data-story-choice]').forEach((item) => {
        const active = item.dataset.storyChoice === choice;
        item.classList.toggle('active', active);
        item.setAttribute('aria-selected', String(active));
        if (item.hasAttribute('aria-pressed')) item.setAttribute('aria-pressed', String(active));
      });
      document.querySelectorAll('[data-founder-card]').forEach((card) => {
        card.classList.toggle('active', card.dataset.founderCard === choice);
      });

      if (storyPanel.number) storyPanel.number.textContent = content.number;
      if (storyPanel.label) storyPanel.label.textContent = content.label;
      if (storyPanel.title) storyPanel.title.textContent = content.title;
      if (storyPanel.text) storyPanel.text.textContent = content.text;
      animatePanel(document.querySelector('[data-story-panel]'));
    });
  });

  document.querySelectorAll('[data-dream-choice]').forEach((button) => {
    button.addEventListener('click', () => {
      const choice = button.dataset.dreamChoice;
      const content = dreamStories[choice];
      if (!content) return;

      document.querySelectorAll('[data-dream-choice]').forEach((item) => {
        const active = item.dataset.dreamChoice === choice;
        item.classList.toggle('active', active);
        item.setAttribute('aria-selected', String(active));
      });

      if (dreamPanel.label) dreamPanel.label.textContent = content.label;
      if (dreamPanel.title) dreamPanel.title.textContent = content.title;
      if (dreamPanel.text) dreamPanel.text.textContent = content.text;
      if (dreamPanel.meter) dreamPanel.meter.style.width = content.width;
      animatePanel(document.querySelector('[data-dream-panel]'));
    });
  });
})();
