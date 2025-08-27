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
  try {
    parsedBody = JSON.parse(event.body);
  } catch (err) {
    console.error("Failed to parse event.body", event.body);
    return corsResponse(400, { error: "Invalid JSON in request body" });
  }
  console.log("Parsed body:", parsedBody);
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
    // ...existing code for other paths...

    console.log("Executing query:", query, "with params:", queryParams);
    const [rows] = await connection.execute(query, queryParams);
    console.log("Query result rows:", rows);

    await connection.end();

    return corsResponse(200, {
       properties: rows.map(row => ({
        ...row,
        dateSoldFormatted: row.dateSoldFormatted || null
      })) });
  } catch (error) {
    console.error("Caught error:", error);
    if (connection) await connection.end();
    return corsResponse(500, { error: error.message });
  }
};