document.addEventListener('DOMContentLoaded', () => {
  // 1. Protect route
  if (!auth.protectRoute(['USER'])) {
    return; // Redirect happens in protectRoute
  }

  // 2. Initialize UI with user data
  const user = auth.getUser();
  if (user) {
    document.getElementById('currentUserName').textContent = user.name;
    document.getElementById('userInitial').textContent = user.name.charAt(0).toUpperCase();
  }

  // 3. Setup Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    auth.logout();
  });

  // 4. Initialize Accident History feature
  AccidentHistoryService.init();
});
