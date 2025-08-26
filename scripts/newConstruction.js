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
            const lotNum = parseFloat(raw.lot);
            const subjectPricePerSF = priceNum / sqFtNum;

            const pricePerSFmin = parseFloat(raw.minPricePerSF) + subjectPricePerSF;
            const pricePerSFmax = parseFloat(raw.maxPricePerSF) + subjectPricePerSF;
            const minSF = parseFloat(raw.minSF) + sqFtNum;
            const maxSF = parseFloat(raw.maxSF) + sqFtNum;
            const monthsSoldWithin = parseInt(raw.monthsSoldWithin);
            const yearsBuiltWithin = parseInt(raw.yearsBuiltWithin);

            // Build the payload for Lambda
            const data = {
                minPricePerSF: isNaN(pricePerSFmin) ? null : pricePerSFmin,
                maxPricePerSF: isNaN(pricePerSFmax) ? null : pricePerSFmax,
                minSF: isNaN(minSF) ? null : minSF,
                maxSF: isNaN(maxSF) ? null : maxSF,
                monthsSoldWithin: isNaN(monthsSoldWithin) ? null : monthsSoldWithin,
                yearsBuiltWithin: isNaN(yearsBuiltWithin) ? null : yearsBuiltWithin
            };

            try {
                const response = await fetch('https://q2g27tp299.execute-api.us-east-2.amazonaws.com/query/newConstruction', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (response.ok) {
                    const result = await response.json();
                    queryMessage.textContent = 'Query successful!';
                    // Optionally display result data
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