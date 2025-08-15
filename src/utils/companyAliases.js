// Company aliases for known variations
// This mapping helps consolidate companies that appear with different names
// Format: 'canonical_name': ['variation1', 'variation2', ...]

export const companyAliases = {
  // Consulting Companies
  'bain': ['bain company', 'bain & company', 'bain and company', 'bain co'],
  'bcg': ['boston consulting group', 'boston consulting group bcg', 'the boston consulting group'],
  'falconi': ['falconi brasil', 'falconi consultores de resultado', 'falconi consulting'],

  // Tech Giants - Global
  'amazon': ['amazon.com', 'amazon web services', 'aws', 'amazon web services aws'],
  'apple': ['apple inc', 'apple computer'],
  'google': ['alphabet', 'alphabet inc', 'google llc'],
  'ibm': ['international business machines', 'ibm corporation'],
  'meta': ['facebook', 'meta platforms', 'facebook inc'],
  'microsoft': ['microsoft corporation', 'microsoft corp'],
  'netflix': ['netflix inc', 'netflix entertainment'],
  'oracle': ['oracle corporation', 'oracle corp'],
  'salesforce': ['salesforce.com', 'salesforce inc'],
  'spotify': ['spotify technology', 'spotify ab'],
  'tesla': ['tesla inc', 'tesla motors'],
  'twitter': ['x corp', 'x', 'twitter inc'],
  'uber': ['uber technologies', 'uber technologies inc'],

  // Platforms & Services
  'airbnb': ['airbnb inc', 'airbnb.com'],
  'linkedin': ['linkedin corporation', 'linkedin corp'],
  'wellhub': ['gympass', 'wellhub formerly gympass', 'wellhub (formerly gympass)'],

  // Brazilian Companies - Financial
  'bradesco': ['banco bradesco', 'bradesco s.a.'],
  'itau': ['itaú unibanco', 'banco itaú', 'itau unibanco'],
  'nubank': ['nu pagamentos', 'nubank brasil'],
  'pag': ['pagseguro', 'pagseguro digital'],
  'santander': ['banco santander', 'santander brasil'],
  'stone': ['stone pagamentos', 'stone co'],
  'xp inc': ['xp inc', 'xp inc.', 'xp investimentos'],

  // Brazilian Companies - E-commerce & Retail
  'ifood': ['ifood delivery', 'ifood brasil'],
  'magazine': ['magazine luiza', 'magalu'],
  'mercadolivre': [
    'mercado livre', 
    'mercado libre', 
    'mercadolivre', 
    'mercado livre contratamos pessoas para democratizar o comércio', 
    'mercado livre mercado pago'
  ],

  // Brazilian Companies - Traditional Industries
  'ambev': ['ambev s.a.', 'companhia de bebidas das américas'],
  'bosch': ['bosch brasil', 'bosch brasil s.a.', 'robert bosch brasil'],
  'natura': ['natura &co', 'natura cosméticos'],
  'petrobras': ['petróleo brasileiro', 'petrobras s.a.'],
  'vale': ['vale s.a.', 'companhia vale do rio doce'],

  // Brazilian Companies - Tech & Innovation
  'neoway': ['neoway business solutions', 'neoway', 'Uma Empresa B3'],
  'qi tech': ['qi tech', 'qitech'],

  // Organizations & Others
  'endeavor': ['endeavor', 'endeavor brasil', 'endeavor global']
};

// Helper function to find canonical company name from aliases
export const findCanonicalFromAliases = (companyName, normalizeFunction) => {
  const normalized = normalizeFunction(companyName);
  
  for (const [canonical, aliases] of Object.entries(companyAliases)) {
    const normalizedCanonical = normalizeFunction(canonical);
    if (normalized === normalizedCanonical) {
      return canonical;
    }
    
    for (const alias of aliases) {
      const normalizedAlias = normalizeFunction(alias);
      if (normalized === normalizedAlias) {
        return canonical;
      }
    }
  }
  
  return null;
};