
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const links = document.querySelectorAll('a[href^="#"]');
  links.forEach(link => {
    link.addEventListener('click', () => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) target.setAttribute('tabindex','-1');
    });
  });

  if (reduce) return;

  const projects = document.querySelectorAll('.project');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-seen');
      observer.unobserve(entry.target);
    });
  }, {threshold: .16});

  projects.forEach((project, index) => {
    project.style.setProperty('--reveal-delay', `${Math.min(index * 70, 210)}ms`);
    observer.observe(project);
  });

  const style = document.createElement('style');
  style.textContent = `
    .project{opacity:0;transform:translateY(18px);transition:opacity .55s var(--ease) var(--reveal-delay),transform .55s var(--ease) var(--reveal-delay)}
    .project.is-seen{opacity:1;transform:none}
  `;
  document.head.appendChild(style);
})();
