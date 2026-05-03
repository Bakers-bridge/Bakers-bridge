/**
 * Bakers Bridge - Shared Utilities
 * Common functions used across storefront and admin portal.
 */

window.utils = {
    // Refresh Lucide Icons
    refreshIcons: () => {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    },

    getTierBadgeHTML: (tier) => {
        if (!tier || tier === 'none') return '';
        const badgeMap = { 
            bronze: { img: 'bronze-badge.png.png', label: 'Bronze Artist' }, 
            silver: { img: 'silver-badge.png.png', label: 'Silver Premium' }, 
            gold: { img: 'elite-badge.png.png', label: 'Gold Elite' } 
        };
        const b = badgeMap[tier.toLowerCase()];
        if (!b) return '';
        return `
            <div class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-gray-100 shadow-sm" title="${b.label}">
                <img src="${b.img}" class="w-4 h-4 object-contain rounded-full">
                <span class="text-[9px] text-gray-500 font-bold uppercase tracking-widest">${b.label}</span>
            </div>
        `;
    },

    // Show Toast Notification
    showToast: (msg, duration = 3000) => {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = msg;
            toast.classList.remove('opacity-0', 'translate-y-20', 'pointer-events-none');
            toast.classList.add('opacity-100', 'translate-y-0');
            setTimeout(() => {
                toast.classList.add('opacity-0', 'translate-y-20', 'pointer-events-none');
                toast.classList.remove('opacity-100', 'translate-y-0');
            }, duration);
        }
    },

    // Standardize Database ID Field (Handles 'id' or 'ID')
    getIdField: (data) => {
        if (!data || data.length === 0) return 'id';
        const first = data[0];
        return first.hasOwnProperty('id') ? 'id' : (first.hasOwnProperty('ID') ? 'ID' : 'id');
    },

    // Parse JSON safely
    safeParse: (str, fallback = []) => {
        try {
            return typeof str === 'string' ? JSON.parse(str) : (str || fallback);
        } catch (e) {
            console.error("JSON Parse Error:", e);
            return fallback;
        }
    }
};
