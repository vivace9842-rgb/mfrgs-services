const axios = require("axios");

async function getCompanyData(companyName) {
  const url = `https://api.company-information.service.gov.uk/search/companies?q=${companyName}`;
  const response = await axios.get(url, {
    auth: { username: process.env.COMPANIES_HOUSE_API_KEY, password: "" }
  });
  return response.data;
}

module.exports = { getCompanyData };
