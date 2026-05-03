/**
 * Bakers Bridge - Main Stability Logic (V16 - ERROR PROOF)
 * Handles data fetching, UI rendering, Direct Linking, and Availability.
 */

// Global State
window.allBakers = [];
let cart = [];
let currentBaker = null;
let selectedLoc = 'all';

function getBadgeHTML(tier) {
    if (!tier || tier === 'none') return '';
    const t = String(tier).toLowerCase();
    let badgeImg = './elite-badge.png.png';
    if (t === 'bronze') badgeImg = './bronze-badge.png.png';
    if (t === 'silver') badgeImg = './silver-badge.png.png';
    if (t === 'gold') badgeImg = './elite-badge.png.png';
    return `
        <div class="w-8 h-8 flex-shrink-0 rounded-full border-2 border-white shadow-md bg-white p-0.5 overflow-hidden">
            <img src="${badgeImg}" class="w-full h-full object-contain rounded-full">
        </div>
    `;
}

// 1. UI Utility
window.openManifesto = () => { document.getElementById('manifesto-modal').classList.replace('hidden', 'flex'); document.body.style.overflow = 'hidden'; };
window.closeManifesto = () => { document.getElementById('manifesto-modal').classList.replace('flex', 'hidden'); document.body.style.overflow = 'auto'; };
window.openPrivacy = (tab = 'privacy') => { document.getElementById('privacy-modal').classList.replace('hidden', 'flex'); document.body.style.overflow = 'hidden'; window.switchLegalTab(tab); };
window.closePrivacy = () => { document.getElementById('privacy-modal').classList.replace('flex', 'hidden'); document.body.style.overflow = 'auto'; };
window.switchLegalTab = (tab) => {
    const pContent = document.getElementById('legal-content-privacy');
    const tContent = document.getElementById('legal-content-terms');
    if (tab === 'privacy') { if(pContent) pContent.classList.remove('hidden'); if(tContent) tContent.classList.add('hidden'); } 
    else { if(tContent) tContent.classList.remove('hidden'); if(pContent) pContent.classList.add('hidden'); }
};
window.showToast = (msg) => { const t = document.getElementById('toast'); if(t){ t.textContent = msg; t.classList.add('active'); setTimeout(()=>t.classList.remove('active'), 3000); }};

// 2. Navigation & Modals
window.openPlans = () => {
    const modal = document.getElementById('plans-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';
        if (window.utils) window.utils.refreshIcons();
    }
};

window.closePlans = () => {
    const modal = document.getElementById('plans-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = '';
    }
};

// 3. Data Sync Engines
async function fetchBakers() {
    try {
        const { data, error } = await window.db.from('bakers').select('*');
        if (error) throw error;
        if (data) { 
            window.allBakers = data; 
            window.renderBakers(data);
            
            // Sync Hero Stats
            const artisanCount = data.length;
            let totalProducts = 0;
            data.forEach(b => {
                const products = window.utils ? window.utils.safeParse(b.products) : [];
                totalProducts += products.length;
            });

            const artEl = document.getElementById('hero-artisan-bubble');
            const itemEl = document.getElementById('hero-item-count');
            if (artEl) artEl.textContent = `+${artisanCount}`;
            if (itemEl) itemEl.textContent = `${totalProducts}+ Items`;

            // IDEA 40: Safe Direct Artist Link
            const params = new URLSearchParams(window.location.search);
            const bakerParam = params.get('baker') || params.get('artist');
            if (bakerParam) {
                const target = data.find(b => {
                    const bid = String(b.id || b.ID || "");
                    const bname = String(b.name || "").toLowerCase().replace(/\s+/g, '-');
                    return bid === bakerParam || bname === bakerParam.toLowerCase();
                });
                if (target) setTimeout(() => window.openBakerModal(target.id || target.ID), 500);
            }
        }
    } catch (err) { console.error("Baker load failed:", err); }
}

