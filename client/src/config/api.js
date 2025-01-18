const API_BASE_URL = process.env.REACT_APP_CLIENT_URL || 'http://localhost:6001';

export const getApiUrl = (endpoint) => {
    // Remove leading slash if present
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${API_BASE_URL}/api/${cleanEndpoint}`;
};

export default {
    API_BASE_URL,
    getApiUrl,
};
