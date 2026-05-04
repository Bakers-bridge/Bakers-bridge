/**
 * Bakers Bridge - Admin Portal Logic (V4)
 * Handles artist management, festival scheduling, and the NEW Lead Manager.
 */

const STORAGE_BUCKET = 'bakers-asset';
let currentBakerId = null;
let currentFestId = null;
let bakerFile = null;
let festFile = null;

// UI Initialization
function refreshIcons() {
    if (window.utils && window.utils.refreshIcons) {
        window.utils.refreshIcons();
    }
}

window.showToast = (msg) => {
    const t = document.getElementById('toast');
    if (t) {
        t.textContent = msg;
        t.classList.add('active');
        setTimeout(() => t.classList.remove('active'), 3000);
    }
};

window.switchTab = (id) => {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const tab = document.getElementById(id);
    const link = document.getElementById('link-' + id);
    if (tab) tab.classList.add('active');
    if (link) link.classList.add('active');
    
    if (id === 'leads-manager') fetchLeads();
    if (id === 'site-settings') fetchSiteSettings();
    refreshIcons();
};

// Lead Management
window.fetchLeads = async () => {
    const tbody = document.getElementById('leads-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5" class="py-20 text-center text-gray-300 italic">Fetching leads...</td></tr>';
    
    try {
        const { data, error } = await window.db.from('leads').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="py-20 text-center text-gray-300 italic">No enquiries received yet.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(l => {
            const date = new Date(l.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            const statusClass = l.status === 'Sale Done' ? 'bg-green-100 text-green-700' : (l.status === 'Not Done' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700');
            
            return `
            <tr class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td class="px-8 py-6 text-xs font-semibold text-gray-500">${date}</td>
                <td class="px-8 py-6 text-sm font-bold text-gray-900">${l.baker_name}</td>
                <td class="px-8 py-6 text-sm font-bold text-[#C5A059]">₹${l.total_price}</td>
                <td class="px-8 py-6">
                    <span class="px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${statusClass}">${l.status || 'Pending'}</span>
                </td>
                <td class="px-8 py-6 text-right">
                    <div class="flex justify-end gap-2">
                        <button onclick="updateLeadStatus('${l.id}', 'Sale Done')" class="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all"><i data-lucide="check" class="w-4 h-4"></i></button>
                        <button onclick="updateLeadStatus('${l.id}', 'Not Done')" class="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all"><i data-lucide="x" class="w-4 h-4"></i></button>
                        <button onclick="deleteLead('${l.id}')" class="p-2 bg-gray-50 text-gray-400 rounded-lg hover:bg-red-500 hover:text-white transition-all"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');
        refreshIcons();
    } catch (err) {
        console.error("Lead Fetch Error:", err);
        tbody.innerHTML = `<tr><td colspan="5" class="py-20 text-center text-red-400 italic">Error loading leads: ${err.message}</td></tr>`;
    }
};

window.updateLeadStatus = async (id, status) => {
    const { error } = await window.db.from('leads').update({ status }).eq('id', id);
    if (error) alert("Status Update Failed: " + error.message);
    fetchLeads();
};

window.deleteLead = async (id) => {
    if (!confirm("Remove this lead record?")) return;
    const { error } = await window.db.from('leads').delete().eq('id', id);
    fetchLeads();
};

// Baker Management
window.openBakerModal = () => {
    currentBakerId = null;
    document.getElementById('edit-form').reset();
    document.getElementById('product-list').innerHTML = '';
    document.querySelectorAll('.purity-badge-check').forEach(cb => cb.checked = false);
    document.getElementById('baker-phone-input').value = '';
    document.getElementById('baker-available-input').checked = true;
    
    const imgPreview = document.querySelector('#logo-dropzone img');
    const imgPlaceholder = document.querySelector('#logo-dropzone .placeholder-icon');
    if (imgPreview) imgPreview.classList.add('hidden');
    if (imgPlaceholder) imgPlaceholder.classList.remove('hidden');
    
    document.getElementById('modal-title').textContent = 'Add New Artist';
    document.getElementById('edit-modal').classList.add('active');
    addProductRow();
};

window.closeModal = () => {
    document.getElementById('edit-modal').classList.remove('active');
    currentBakerId = null;
};

window.editBaker = async (id) => {
    let { data, error } = await window.db.from('bakers').select('*').eq('id', id).single();
    if (error) {
        const res = await window.db.from('bakers').select('*').eq('ID', id).single();
        data = res.data;
        error = res.error;
    }
    
    if (error) return alert("Artisan Not Found: " + error.message);
    
    currentBakerId = id;
    document.getElementById('baker-name-input').value = data.name || '';
    document.getElementById('baker-loc-input').value = data.loc || '';
    document.getElementById('baker-bio-input').value = data.about || '';
    document.getElementById('baker-phone-input').value = data.phone || '';
    document.getElementById('baker-tier-input').value = data.badge_tier || data.tier || 'none';
    document.getElementById('baker-available-input').checked = data.is_available !== false;
    
    const bData = window.utils ? window.utils.safeParse(data.purity_badges) : [];
    document.querySelectorAll('.purity-badge-check').forEach(cb => {
        cb.checked = bData.includes(cb.value);
    });

    const imgPreview = document.querySelector('#logo-dropzone img');
    const imgPlaceholder = document.querySelector('#logo-dropzone .placeholder-icon');
    if (imgPreview) {
        imgPreview.src = data.logo_key || '';
        imgPreview.classList.remove('hidden');
    }
    if (imgPlaceholder) imgPlaceholder.classList.add('hidden');
    
    document.getElementById('product-list').innerHTML = '';
    const products = window.utils ? window.utils.safeParse(data.products) : [];
    if (products.length > 0) products.forEach(p => addProductRow(p));
    else addProductRow();
    
    document.getElementById('modal-title').textContent = 'Edit Artist Profile';
    document.getElementById('edit-modal').classList.add('active');
    refreshIcons();
};

// Product Catalog Management
window.addProductRow = (p = {}) => {
    const list = document.getElementById('product-list');
    const row = document.createElement('div');
    row.className = 'product-row bg-gray-50 p-6 rounded-[30px] border border-transparent hover:border-[#C5A059]/20 transition-all flex gap-6 items-center group';
    row.innerHTML = `
        <div class="w-16 h-16 rounded-2xl bg-white shadow-sm flex-shrink-0 overflow-hidden relative cursor-pointer" onclick="this.nextElementSibling.click()">
            <img src="${p.image || 'https://via.placeholder.com/100'}" class="w-full h-full object-cover product-img">
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <i data-lucide="camera" class="w-4 h-4 text-white"></i>
            </div>
        </div>
        <input type="file" class="hidden product-file-input" accept="image/*" onchange="window.handleProductImg(this)">
        <div class="flex-1 grid grid-cols-2 gap-4">
            <input type="text" placeholder="Item Name" class="product-name bg-white border-0 rounded-xl px-4 py-3 text-[11px] font-bold uppercase tracking-widest focus:ring-1 focus:ring-[#C5A059]" value="${p.name || ''}">
            <input type="text" placeholder="Price (₹)" class="product-price bg-white border-0 rounded-xl px-4 py-3 text-[11px] font-bold uppercase tracking-widest focus:ring-1 focus:ring-[#C5A059]" value="${p.price || ''}">
        </div>
        <button type="button" onclick="this.parentElement.remove()" class="p-3 text-gray-300 hover:text-red-500 transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
    `;
    list.appendChild(row);
    refreshIcons();
};

window.handleProductImg = (input) => {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = input.previousElementSibling.querySelector('.product-img');
            if (img) img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
};

async function fetchBakers() {
    const grid = document.getElementById('admin-baker-grid');
    if (!grid) return;
    
    const { data, error } = await window.db.from('bakers').select('*');
    if (error) return console.error(error);
    
    if (!data || data.length === 0) {
        grid.innerHTML = '<div class="col-span-full py-20 text-center text-gray-300 italic text-sm">No artists yet.</div>';
        return;
    }

    grid.innerHTML = data.map(b => {
        const id = b.id || b.ID;
        const tier = (b.badge_tier || b.tier || 'none').toLowerCase();
        
        let badgeImg = 'elite-badge.png.png';
        if (tier === 'bronze') badgeImg = 'bronze-badge.png.png';
        if (tier === 'silver') badgeImg = 'silver-badge.png.png';
        if (tier === 'gold') badgeImg = 'elite-badge.png.png';

        return `
        <div class="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all group relative">
            <div class="flex items-center gap-6 mb-8">
                <div class="w-20 h-20 rounded-full border-2 border-gray-50 p-1 relative">
                    <img src="${b.logo_key || 'logo.jpeg'}" class="w-full h-full object-cover rounded-full">
                    ${tier !== 'none' ? `
                    <div class="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full p-0.5 shadow-md">
                        <img src="${badgeImg}" class="w-full h-full object-contain rounded-full">
                    </div>
                    ` : ''}
                </div>
                <div>
                    <h3 class="serif text-2xl font-bold">${b.name}</h3>
                    <div class="flex items-center gap-2">
                        <span class="w-1.5 h-1.5 rounded-full ${b.is_available !== false ? 'bg-green-500' : 'bg-gray-300'}"></span>
                        <p class="text-[9px] font-bold uppercase tracking-widest text-gray-400">${b.is_available !== false ? 'Accepting Orders' : 'Fully Booked'}</p>
                    </div>
                </div>
            </div>
            <div class="flex flex-col gap-2">
                <button onclick="window.copyBakerLink('${b.name}', '${id}')" class="w-full py-4 bg-[#FAF7F2] text-[#C5A059] rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-[#C5A059] hover:text-white transition-all flex items-center justify-center gap-2">
                    <i data-lucide="link" class="w-3 h-3"></i> Share Link
                </button>
                <div class="flex gap-2">
                    <button onclick="window.editBaker('${id}')" class="flex-1 py-4 bg-gray-50 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-[#C5A059] hover:text-white transition-all">Edit Profile</button>
                    <button onclick="window.deleteBaker('${id}')" class="p-4 bg-gray-50 rounded-full text-red-400 hover:bg-red-400 hover:text-white transition-all"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </div>
        </div>
    `}).join('');
    refreshIcons();
}

window.copyBakerLink = (name, id) => {
    const slug = String(name).toLowerCase().trim().replace(/\s+/g, '-');
    const url = `${window.location.origin}/?baker=${slug}`;
    navigator.clipboard.writeText(url).then(() => {
        window.showToast("Link Copied! 🔗");
    });
};

window.deleteBaker = async (id) => {
    if (!confirm("Permanently remove this artist?")) return;
    const { error } = await window.db.from('bakers').delete().eq('id', id);
    if (error) await window.db.from('bakers').delete().eq('ID', id);
    fetchBakers();
};

// Festival Management
window.openFestivalModal = () => {
    currentFestId = null;
    document.getElementById('fest-form').reset();
    const festImgPreview = document.querySelector('#fest-dropzone img');
    const festImgPlaceholder = document.querySelector('#fest-dropzone .fest-placeholder-icon');
    if (festImgPreview) festImgPreview.classList.add('hidden');
    if (festImgPlaceholder) festImgPlaceholder.classList.remove('hidden');
    document.getElementById('fest-modal-title').textContent = 'Design Festival Card';
    document.getElementById('festival-modal').classList.add('active');
};

window.closeFestivalModal = () => {
    document.getElementById('festival-modal').classList.remove('active');
    currentFestId = null;
};

window.editFestival = async (id) => {
    let { data, error } = await window.db.from('festivals').select('*').eq('id', id).single();
    if (error) {
        const res = await window.db.from('festivals').select('*').eq('ID', id).single();
        data = res.data;
        error = res.error;
    }
    
    if (error) return alert("Festival Not Found: " + error.message);
    
    currentFestId = id;
    document.getElementById('fest-title-input').value = data.title;
    document.getElementById('fest-date-input').value = data.event_date;
    document.getElementById('fest-desc-input').value = data.description || '';
    
    const festImgPreview = document.querySelector('#fest-dropzone img');
    const festImgPlaceholder = document.querySelector('#fest-dropzone .fest-placeholder-icon');
    if (festImgPreview) {
        festImgPreview.src = data.image_url || '';
        festImgPreview.classList.remove('hidden');
    }
    if (festImgPlaceholder) festImgPlaceholder.classList.add('hidden');
    
    document.getElementById('fest-modal-title').textContent = 'Edit Festival';
    document.getElementById('festival-modal').classList.add('active');
};

async function fetchFestivals() {
    const grid = document.getElementById('admin-festival-grid');
    if (!grid) return;
    
    const { data, error } = await window.db.from('festivals').select('*');
    if (error) return console.error(error);
    
    if (!data || data.length === 0) {
        grid.innerHTML = '<div class="col-span-full py-20 text-center text-gray-300 italic text-sm">No festivals planned yet.</div>';
        return;
    }

    grid.innerHTML = data.map(f => {
        const festId = f.id || f.ID;
        return `
        <div class="bg-white rounded-[40px] border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all group">
            <div class="aspect-video w-full bg-gray-50 relative">
                <img src="${f.image_url || 'https://via.placeholder.com/600x400'}" class="w-full h-full object-cover">
                <div class="absolute top-4 right-4 bg-white px-4 py-2 rounded-full text-[9px] font-bold uppercase tracking-widest shadow-sm">
                    ${f.event_date}
                </div>
            </div>
            <div class="p-8">
                <h3 class="serif text-2xl font-bold mb-4">${f.title}</h3>
                <div class="flex gap-2">
                    <button onclick="editFestival('${festId}')" class="flex-1 py-4 bg-gray-50 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-[#C5A059] hover:text-white transition-all">Edit Event</button>
                    <button onclick="deleteFestival('${festId}')" class="p-4 bg-gray-50 rounded-full text-red-400 hover:bg-red-400 hover:text-white transition-all"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </div>
        </div>
    `}).join('');
    refreshIcons();
}

window.deleteFestival = async (id) => {
    if (!confirm("Permanently remove this festival?")) return;
    let { error } = await window.db.from('festivals').delete().eq('id', id);
    if (error) await window.db.from('festivals').delete().eq('ID', id);
    fetchFestivals();
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    fetchBakers();
    fetchFestivals();

    const logoDropzone = document.getElementById('logo-dropzone');
    const logoInput = document.getElementById('logo-file-input');
    if (logoDropzone && logoInput) {
        logoDropzone.onclick = () => logoInput.click();
        logoInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                bakerFile = file;
                const reader = new FileReader();
                reader.onload = (re) => {
                    const img = logoDropzone.querySelector('img');
                    const icon = logoDropzone.querySelector('.placeholder-icon');
                    if (img) { img.src = re.target.result; img.classList.remove('hidden'); }
                    if (icon) icon.classList.add('hidden');
                };
                reader.readAsDataURL(file);
            }
        };
    }

    const editForm = document.getElementById('edit-form');
    if (editForm) {
        editForm.onsubmit = async (e) => {
            e.preventDefault();
            const btn = document.getElementById('save-baker-btn');
            const originalText = btn.textContent;
            btn.textContent = 'Publishing...';

            try {
                const imgEl = document.querySelector('#logo-dropzone img');
                let logoUrl = imgEl ? imgEl.src : '';
                
                if (bakerFile) {
                    const path = `profiles/baker_${Date.now()}.png`;
                    const { error: upErr } = await window.db.storage.from(STORAGE_BUCKET).upload(path, bakerFile);
                    if (upErr) throw upErr;
                    const { data: { publicUrl } } = window.db.storage.from(STORAGE_BUCKET).getPublicUrl(path);
                    logoUrl = publicUrl;
                }

                const products = [];
                document.querySelectorAll('.product-row').forEach(row => {
                    const nameInput = row.querySelector('.product-name');
                    const priceInput = row.querySelector('.product-price');
                    const imgEl = row.querySelector('.product-img');
                    if (nameInput && nameInput.value && priceInput && priceInput.value) {
                        products.push({ name: nameInput.value, price: priceInput.value, image: imgEl ? imgEl.src : '' });
                    }
                });

                const payload = {
                    name: document.getElementById('baker-name-input').value,
                    loc: document.getElementById('baker-loc-input').value,
                    about: document.getElementById('baker-bio-input').value,
                    phone: document.getElementById('baker-phone-input').value, // Saved privately
                    badge_tier: document.getElementById('baker-tier-input').value,
                    logo_key: logoUrl,
                    products: JSON.stringify(products),
                    purity_badges: JSON.stringify(Array.from(document.querySelectorAll('.purity-badge-check:checked')).map(cb => cb.value)),
                    is_available: document.getElementById('baker-available-input').checked,
                    is_verified: document.getElementById('baker-tier-input').value !== 'none'
                };

                const { data: bakerSample } = await window.db.from('bakers').select('*').limit(1);
                const bakerIdCol = (bakerSample && bakerSample[0] && bakerSample[0].ID) ? 'ID' : 'id';

                const { error } = await window.db.from('bakers').upsert([
                    currentBakerId ? { [bakerIdCol]: currentBakerId, ...payload } : payload
                ]);
                if (error) throw error;

                btn.textContent = "✓ Published";
                setTimeout(() => {
                    window.closeModal();
                    fetchBakers();
                }, 800);
            } catch (err) { alert("Publication Failed: " + err.message); }
            finally { setTimeout(() => btn.textContent = originalText, 1000); }
        };
    }

    // Festival Logic...
    const festDropzone = document.getElementById('fest-dropzone');
    const festInput = document.getElementById('fest-file-input');
    if (festDropzone && festInput) {
        festDropzone.onclick = () => festInput.click();
        festInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                festFile = file;
                const reader = new FileReader();
                reader.onload = (re) => {
                    const img = festDropzone.querySelector('img');
                    const icon = festDropzone.querySelector('.fest-placeholder-icon');
                    if (img) { img.src = re.target.result; img.classList.remove('hidden'); }
                    if (icon) icon.classList.add('hidden');
                };
                reader.readAsDataURL(file);
            }
        };
    }
    const festForm = document.getElementById('fest-form');
    if (festForm) {
        festForm.onsubmit = async (e) => {
            e.preventDefault();
            const btn = festForm.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.textContent = 'Syncing Event...';
            try {
                const imgEl = document.querySelector('#fest-dropzone img');
                let imageUrl = imgEl ? imgEl.src : '';
                if (festFile) {
                    const path = `festivals/event_${Date.now()}.png`;
                    const { error: upErr } = await window.db.storage.from(STORAGE_BUCKET).upload(path, festFile);
                    if (upErr) throw upErr;
                    const { data: { publicUrl } } = window.db.storage.from(STORAGE_BUCKET).getPublicUrl(path);
                    imageUrl = publicUrl;
                }
                const payload = {
                    title: document.getElementById('fest-title-input').value,
                    event_date: document.getElementById('fest-date-input').value,
                    description: document.getElementById('fest-desc-input').value,
                    image_url: imageUrl,
                    is_active: true
                };
                const { data: festSample } = await window.db.from('festivals').select('*').limit(1);
                const festIdCol = (festSample && festSample[0] && festSample[0].ID) ? 'ID' : 'id';
                const { error } = await window.db.from('festivals').upsert([
                    currentFestId ? { [festIdCol]: currentFestId, ...payload } : payload
                ]);
                if (error) throw error;
                btn.textContent = "✓ Event Live";
                setTimeout(() => { window.closeFestivalModal(); fetchFestivals(); }, 800);
            } catch (err) { alert("Publication Failed: " + err.message); }
            finally { setTimeout(() => btn.textContent = originalText, 1000); }
        };
    }

    refreshIcons();
});
