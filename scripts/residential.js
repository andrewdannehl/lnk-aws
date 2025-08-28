document.addEventListener('DOMContentLoaded', function () {
    const addressInput = document.querySelector('#address');
    const addressSuggestions = document.querySelector('#addressSuggestions');
    const priceInput = document.querySelector('#price');
    const sqFtInput = document.querySelector('#sqFt');
    const form = document.querySelector('#residentialForm');
    const queryMessage = document.getElementById('queryMessage');
    const pricePerSqFtInput = document.querySelector('#pricePerSqFt');

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

    // API Gateway base URL - matches your existing newConstruction.js setup
    const API_BASE = 'https://q2g27tp299.execute-api.us-east-2.amazonaws.com';

    let debounceTimer;

    // Function to update suggestions
    function updateSuggestions(matches) {
        if (!matches || matches.length === 0) {
            addressSuggestions.style.display = 'none';
            return;
        }

        addressSuggestions.innerHTML = matches.map(address => `
            <div class="suggestion-item">${address}</div>
        `).join('');
        
        addressSuggestions.style.display = 'block';
    }

    // Handle input changes with debounce
    addressInput.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        const input = this.value;
        
        if (input.length < 2) {
            addressSuggestions.style.display = 'none';
            return;
        }

        debounceTimer = setTimeout(() => {
            // Fetch matching addresses from the server
            fetch(`${API_BASE}/query/address?search=${encodeURIComponent(input)}`)
                .then(res => {
                    if (!res.ok) {
                        throw new Error(`HTTP error! status: ${res.status}`);
                    }
                    return res.json();
                })
                .then(data => {
                    if (!data || !data.addresses) {
                        throw new Error('Invalid response format');
                    }
                    updateSuggestions(data.addresses);
                })
                .catch(err => {
                    console.error("Error searching addresses:", err);
                    queryMessage.textContent = 'Failed to search addresses. Please try again.';
                    addressSuggestions.style.display = 'none';
                });
        }, 300);
    });

    // Handle suggestion clicks
    addressSuggestions.addEventListener('click', function(e) {
        const item = e.target.closest('.suggestion-item');
        if (!item) return;

        const selectedAddress = item.textContent;
        addressInput.value = selectedAddress;
        addressSuggestions.style.display = 'none';

        fetch(`${API_BASE}/query/property?address=${encodeURIComponent(selectedAddress)}`)
            .then(res => res.json())
            .then(data => {
                if (data.properties && data.properties[0]) {
                    const property = data.properties[0];
                    priceInput.value = formatPrice(property.price);
                    sqFtInput.value = formatSqFt(property.sqFt);
                    calculateAndDisplayPricePerSqFt();
                } else {
                    throw new Error('No property data found');
                }
            })
            .catch(err => {
                console.error("Error loading property:", err);
                queryMessage.textContent = 'Failed to load property details. Please try again later.';
            });
    });

    if (form) {
        form.addEventListener('submit', async function (event) {
            event.preventDefault();

            const formData = new FormData(form);
            const raw = Object.fromEntries(formData.entries());

            // Adjust min/max values based on subject property
            const priceNum = parseFloat(raw.price.replace(/[^0-9.-]+/g, ''));
            const sqFtNum = parseFloat(raw.sqFt.replace(/[^0-9.-]+/g, ''));

            if (isNaN(priceNum) || isNaN(sqFtNum) || sqFtNum === 0) {
                queryMessage.textContent = 'Please ensure price and square footage are valid numbers';
                return;
            }

            const minSqFtAdj = sqFtNum + parseFloat(raw.minSqFt);
            const maxSqFtAdj = sqFtNum + parseFloat(raw.maxSqFt);

            const subjectPricePerSF = priceNum / sqFtNum;
            const minPricePerSFAdj = subjectPricePerSF + parseFloat(raw.minPricePerSF);
            const maxPricePerSFAdj = subjectPricePerSF + parseFloat(raw.maxPricePerSF);

            if (isNaN(minPricePerSFAdj) || isNaN(maxPricePerSFAdj)) {
                queryMessage.textContent = 'Error calculating price per square foot ranges';
                return;
            }

            const data = {
                address: raw.address,
                minPricePerSF: minPricePerSFAdj,
                maxPricePerSF: maxPricePerSFAdj,
                minSqFt: minSqFtAdj,
                maxSqFt: maxSqFtAdj,
                soldWithin: parseInt(raw.soldWithin),
                builtWithin: parseInt(raw.builtWithin),
                distance: parseFloat(raw.distance)
            };

            console.log('Payload sent to Lambda:', data);

            try {
                const response = await fetch(
                    `${API_BASE}/query/residential`,
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

                // Render results table
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

// Sorting function - matches your existing implementation
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
