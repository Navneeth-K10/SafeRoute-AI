const API_URL = '/api';

const api = {
    async fetch(endpoint, options = {}) {
        const token = localStorage.getItem('saferoute_token');
        
        const headers = {
            ...options.headers
        };

        // Only set application/json if body is not FormData
        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(`${API_URL}${endpoint}`, config);
            const data = await response.json();
            
            // Handle global 401 Unauthorized
            if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
                // Let auth handle redirects
            }

            // Handle global 403 Forbidden (e.g. Account rejected mid-session)
            if (response.status === 403 && data.message && data.message.includes('account is no longer approved')) {
                localStorage.removeItem('saferoute_token');
                localStorage.removeItem('saferoute_user');
                alert(data.message);
                window.location.href = '/login.html';
            }
            
            return {
                status: response.status,
                ok: response.ok,
                data
            };
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
};
