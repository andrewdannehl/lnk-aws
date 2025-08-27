document.addEventListener('DOMContentLoaded', function() {
    const queryForm = document.getElementById('newConstructionForm');
    const queryMessage = document.getElementById('queryMessage');

    if (queryForm) {
        queryForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const formData = new FormData(queryForm);
            const raw = Object.fromEntries(formData.entries());

            // Parse and calculate derived values
            const priceNum = parseFloat(raw.price);
            const sqFtNum = parseFloat((raw.sqFt || '').toString().replace(/[^0-9.]/g, ''));
            const subjectPricePerSF = priceNum / sqFtNum;
            const minPricePerSF = parseFloat(raw.minPricePerSF) + subjectPricePerSF;
            const maxPricePerSF = parseFloat(raw.maxPricePerSF) + subjectPricePerSF;
            const minSqFt = parseFloat(raw.minSqFt) + sqFtNum;
            const maxSqFt = parseFloat(raw.maxSqFt) + sqFtNum;
            const soldWithin = parseInt(raw.soldWithin);
            const builtWithin = parseInt(raw.builtWithin);

            const data = {
                minPricePerSF,
                maxPricePerSF,
                minSqFt,
                maxSqFt,
                soldWithin,
                builtWithin
            };
            console.log('Payload sent to Lambda:', data);

            try {
                const response = await fetch('https://q2g27tp299.execute-api.us-east-2.amazonaws.com/query/newConstruction', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (response.ok) {
                    const result = await response.json();
                    queryMessage.textContent = 'Query successful!';
                    // Render results table with formatted date
                    if (result.properties && Array.isArray(result.properties)) {
                        const tableHTML = `
                            <table id="resultsTable" style="width:100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="background-color: #ddd;">
                                        <th>Address</th>
                                        <th>Price ($)</th>
                                        <th>SqFt</th>
                                        <th>Sale Date</th>
                                        <th>$/SF</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${result.properties.map(p => `
                                        <tr>
                                            <td>${p.address}</td>
                                            <td>$${Number(p.price).toLocaleString()}</td>
                                            <td>${Number(p.sqFt).toLocaleString()}</td>
                                            <td>${p.dateSoldFormatted || ''}</td>
                                            <td>$${
                                                !isNaN(parseFloat(p.dollarsPerSF))
                                                    ? parseFloat(p.dollarsPerSF).toLocaleString()
                                                    : p.dollarsPerSF || ''
                                                }
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        `;
                        document.getElementById('resultsContainer').innerHTML = tableHTML;
                    }
                } else {
                    const errorData = await response.json();
                    queryMessage.textContent = errorData.message || 'Query failed.';
                }
            } catch (error) {
                queryMessage.textContent = 'An error occurred. Please try again later.';
            }
        });
    }
});