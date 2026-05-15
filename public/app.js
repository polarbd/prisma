document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initStats();
  loadPlans();
  loadPrices();
  loadPortfolio();
  initLightbox();
  initScrollAnimations();
});

// === Navbar ===
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  const navItems = document.querySelectorAll('.nav-link');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });

  toggle.addEventListener('click', () => {
    toggle.classList.toggle('open');
    links.classList.toggle('open');
  });

  navItems.forEach(link => {
    link.addEventListener('click', () => {
      toggle.classList.remove('open');
      links.classList.remove('open');
    });
  });
}



// === Stats Counter Animation ===
function initStats() {
  const counters = document.querySelectorAll('.stat-number');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.count);
        animateCounter(el, target);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(c => observer.observe(c));
}

function animateCounter(el, target) {
  let current = 0;
  const duration = 2000;
  const step = target / (duration / 16);
  const timer = setInterval(() => {
    current += step;
    if (current >= target) { current = target; clearInterval(timer); }
    el.textContent = Math.floor(current);
  }, 16);
}

// === Plans & Prices ===
async function loadPlans() {
  try {
    const res = await fetch('/api/plans');
    const plans = await res.json();
    const grid = document.getElementById('plansGrid');
    if (grid) {
      grid.innerHTML = plans.map((plan, i) => `
        <div class="plan-card ${i === 1 ? 'featured' : ''}" style="animation: fadeUp 0.6s ${i * 0.1}s both">
          ${plan.badge ? `<div class="plan-badge">${plan.badge}</div>` : ''}
          <div class="plan-header">
            <h3>${plan.name}</h3>
            <p>${plan.description}</p>
          </div>
          <div class="plan-price">
            <span class="amount">${plan.price.split('/')[0]}</span>
            <span class="period">/${plan.price.split('/')[1] || 'mes'}</span>
          </div>
          <div class="plan-benefits">
            <ul>
              ${(plan.benefits || []).map(b => `<li>${b}</li>`).join('')}
            </ul>
          </div>
          <div class="plan-footer">
            <a href="https://wa.me/50497226932?text=${encodeURIComponent(`Hola Prisma, me interesa el ${plan.name}. ¿Podrían darme más información?`)}" target="_blank" class="btn ${i === 1 ? 'btn-primary' : 'btn-outline'}">
              Solicitar Plan
            </a>
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Error loading plans:', err);
  }
}



async function loadPrices() {
  const grid = document.getElementById('pricesGrid');
  if (!grid) return;
  try {
    const res = await fetch('/api/prices');
    const prices = await res.json();
    grid.innerHTML = prices.map((p, i) => `
      <div class="price-card animate-in" style="animation-delay: ${i * 0.1}s">
        <div class="price-card-header">
          <h3>${p.name}</h3>
          <span class="price">${p.price}</span>
        </div>
        <p>${p.description || ''}</p>
        <a href="https://wa.me/50497226932?text=${encodeURIComponent(`Hola Prisma, me interesa el servicio de ${p.name}.`)}" target="_blank" class="btn btn-outline">
          Solicitar Servicio
        </a>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error loading prices:', err);
  }
}

// === Portfolio ===
let allPortfolioItems = [];

async function loadPortfolio() {
  try {
    const res = await fetch('/api/portfolio');
    allPortfolioItems = await res.json();
    renderPortfolio('all');
    initFilters();
  } catch (err) {
    console.error('Error loading portfolio:', err);
  }
}

function renderPortfolio(filter) {
  const grid = document.getElementById('portfolioGrid');
  const empty = document.getElementById('portfolioEmpty');
  if (!grid || !empty) return;

  const items = filter === 'all' ? allPortfolioItems : allPortfolioItems.filter(i => i.media_type === filter);

  if (items.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  grid.innerHTML = items.map((item, i) => {
    const isVideo = item.media_type === 'video';
    const isEmbed = isVideo && (item.media_url.includes('youtube') || item.media_url.includes('youtu.be') || item.media_url.includes('vimeo'));
    let thumb;

    if (isEmbed) {
      const embedUrl = getEmbedUrl(item.media_url);
      thumb = `<iframe src="${embedUrl}" frameborder="0" allowfullscreen style="width:100%;height:100%;position:absolute;top:0;left:0;"></iframe>`;
    } else if (isVideo) {
      thumb = `<video src="${item.media_url}" muted></video>`;
    } else {
      thumb = `<img src="${item.media_url}" alt="${item.title}" loading="lazy">`;
    }

    return `
      <div class="portfolio-item" data-type="${item.media_type}" data-url="${item.media_url}" data-index="${i}" style="animation: fadeUp 0.5s ${i * 0.08}s both">
        <div class="portfolio-thumb">
          ${thumb}
          <span class="portfolio-media-badge">${isVideo ? '▶ Video' : '📷 Imagen'}</span>
          <div class="portfolio-overlay"></div>
        </div>
        <div class="portfolio-info">
          <h3>${item.title}</h3>
          ${item.description ? `<p>${item.description}</p>` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Re-attach click events for lightbox
  document.querySelectorAll('.portfolio-item').forEach(item => {
    item.addEventListener('click', () => openLightbox(item));
  });
}

function getEmbedUrl(url) {
  if (url.includes('youtube.com/watch')) {
    const id = new URL(url).searchParams.get('v');
    return `https://www.youtube.com/embed/${id}`;
  }
  if (url.includes('youtu.be/')) {
    const id = url.split('youtu.be/')[1].split('?')[0];
    return `https://www.youtube.com/embed/${id}`;
  }
  return url;
}

function initFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderPortfolio(btn.dataset.filter);
    });
  });
}

// === Lightbox ===
function initLightbox() {
  const lightbox = document.getElementById('lightbox');
  const closeBtn = document.getElementById('lightboxClose');

  closeBtn.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });
}

function openLightbox(item) {
  const type = item.dataset.type;
  const url = item.dataset.url;
  const content = document.getElementById('lightboxContent');
  const lightbox = document.getElementById('lightbox');

  if (type === 'video' && (url.includes('youtube') || url.includes('youtu.be'))) return;

  if (type === 'video') {
    content.innerHTML = `<video src="${url}" controls autoplay style="max-width:90vw;max-height:85vh;border-radius:12px;"></video>`;
  } else {
    content.innerHTML = `<img src="${url}" alt="" style="max-width:90vw;max-height:85vh;border-radius:12px;">`;
  }
  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  const content = document.getElementById('lightboxContent');
  lightbox.classList.remove('active');
  document.body.style.overflow = '';
  content.innerHTML = '';
}

// === Scroll Animations ===
function initScrollAnimations() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-in { animation: fadeUp 0.6s both; }
  `;
  document.head.appendChild(style);

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.service-card, .section-header').forEach(el => observer.observe(el));
}
