import axios from 'axios';

const COMPANIES_HOUSE_API_KEY = process.env.COMPANIES_HOUSE_API_KEY;
const COMPANIES_HOUSE_BASE_URL = 'https://api.companieshouse.gov.uk';

const authHeader = `Basic ${Buffer.from(`${COMPANIES_HOUSE_API_KEY}:`).toString('base64')}`;

export async function getCompanyDetails(companyName) {
  try {
    const searchResponse = await axios.get(`${COMPANIES_HOUSE_BASE_URL}/search/companies`, {
      headers: { 'Authorization': authHeader },
      params: { q: companyName, items_per_page: 1 }
    });

    const items = searchResponse.data.items;
    if (!items || items.length === 0) return null;

    const companyNumber = items[0].company_number;

    const profileResponse = await axios.get(`${COMPANIES_HOUSE_BASE_URL}/company/${companyNumber}`, {
      headers: { 'Authorization': authHeader }
    });

    const profile = profileResponse.data;

    let activeDirectors = [];
    try {
      const officersResponse = await axios.get(`${COMPANIES_HOUSE_BASE_URL}/company/${companyNumber}/officers`, {
        headers: { 'Authorization': authHeader }
      });
      const officers = officersResponse.data.items || [];
      activeDirectors = officers
        .filter(off => off.role === 'director' && !off.resigned_on)
        .map(off => ({
          name: off.name,
          appointed_on: off.appointed_on,
          nationality: off.nationality,
          country_of_residence: off.country_of_residence
        }));
    } catch (e) {
      console.warn('Não foi possível obter dados dos diretores.');
    }

    return {
      name: profile.company_name,
      number: profile.company_number,
      status: profile.company_status,
      type: profile.type,
      creation_date: profile.date_of_creation,
      registered_office_address: profile.registered_office_address,
      jurisdiction: profile.jurisdiction,
      active_directors: activeDirectors,
      source: 'Companies House UK',
      retrieval_timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Erro na API Companies House:', error.message);
    return null;
  }
}