async function fetchFestivalsFront() {
    try {
        const { data } = await window.db.from('festivals').select('*').eq('is_active', true);
        if (data && data.length > 0) {
            const section = document.getElementById('festivals-section');
            const track = document.getElementById('festival-track');
            if (section) section.classList.remove('hidden');
            if (track) {
                track.innerHTML = data.map(f => `
                    <div class="fest-card-force snap-start group bg-white rounded-[40px] overflow-hidden border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-700 flex flex-col">
                        <div style="height:180px;width:100%;overflow:hidden;position:relative;">
                            <img src="${f.image_url || 'https://via.placeholder.com/800x600'}" style="width:100%;height:100%;object-fit:cover;">
                        </div>
                        <div class="flex-1 p-10 bg-white border-t border-gray-50 flex flex-col justify-start relative">
                            <div class="absolute -top-6 right-8 bg-white px-6 py-3 rounded-full shadow-lg border border-gray-50">
                                <span class="text-[9px] uppercase tracking-[0.3em] font-bold text-[#C5A059]">${f.event_date}</span>
                            </div>
                            <h3 class="serif text-2xl text-gray-900 font-bold mb-4 group-hover:text-[#C5A059] transition-colors">${f.title}</h3>
                            <p class="text-gray-400 text-[12px] leading-relaxed italic">${f.description || 'Experience the ritual of artisanal baking.'}</p>
                        </div>
                    </div>
                `).join('');
            }
        }
    } catch (e) {}
}

