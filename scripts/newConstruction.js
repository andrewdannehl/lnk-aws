document.addEventListener('DOMContentLoaded', function () {
    const queryForm = document.getElementById('newConstructionForm');
    const queryMessage = document.getElementById('queryMessage');
    const priceInput = document.getElementById('price');
    const sqFtInput = document.getElementById('sqFt');
    const pricePerSqFtInput = document.getElementById('pricePerSqFt');

    // Formatting functions
    function formatPrice(price) {
        if (!price) return '';
        const numPrice = parseFloat(price.toString().replace(/[^0-9.-]+/g, ''));
        if (isNaN(numPrice)) return '';
        return `$${Math.round(numPrice).toLocaleString()}`;
    }

    function formatSqFt(sqFt) {
        if (!sqFt) return '';
        const numSqFt = parseFloat(sqFt.toString().replace(/[^0-9.-]+/g, ''));
        if (isNaN(numSqFt)) return '';
        return numSqFt >= 1000 ? numSqFt.toLocaleString() : numSqFt.toString();
    }

    // Calculate $/SF when price or sqFt changes
    function calculateAndDisplayPricePerSqFt() {
        const price = parseFloat(priceInput.value.replace(/[^0-9.-]+/g, ''));
        const sqFt = parseFloat(sqFtInput.value.replace(/[^0-9.-]+/g, ''));
        
        if (!isNaN(price) && !isNaN(sqFt) && sqFt > 0) {
            const pricePerSqFt = price / sqFt;
            pricePerSqFtInput.value = `$${pricePerSqFt.toFixed(2)}`;
        } else {
            pricePerSqFtInput.value = '';
        }
    }

    // Format inputs on change
    priceInput.addEventListener('input', function(e) {
        const rawValue = e.target.value.replace(/[^0-9.-]+/g, '');
        e.target.value = formatPrice(rawValue);
        calculateAndDisplayPricePerSqFt();
    });

    sqFtInput.addEventListener('input', function(e) {
        const rawValue = e.target.value.replace(/[^0-9.-]+/g, '');
        e.target.value = formatSqFt(rawValue);
        calculateAndDisplayPricePerSqFt();
    });

    if (queryForm) {
        queryForm.addEventListener('submit', async function (event) {
            event.preventDefault();

            const formData = new FormData(queryForm);
            const raw = Object.fromEntries(formData.entries());

            // ---- Adjust min/max values based on subject property ----
            const priceNum = parseFloat(raw.price.replace(/[^0-9.-]+/g, ''));
            const sqFtNum = parseFloat(raw.sqFt.replace(/[^0-9.-]+/g, ''));
            
            // Only calculate adjustments if we have valid base numbers
            let minPricePerSFAdj = null;
            let maxPricePerSFAdj = null;
            if (priceNum > 0 && sqFtNum > 0) {
                const subjectPricePerSF = priceNum / sqFtNum;
                const minPricePerSFDelta = parseFloat(raw.minPricePerSF);
                const maxPricePerSFDelta = parseFloat(raw.maxPricePerSF);
                minPricePerSFAdj = subjectPricePerSF + minPricePerSFDelta;
                maxPricePerSFAdj = subjectPricePerSF + maxPricePerSFDelta;
            }

            // Handle square footage adjustments
            const minSqFtDelta = parseFloat(raw.minSqFt);
            const maxSqFtDelta = parseFloat(raw.maxSqFt);
            const minSqFtAdj = sqFtNum + minSqFtDelta;
            const maxSqFtAdj = sqFtNum + maxSqFtDelta;

            const data = {
                minPricePerSF: minPricePerSFAdj,
                maxPricePerSF: maxPricePerSFAdj,
                minSqFt: minSqFtAdj > 0 ? minSqFtAdj : 0,  // Ensure we don't go below 0
                maxSqFt: maxSqFtAdj > 0 ? maxSqFtAdj : 0,  // Ensure we don't go below 0
                soldWithin: parseInt(raw.soldWithin),
                builtWithin: parseInt(raw.builtWithin)
            };

            console.log('Payload sent to Lambda:', data);

            try {
                const response = await fetch(
                    'https://q2g27tp299.execute-api.us-east-2.amazonaws.com/query/newConstruction',
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    }
                );

                const rawText = await response.text();
                let result;
                try {
                    result = JSON.parse(rawText);
                } catch (err) {
                    queryMessage.textContent = 'Failed to parse server response.';
                    return;
                }

                if (!response.ok) {
                    queryMessage.textContent = result.error || 'Query failed.';
                    return;
                }

                queryMessage.textContent = 'Query successful!';

                // ---- Render results table ----
                if (result.properties && Array.isArray(result.properties)) {
                    const tableHTML = `
                        <table id="resultsTable" style="width:100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background-color: #ddd;">
                                    <th onclick="sortTable(0)">Address <span class="sort-icon" data-col="0"></span></th>
                                    <th onclick="sortTable(1)">Sale Date <span class="sort-icon" data-col="1"></span></th>
                                    <th onclick="sortTable(2)">Improve Type <span class="sort-icon" data-col="2"></span></th>
                                    <th onclick="sortTable(3)">Year Built <span class="sort-icon" data-col="3"></span></th>
                                    <th onclick="sortTable(4)">SqFt <span class="sort-icon" data-col="4"></span></th>
                                    <th onclick="sortTable(5)">TAV ($) <span class="sort-icon" data-col="5"></span></th>
                                    <th onclick="sortTable(6)">Price ($) <span class="sort-icon" data-col="6"></span></th>
                                    <th onclick="sortTable(7)">$/SF <span class="sort-icon" data-col="7"></span></th>
                                </tr>
                            </thead>
                            <tbody>
                                ${result.properties.map(p => `
                                    <tr>
                                        <td>${p.address}</td>
                                        <td>${p.dateSoldFormatted || ''}</td>
                                        <td>${p.improveType || ''}</td>
                                        <td>${p.yrBuilt || ''}</td>
                                        <td>${Number(p.sqFt).toLocaleString()}</td>
                                        <td>$${Number(p.TAV).toLocaleString()}</td>
                                        <td>$${Number(p.price).toLocaleString()}</td>
                                        <td>$${
                                            !isNaN(parseFloat(p.dollarsPerSF))
                                                ? parseFloat(p.dollarsPerSF).toFixed(2)
                                                : ''
                                        }</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `;
                    document.getElementById('resultsContainer').innerHTML = tableHTML;
                }
            } catch (error) {
                console.error(error);
                queryMessage.textContent = 'An error occurred. Please try again later.';
            }
        });
    }
});

// ---- Sorting function ----
let sortDirection = {};
window.sortTable = function (colIndex) {
    const table = document.getElementById('resultsTable');
    if (!table) return;

    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const isNumeric = colIndex !== 0 && colIndex !== 3;
    const direction = sortDirection[colIndex] === 'asc' ? 'desc' : 'asc';
    sortDirection[colIndex] = direction;

    rows.sort((a, b) => {
        const aText = a.children[colIndex].textContent.trim().replace(/[$,]/g, '');
        const bText = b.children[colIndex].textContent.trim().replace(/[$,]/g, '');
        const aVal = isNumeric ? parseFloat(aText) : aText.toLowerCase();
        const bVal = isNumeric ? parseFloat(bText) : bText.toLowerCase();

        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    rows.forEach(row => tbody.appendChild(row));

    document.querySelectorAll('.sort-icon').forEach(span => { span.textContent = ''; });
    const iconSpan = document.querySelector(`.sort-icon[data-col="${colIndex}"]`);
    if (iconSpan) {
        iconSpan.textContent = direction === 'asc' ? '▲' : '▼';
    }
};
