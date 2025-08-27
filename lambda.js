const mysql = require('mysql2/promise');

const corsResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST",
    "Access-Control-Allow-Credentials": "true"
  },
  body: JSON.stringify(body)
});

exports.handler = async (event) => {
  console.log("Lambda invoked", event);
  let parsedBody;
  
  // Only try to parse body for POST requests
  if (event.httpMethod === 'POST') {
    try {
      parsedBody = JSON.parse(event.body);
    } catch (err) {
      console.error("Failed to parse event.body", event.body);
      return corsResponse(400, { error: "Invalid JSON in request body" });
    }
    console.log("Parsed body:", parsedBody);
  }
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    const path = event.rawPath || event.path || '';
    let query = '';
    let queryParams = [];

    if (path.includes('newConstruction')) {
      const {
        minPricePerSF,
        maxPricePerSF,
        minSqFt,
        maxSqFt,
        soldWithin,
        builtWithin
      } = parsedBody;
      console.log("newConstruction params raw:", parsedBody);
      console.log("minPricePerSF:", minPricePerSF);
      console.log("maxPricePerSF:", maxPricePerSF);
      console.log("minSF:", minSqFt);
      console.log("maxSF:", maxSqFt);
      console.log("monthsSoldWithin:", soldWithin);
      console.log("yearsBuiltWithin:", builtWithin);

      query = `
        SELECT 
          *, 
          DATE_FORMAT(dateSold, '%m/%d/%Y') AS dateSoldFormatted
        FROM property
        WHERE 
          dollarsPerSF BETWEEN ? AND ?
          AND sqFt BETWEEN ? AND ?
          AND dateSold >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
          AND yrBuilt >= YEAR(CURDATE()) - ?
      `;
      queryParams = [
        minPricePerSF,
        maxPricePerSF,
        minSqFt,
        maxSqFt,
        soldWithin,
        builtWithin
      ];
      console.log("Final queryParams array:", queryParams);
      queryParams.forEach((param, idx) => {
        console.log(`queryParam[${idx}]:`, param, "Type:", typeof param);
      });
    }
    else if (path.includes('address')) {
      // Fetch addresses matching the search term
      const searchTerm = event.queryStringParameters?.search || '';
      if (searchTerm.length < 2) {
        return corsResponse(200, { addresses: [] });
      }
      query = 'SELECT DISTINCT address FROM property WHERE address LIKE ? ORDER BY address ASC LIMIT 10';
      queryParams = [`%${searchTerm}%`];
    } 
    else if (path.includes('property') && event.queryStringParameters?.address) {
      // Fetch property details for a specific address
      query = 'SELECT price, sqFt FROM property WHERE address = ? LIMIT 1';
      queryParams = [event.queryStringParameters.address];
    }
    else if (path.includes('residential')) {
      const {
        address,
        minPricePerSF,
        maxPricePerSF,
        minSqFt,
        maxSqFt,
        soldWithin,
        builtWithin,
        distance // Not used yet, but captured for future use
      } = parsedBody;

      query = `
        SELECT 
          *,
          DATE_FORMAT(dateSold, '%m/%d/%Y') AS dateSoldFormatted
        FROM property
        WHERE 
          dollarsPerSF BETWEEN ? AND ?
          AND sqFt BETWEEN ? AND ?
          AND dateSold >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
          AND yrBuilt >= YEAR(CURDATE()) - ?
      `;
      queryParams = [
        minPricePerSF,
        maxPricePerSF,
        minSqFt,
        maxSqFt,
        soldWithin,
        builtWithin
      ];
    }
    else

    console.log("Executing query:", query, "with params:", queryParams);
    const [rows] = await connection.execute(query, queryParams);
    console.log("Query result rows:", rows);

    await connection.end();

    // Format response based on the endpoint
    if (path.includes('address')) {
      return corsResponse(200, { addresses: rows.map(row => row.address) });
    } else {
      return corsResponse(200, {
        properties: rows.map(row => ({
          ...row,
          dateSoldFormatted: row.dateSoldFormatted || null
        }))
      });
    }
  } catch (error) {
    console.error("Caught error:", error);
    if (connection) await connection.end();
    return corsResponse(500, { error: error.message });
  }
};