window.renderBakers = (list) => {
    const grid = document.getElementById('baker-grid');
    if (!grid) return;
    grid.innerHTML = list.map(b => {
        const id = b.id || b.ID;
        const name = b.name || "Master Artisan";
        const isVerified = b.is_verified === true || b.is_verified === 'true';
        const tier = String(b.badge_tier || 'none').toLowerCase();
        const isAvailable = b.is_available !== false;
        
        return `
        <div class="artist-card text-center group cursor-pointer ${!isAvailable ? 'opacity-60 grayscale-[0.5]' : ''}">
            <div class="relative mb-8" onclick="window.openBakerModal('${id}')">
                <div class="artist-card-img-wrapper aspect-square overflow-hidden rounded-full border-4 border-white shadow-xl group-hover:border-[#C5A059] transition-all duration-700 relative">
                    <img src="${b.logo_key || 'logo.jpeg'}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2s]">
                    ${isVerified ? `<div style="position:absolute;top:-4px;right:-4px;z-index:10;background:white;border-radius:9999px;padding:4px;box-shadow:0 4px 12px rgba(0,0,0,0.15);border:2px solid #C5A059;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#C5A059" stroke="#C5A059" stroke-width="1"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10" fill="none" stroke="white" stroke-width="2.5"/></svg></div>` : ''}
                </div>
                ${!isAvailable ? `
                <div class="absolute inset-0 flex items-center justify-center">
                    <span class="bg-[#2D2926]/80 text-white text-[9px] font-bold uppercase tracking-[0.3em] px-6 py-3 rounded-full backdrop-blur-sm">Fully Booked</span>
                </div>
                ` : ''}
            </div>
            <div class="text-center">
                <div class="flex items-center justify-center gap-2 mb-2">
                    <h4 class="serif font-bold text-xl text-gray-900">${name}</h4>
                    ${getBadgeHTML(tier)}
                </div>
                <p class="text-[10px] uppercase tracking-widest text-[#C5A059] font-bold mb-4 flex items-center justify-center gap-1">
                    <i data-lucide="map-pin" class="w-3 h-3"></i> ${b.loc || 'Chennai'}
                </p>
                <button onclick="window.openBakerModal('${id}')" class="text-[9px] font-bold uppercase tracking-[0.2em] border-b-2 border-transparent hover:border-[#C5A059] pb-1">View Profile</button>
            </div>
        </div>
        `;
    }).join('');
    if (window.utils) window.utils.refreshIcons();
};

window.handleSearchInput = (val) => {
    const dropdown = document.getElementById('search-suggestions');
    if (!dropdown) return;
    
    // Always filter the main gallery
    window.filterBakers(selectedLoc);

    if (!val || val.length < 1) {
        dropdown.classList.add('hidden');
        return;
    }

    const term = val.toLowerCase();
    const matches = window.allBakers.filter(b => 
        (b.name || '').toLowerCase().includes(term) || 
        (b.loc || '').toLowerCase().includes(term) ||
        (b.about || '').toLowerCase().includes(term)
    ).slice(0, 5); // Show top 5

    if (matches.length > 0) {
        dropdown.innerHTML = matches.map(b => `
            <div onclick="window.selectFromSearch('${b.id || b.ID}')" class="px-10 py-6 hover:bg-gray-50 flex items-center justify-between cursor-pointer border-b border-gray-50 last:border-0 group">
                <div class="flex items-center gap-6">
                    <div class="w-12 h-12 rounded-full overflow-hidden border border-gray-100 group-hover:border-[#C5A059] transition-all">
                        <img src="${b.logo_key || 'logo.jpeg'}" class="w-full h-full object-cover">
                    </div>
                    <div class="text-left">
                        <p class="text-[11px] font-bold text-gray-900 uppercase tracking-widest mb-1">${b.name}</p>
                        <p class="text-[9px] font-bold text-[#C5A059] uppercase tracking-widest flex items-center gap-1">
                            <i data-lucide="map-pin" class="w-3 h-3"></i> ${b.loc || 'Chennai'}
                        </p>
                    </div>
                </div>
                <i data-lucide="arrow-up-left" class="w-4 h-4 text-gray-200 group-hover:text-[#C5A059] transition-all"></i>
            </div>
        `).join('');
        dropdown.classList.remove('hidden');
        if (window.utils) window.utils.refreshIcons();
    } else {
        dropdown.classList.add('hidden');
    }
};

window.selectFromSearch = (id) => {
    document.getElementById('search-suggestions').classList.add('hidden');
    window.openBakerModal(id);
};

window.filterBakers = (loc) => {
    selectedLoc = loc;
    const term = document.getElementById('hero-baker-search')?.value.toLowerCase() || "";
    const filtered = window.allBakers.filter(b => {
        // Search bar works for names, locations, and about for deep discovery
        const matchesPill = loc === 'all' || (b.loc || '').toLowerCase().includes(loc.toLowerCase());
        const matchesSearch = (b.loc || '').toLowerCase().includes(term) || (b.name || '').toLowerCase().includes(term);
        return matchesPill && matchesSearch;
    });
    window.renderBakers(filtered);
};

// Close dropdown on click outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('search-suggestions');
    const searchBar = document.getElementById('hero-baker-search');
    if (dropdown && !dropdown.contains(e.target) && e.target !== searchBar) {
        dropdown.classList.add('hidden');
    }
});

/// 3. Modal Interactions - MIGRATED TO INDEX.HTML FOR HIGH PRIORITY
// (openBakerModal now lives in index.html)

window.addToCart = (name, price) => { cart.push({ name, price }); window.showToast(`${name} added! ✨`); updateCartUI(); };
function updateCartUI() {
    const total = cart.reduce((sum, item) => sum + Number(item.price), 0);
    const bar = document.getElementById('floating-cart-bar');
    const totalEl = document.getElementById('floating-cart-total');
    if (cart.length === 0) { if (bar) bar.classList.add('hidden'); } 
    else { if (bar) bar.classList.remove('hidden'); if (totalEl) totalEl.textContent = `₹${total}`; }
}

// 4. Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initial State
    if (!window.db) {
        console.error("Supabase not initialized");
        return;
    }

    await fetchBakers();
    fetchFestivalsFront();
    
    document.getElementById('close-modal-btn').onclick = () => { 
        document.getElementById('baker-modal').classList.remove('active'); 
        document.body.style.overflow = ''; 
    };

    const checkoutBtn = document.getElementById('whatsapp-checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.onclick = async () => {
            if (!window.currentBaker || cart.length === 0) {
                window.showToast("Please select items first ✨");
                return;
            }
            window.checkoutViaWhatsApp();
        };
    }

    window.checkoutViaWhatsApp = async () => {
        if (!window.currentBaker || cart.length === 0) return;
        const total = cart.reduce((sum, item) => sum + Number(item.price), 0);
        try { 
            await window.db.from('leads').insert([{ 
                baker_name: window.currentBaker.name, 
                total_price: total, 
                status: 'Pending' 
            }]); 
        } catch (e) { console.error("Lead tracking failed:", e); }
        
        const message = `Hello ${window.currentBaker.name}, I'd like to order from your menu via Bakers Bridge:\n\nTotal: ₹${total}\n\nPlease confirm availability. Thanks!`;
        const phone = window.currentBaker.phone || '910000000000';
        window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
    };
});
