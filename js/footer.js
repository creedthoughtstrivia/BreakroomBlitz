// footer.js
// Injects a common footer on every page with links to both Facebook groups.
// The URLs can be supplied via global variables (CREED_GROUP_URL and
// OFFICE_ADDICTS_GROUP_URL) or will default to placeholder strings. The
// footer is appended to the `.overlay` container so it remains within the
// blurred background but outside cards.
(function() {
  document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.querySelector('.overlay');
    if (!overlay) return;
    const creedUrl = window.CREED_GROUP_URL || '{{CREED_GROUP_URL}}';
    const addictsUrl = window.OFFICE_ADDICTS_GROUP_URL || '{{OFFICE_ADDICTS_GROUP_URL}}';
    const footer = document.createElement('footer');
    footer.style.marginTop = '40px';
    footer.style.textAlign = 'center';
    footer.style.fontSize = '14px';
    footer.style.opacity = '0.85';
    footer.innerHTML =
      '<a href="' + creedUrl + '" target="_blank" rel="noopener noreferrer">Creed Thoughts group</a>' +
      ' • ' +
      '<a href="' + addictsUrl + '" target="_blank" rel="noopener noreferrer">Office Addicts group</a>';
    overlay.appendChild(footer);
  });
})();