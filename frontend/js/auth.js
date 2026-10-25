const auth = {
    async register(userData) {
        return await api.fetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    },

    async login(email, password) {
        const response = await api.fetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        if (response.ok && response.data.success) {
            localStorage.setItem('saferoute_token', response.data.data.token);
            localStorage.setItem('saferoute_user', JSON.stringify(response.data.data.user));
            this.redirectBasedOnRole(response.data.data.user.role);
        }

        return response;
    },

    logout() {
        localStorage.removeItem('saferoute_token');
        localStorage.removeItem('saferoute_user');
        window.location.href = '/login.html';
    },

    async getCurrentUser() {
        const response = await api.fetch('/auth/me');
        if (response.ok && response.data.success) {
            localStorage.setItem('saferoute_user', JSON.stringify(response.data.data.user));
            return response.data.data.user;
        }
        return null;
    },

    isAuthenticated() {
        return !!localStorage.getItem('saferoute_token');
    },

    getToken() {
        return localStorage.getItem('saferoute_token');
    },

    getUser() {
        const userStr = localStorage.getItem('saferoute_user');
        return userStr ? JSON.parse(userStr) : null;
    },

    redirectBasedOnRole(role) {
        switch (role) {
            case 'USER':
                window.location.href = '/user/dashboard.html';
                break;
            case 'POLICE':
                window.location.href = '/police/dashboard.html';
                break;
            case 'AMBULANCE':
                window.location.href = '/ambulance/dashboard.html';
                break;
            case 'ADMIN':
                window.location.href = '/admin/dashboard.html';
                break;
            default:
                window.location.href = '/login.html';
        }
    },

    protectRoute(allowedRoles = []) {
        if (!this.isAuthenticated()) {
            window.location.href = '/login.html';
            return false;
        }

        const user = this.getUser();
        if (!user || (allowedRoles.length > 0 && !allowedRoles.includes(user.role))) {
            document.body.innerHTML = '<h1>Unauthorized</h1><p>Redirecting to login...</p>';
            setTimeout(() => this.logout(), 2000);
            return false;
        }
        return true;
    }
};
