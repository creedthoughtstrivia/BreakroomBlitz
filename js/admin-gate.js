// admin-gate.js
// This lightweight script manages the visibility of the Admin link in the navigation
// and adds an Admin Logout option when the session is authenticated.  It relies on
// sessionStorage to store a boolean flag (`ct_admin_authed`) that is set once the
// user enters the correct passcode on the admin page.  By keeping the secret client‑side
// only, no sensitive information is persisted in the repository.
(function() {
  function updateNav() {
    const navList = document.querySelector('.navbar ul');
    if (!navList) return;
    const adminLinkLi = Array.from(navList.children).find(li => {
      const a = li.querySelector('a');
      return a && a.getAttribute('href') === 'admin.html';
    });
    const isAuthed = sessionStorage.getItem('ct_admin_authed') === 'true';
    if (!isAuthed) {
      // Hide admin link if it exists
      if (adminLinkLi) {
        adminLinkLi.style.display = 'none';
      }
      // Remove any existing logout links to avoid duplicates
      const logoutLink = navList.querySelector('a[data-admin-logout]');
      if (logoutLink) {
        logoutLink.parentElement.remove();
      }
    } else {
      // Show admin link
      if (adminLinkLi) {
        adminLinkLi.style.display = '';
      }
      // Add logout link if not already present
      if (!navList.querySelector('a[data-admin-logout]')) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.setAttribute('href', '#');
        a.setAttribute('data-admin-logout', 'true');
        a.textContent = 'Admin Logout';
        a.addEventListener('click', (e) => {
          e.preventDefault();
          sessionStorage.removeItem('ct_admin_authed');
          // Redirect to home page after logout
          window.location.href = 'index.html';
        });
        li.appendChild(a);
        navList.appendChild(li);
      }
    }
  }
  document.addEventListener('DOMContentLoaded', updateNav);
})();