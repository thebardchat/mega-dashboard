/* logistics.js — Logistics / SRM quoting */
// =============================================================================
// LOGISTICS QUOTING
// =============================================================================

let allProducts = [];

async function loadLogisticsProducts() {
    try {
        const resp = await fetch('http://127.0.0.1:5001/api/products');
        allProducts = await resp.json();

        const select = document.getElementById('materialSelect');
        allProducts.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.name;
            select.appendChild(opt);
        });

        document.getElementById('logistics-status').classList.add('online');
        calculateQuote();
    } catch (e) {
        console.error('Logistics API offline:', e);
        document.getElementById('logistics-status').classList.add('error');
        document.getElementById('q-breakdown').textContent = 'Logistics API offline';
    }
}

async function calculateQuote() {
    const dest = document.getElementById('deliveryDest').value;
    const material = document.getElementById('materialSelect').value;
    const tons = parseFloat(document.getElementById('loadTons').value) || 0;

    if (tons <= 0) return;

    try {
        const url = `http://127.0.0.1:5001/api/quote?destination=${dest}&tons=${tons}&material_id=${material}`;
        const resp = await fetch(url);
        const data = await resp.json();

        if (resp.ok) {
            document.getElementById('q-rtt').textContent = `${data.rtt_minutes} min`;
            document.getElementById('q-rate').textContent = `$${data.haul_rate_per_ton.toFixed(2)}/ton`;
            document.getElementById('q-total').textContent = `$${data.total_job_price.toFixed(2)}`;
            document.getElementById('q-breakdown').textContent = `${data.plant} - ${data.breakdown || ''}`;
        } else {
            document.getElementById('q-breakdown').textContent = data.error || 'Quote error';
        }
    } catch (e) {
        document.getElementById('q-breakdown').textContent = 'API connection failed';
    }
}

