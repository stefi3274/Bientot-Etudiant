/* Icônes SVG monoline — injectées par data-icon */
(function () {
  const P = 'stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"';
  const ICONS = {
    // Matières
    math: `<path ${P} d="M4 5h6M7 3v4"/><path ${P} d="M15 4l4 4M19 4l-4 4"/><path ${P} d="M4 16h6M4 19h6"/><path ${P} d="M14 17h6M17 14v6"/>`,
    bio: `<path ${P} d="M8 3c0 4 8 6 8 9s-8 5-8 9"/><path ${P} d="M16 3c0 4-8 6-8 9s8 5 8 9"/><path ${P} d="M7 7h10M7 17h10"/>`,
    chim: `<path ${P} d="M9 3h6M10 3v6l-5 8a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-8V3"/><path ${P} d="M7.5 14h9"/>`,
    phys: `<circle ${P} cx="12" cy="12" r="2.2"/><ellipse ${P} cx="12" cy="12" rx="10" ry="4.2"/><ellipse ${P} cx="12" cy="12" rx="10" ry="4.2" transform="rotate(60 12 12)"/><ellipse ${P} cx="12" cy="12" rx="10" ry="4.2" transform="rotate(120 12 12)"/>`,
    fr: `<path ${P} d="M6 4h9a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H6z"/><path ${P} d="M6 4v16"/><path ${P} d="M9 8h6M9 11h6"/>`,
    cg: `<circle ${P} cx="12" cy="12" r="9"/><path ${P} d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.7-3.8-9S9.5 5.5 12 3z"/>`,
    creole: `<path ${P} d="M4 6h16M4 6v10a2 2 0 0 0 2 2h8l4 3v-5"/><path ${P} d="M8 10h6M8 13h4"/>`,
    philo: `<path ${P} d="M12 3a6 6 0 0 0-3 11.2V17a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-2.8A6 6 0 0 0 12 3z"/><path ${P} d="M10 21h4"/>`,
    // Filières
    med: `<path ${P} d="M12 4v6M9 7h6"/><circle ${P} cx="12" cy="15" r="5"/><path ${P} d="M12 13v4M10 15h4"/>`,
    gestion: `<rect ${P} x="4" y="9" width="16" height="11" rx="1.5"/><path ${P} d="M9 9V6a3 3 0 0 1 6 0v3"/><path ${P} d="M12 13v3"/>`,
    social: `<path ${P} d="M12 3l9 5-9 5-9-5 9-5z"/><path ${P} d="M6 10v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/>`,
    // Parcours (leçons, résumés, quiz, examens, progression)
    lecon: `<path ${P} d="M4 5a2 2 0 0 1 2-2h5v16H6a2 2 0 0 0-2 2z"/><path ${P} d="M20 5a2 2 0 0 0-2-2h-5v16h5a2 2 0 0 1 2 2z"/>`,
    resume: `<path ${P} d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path ${P} d="M14 3v5h5"/><path ${P} d="M8 13h8M8 16h5"/>`,
    quiz: `<path ${P} d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7"/><circle cx="12" cy="16.5" r="0.6" fill="currentColor"/><circle ${P} cx="12" cy="12" r="9"/>`,
    examen: `<path ${P} d="M8 3h8l-1 5H9z"/><path ${P} d="M9 8l-3 8a2 2 0 0 0 2 3h8a2 2 0 0 0 2-3l-3-8"/><path ${P} d="M12 12v4"/>`,
    progres: `<path ${P} d="M4 19V5M4 19h16"/><path ${P} d="M8 15l3-4 3 2 4-6"/>`,
    cloche: `<path ${P} d="M18 9a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7z"/><path ${P} d="M10 20a2 2 0 0 0 4 0"/>`,
    plume: `<path ${P} d="M20 4C10 6 6 12 4 20c6-1 12-4 15-11"/><path ${P} d="M13 8l-6 6"/>`,
    device: `<rect ${P} x="7" y="3" width="10" height="18" rx="2"/><path ${P} d="M11 18h2"/>`
  };

  document.querySelectorAll("[data-icon]").forEach(el => {
    const key = el.getAttribute("data-icon");
    if (ICONS[key]) {
      el.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">${ICONS[key]}</svg>`;
    }
  });
})();
