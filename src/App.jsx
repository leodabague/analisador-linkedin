import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Upload, BarChart3, Users, MapPin, TrendingUp, Search, FileText, Download, X, ChevronLeft, ChevronRight } from 'lucide-react';
import Papa from 'papaparse';

const LinkedInInsightsAnalyzer = () => {
  // Helper functions for company name normalization and clustering
  const normalizeCompanyName = (name) => {
    return name
      .toLowerCase()
      // Remove accents and diacritics
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      // Remove common legal suffixes
      .replace(/\b(ltda|ltd|inc|corp|corporation|sa|s\.a\.|llc|limited|group|grupo|brasil|brazil)\b/gi, '')
      // Remove common words that don't help identification
      .replace(/\b(the|a|an|e|da|do|de|das|dos)\b/gi, '')
      // Keep only letters, numbers, and spaces
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      // Collapse multiple spaces
      .replace(/\s+/g, ' ')
      .trim();
  };

  const getCompanyTokens = (name) => {
    return normalizeCompanyName(name)
      .split(' ')
      .filter(token => token.length > 1)
      .sort();
  };

  const calculateSimilarity = (name1, name2) => {
    const tokens1 = getCompanyTokens(name1);
    const tokens2 = getCompanyTokens(name2);
    
    if (tokens1.length === 0 || tokens2.length === 0) return 0;
    
    // Check for exact match after normalization
    if (tokens1.join(' ') === tokens2.join(' ')) return 1.0;
    
    // Check if one is contained in the other (like "bcg" and "boston consulting group bcg")
    const str1 = tokens1.join(' ');
    const str2 = tokens2.join(' ');
    if (str1.includes(str2) || str2.includes(str1)) {
      const shorter = str1.length < str2.length ? str1 : str2;
      const longer = str1.length >= str2.length ? str1 : str2;
      return shorter.length / longer.length;
    }
    
    // Calculate Jaccard similarity (intersection over union)
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  };

  const clusterCompanies = (companies) => {
    const clustered = new Map();
    const processed = new Set();
    
    const companyNames = Object.keys(companies);
    
    companyNames.forEach(company1 => {
      if (processed.has(company1)) return;
      
      let bestMatch = company1;
      let bestCount = companies[company1];
      const cluster = [company1];
      
      companyNames.forEach(company2 => {
        if (company1 === company2 || processed.has(company2)) return;
        
        const similarity = calculateSimilarity(company1, company2);
        
        // Consider companies similar if similarity > 0.6 or if high containment
        if (similarity > 0.6) {
          cluster.push(company2);
          // Choose the most frequent name as the canonical name
          if (companies[company2] > bestCount) {
            bestMatch = company2;
            bestCount = companies[company2];
          }
        }
      });
      
      // Mark all cluster members as processed
      cluster.forEach(name => processed.add(name));
      
      // Sum counts for the cluster
      const totalCount = cluster.reduce((sum, name) => sum + companies[name], 0);
      clustered.set(bestMatch, { count: totalCount, aliases: cluster });
    });
    
    return clustered;
  };
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');
  const [folderStructure, setFolderStructure] = useState({});
  const [selectedSubfolders, setSelectedSubfolders] = useState(new Set());
  const [folderRoot, setFolderRoot] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedCompanyPage, setSelectedCompanyPage] = useState(1);
  const [selectedRoleArea, setSelectedRoleArea] = useState('');
  const [selectedRolePage, setSelectedRolePage] = useState(1);
  const [selectedSeniority, setSelectedSeniority] = useState('');
  const [selectedSeniorityPage, setSelectedSeniorityPage] = useState(1);
  const [companiesPage, setCompaniesPage] = useState(1);

  const resetCompaniesPage = () => {
    setCompaniesPage(1);
    setSelectedCompany('');
    setSelectedCompanyPage(1);
  };
  const companyDetailsRef = useRef(null);
  const roleDetailsRef = useRef(null);
  const seniorityDetailsRef = useRef(null);

  const handleOpenSeniority = (level) => {
    setSelectedSeniority(prev => prev === level ? '' : level);
    setSelectedSeniorityPage(1);
    // Scroll após o próximo frame para garantir que o DOM esteja atualizado
    setTimeout(() => {
      if (seniorityDetailsRef.current) {
        seniorityDetailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  useEffect(() => {
    if (selectedCompany && companyDetailsRef.current) {
      companyDetailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (selectedRoleArea && roleDetailsRef.current) {
      roleDetailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedRoleArea]);

  useEffect(() => {
    if (selectedSeniority && seniorityDetailsRef.current) {
      // Duplo RAF + timeout como fallback para garantir rolagem após a transição CSS
      const el = seniorityDetailsRef.current;
      const scroll = () => el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      requestAnimationFrame(() => requestAnimationFrame(scroll));
      const t = setTimeout(scroll, 350);
      return () => clearTimeout(t);
    }
  }, [selectedSeniority]);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        setData(results.data);
        setLoading(false);
        setActiveTab('companies');
      },
      error: (error) => {
        console.error('Erro ao processar arquivo:', error);
        setLoading(false);
      }
    });
  };

  const handleFolderSelect = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      setFolderStructure({});
      setSelectedSubfolders(new Set());
      setFolderRoot('');
      return;
    }

    const csvFiles = files.filter(f => f.name.toLowerCase().endsWith('.csv'));
    if (!csvFiles.length) {
      setFolderStructure({});
      setSelectedSubfolders(new Set());
      setFolderRoot('');
      return;
    }

    const firstPath = csvFiles[0].webkitRelativePath || csvFiles[0].name;
    const firstParts = firstPath.split('/');
    setFolderRoot(firstParts[0] || '');

    const structure = {};
    csvFiles.forEach(file => {
      const rel = file.webkitRelativePath || file.name;
      const parts = rel.split('/');
      const subpath = parts.length > 2 ? parts.slice(1, -1).join('/') : '(raiz)';
      if (!structure[subpath]) structure[subpath] = [];
      structure[subpath].push(file);
    });

    setFolderStructure(structure);
    setSelectedSubfolders(new Set(Object.keys(structure)));
  };

  const toggleSubfolder = (subpath) => {
    setSelectedSubfolders(prev => {
      const next = new Set(prev);
      if (next.has(subpath)) next.delete(subpath); else next.add(subpath);
      return next;
    });
  };

  const setAllSubfolders = (checked) => {
    if (checked) {
      setSelectedSubfolders(new Set(Object.keys(folderStructure)));
    } else {
      setSelectedSubfolders(new Set());
    }
  };

  const parseCSVFile = (file) => new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data || []),
      error: (error) => reject(error)
    });
  });

  const canonicalKey = (row) => {
    const keys = Object.keys(row).sort();
    return keys.map(k => `${k}:${row[k] ?? ''}`).join('|');
  };

  const exportCSV = (filename, rows) => {
    try {
      if (!rows || rows.length === 0) return;
      const csv = Papa.unparse(rows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Erro ao exportar CSV:', e);
    }
  };

  const handleLoadSelectedCSVs = async () => {
    try {
      setLoading(true);
      const chosen = Array.from(selectedSubfolders);
      const files = chosen.flatMap(s => folderStructure[s] || []);
      const allDataArrays = await Promise.all(files.map(parseCSVFile));
      const combined = allDataArrays.flat();

      const seen = new Set();
      const uniqueRows = [];
      for (const row of combined) {
        const key = canonicalKey(row);
        if (!seen.has(key)) {
          seen.add(key);
          uniqueRows.push(row);
        }
      }

      setData(uniqueRows);
      setActiveTab('companies');
    } catch (err) {
      console.error('Erro ao carregar CSVs da pasta:', err);
    } finally {
      setLoading(false);
    }
  };

  // Extração de empresas e mapa bruto (evita retrabalho e permite clustering único)
  const companyExtraction = useMemo(() => {
    const counts = {};
    const rawMap = {};
    if (!data.length) return { counts, rawMap, companyNames: [] };

    data.forEach(person => {
      if (!person.title) return;
      const title = String(person.title || '').toLowerCase();

      const patterns = [
        /at\s+([^|,]+)/,
        /@\s*([^|,]+)/,
        /\|\s*([^|]+)$/,
        /em\s+([^|,]+)/,
        /na\s+([^|,]+)/
      ];

      let company = '';
      for (const pattern of patterns) {
        const match = title.match(pattern);
        if (match) { company = match[1].trim(); break; }
      }
      if (!company) return;

      company = company
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (company.length <= 2) return;

      counts[company] = (counts[company] || 0) + 1;
      if (!rawMap[company]) rawMap[company] = [];
      rawMap[company].push(person);
    });

    return { counts, rawMap, companyNames: Object.keys(counts) };
  }, [data]);

  // Clustering otimizado com cache e bloqueio por token
  const companyClustering = useMemo(() => {
    const { counts, companyNames } = companyExtraction;
    if (companyNames.length === 0) return { clustered: new Map(), canonicalByAlias: new Map() };

    const tokensCache = new Map();
    const normalizedCache = new Map();

    const getTokensCached = (name) => {
      if (tokensCache.has(name)) return tokensCache.get(name);
      const t = getCompanyTokens(name);
      tokensCache.set(name, t);
      return t;
    };

    const getNormalizedString = (name) => {
      if (normalizedCache.has(name)) return normalizedCache.get(name);
      const s = getTokensCached(name).join(' ');
      normalizedCache.set(name, s);
      return s;
    };

    const jaccard = (aTokens, bTokens) => {
      const aSet = new Set(aTokens);
      let intersectionSize = 0;
      for (const tok of bTokens) {
        if (aSet.has(tok)) intersectionSize++;
      }
      const unionSize = aSet.size + bTokens.length - intersectionSize;
      return unionSize === 0 ? 0 : intersectionSize / unionSize;
    };

    const isSimilar = (a, b) => {
      const aStr = getNormalizedString(a);
      const bStr = getNormalizedString(b);
      if (aStr === bStr) return true;

      if (aStr.includes(bStr) || bStr.includes(aStr)) {
        const shorter = aStr.length < bStr.length ? aStr : bStr;
        const longer = aStr.length >= bStr.length ? aStr : bStr;
        return (shorter.length / longer.length) >= 0.6;
      }

      const aTokens = getTokensCached(a);
      const bTokens = getTokensCached(b);

      // Filtro barato: sem tokens em comum -> não similar
      const aSet = new Set(aTokens);
      let share = false;
      for (const t of bTokens) { if (aSet.has(t)) { share = true; break; } }
      if (!share) return false;

      const s = jaccard(aTokens, bTokens);
      return s > 0.6;
    };

    // Índice por token para reduzir as comparações
    const tokenIndex = new Map();
    for (const name of companyNames) {
      const tokens = getTokensCached(name);
      for (const tok of tokens) {
        if (!tokenIndex.has(tok)) tokenIndex.set(tok, new Set());
        tokenIndex.get(tok).add(name);
      }
    }

    const visited = new Set();
    const clustered = new Map();
    const canonicalByAlias = new Map();

    for (const seed of companyNames) {
      if (visited.has(seed)) continue;

      let canonical = seed;
      let canonicalCount = counts[seed] || 0;
      const clusterAliases = [];
      const queue = [seed];
      visited.add(seed);

      while (queue.length) {
        const cur = queue.pop();
        clusterAliases.push(cur);

        const curTokens = getTokensCached(cur);
        const candidateSet = new Set();
        for (const tok of curTokens) {
          const set = tokenIndex.get(tok);
          if (set) { for (const nm of set) candidateSet.add(nm); }
        }

        for (const cand of candidateSet) {
          if (visited.has(cand) || cand === cur) continue;
          if (!isSimilar(cur, cand)) continue;
          visited.add(cand);
          queue.push(cand);
          const cCount = counts[cand] || 0;
          if (cCount > canonicalCount) {
            canonical = cand;
            canonicalCount = cCount;
          }
        }
      }

      const totalCount = clusterAliases.reduce((sum, nm) => sum + (counts[nm] || 0), 0);
      clustered.set(canonical, { count: totalCount, aliases: clusterAliases });
      for (const alias of clusterAliases) canonicalByAlias.set(alias, canonical);
    }

    return { clustered, canonicalByAlias };
  }, [companyExtraction]);

  // Análise de empresas com clustering otimizado
  const companyAnalysis = useMemo(() => {
    const entries = Array.from(companyClustering.clustered.entries())
      .map(([name, { count }]) => [name, count]);
    entries.sort(([,a], [,b]) => b - a);
    return entries;
  }, [companyClustering]);

  const companyPeopleMap = useMemo(() => {
    const finalMap = {};
    const { rawMap } = companyExtraction;
    const { canonicalByAlias } = companyClustering;
    const aliases = Object.keys(rawMap);
    for (const alias of aliases) {
      const canonical = canonicalByAlias.get(alias) || alias;
      if (!finalMap[canonical]) finalMap[canonical] = [];
      finalMap[canonical].push(...rawMap[alias]);
    }
    return finalMap;
  }, [companyExtraction, companyClustering]);

  const rolePeopleMap = useMemo(() => {
    const map = {};
    if (!data.length) return map;

    const areaPatterns = {
      'Technology': /\b(developer|engineer|tech|software|data|ai|machine learning|devops|frontend|backend)\b/,
      'Sales': /\b(sales|vendas|business development|bd)\b/,
      'Marketing': /\b(marketing|growth|digital marketing)\b/,
      'Product': /\b(product|produto)\b/,
      'HR/People': /\b(hr|people|human resources|recursos humanos|talent)\b/,
      'Finance': /\b(finance|financial|accounting|controller)\b/,
      'Operations': /\b(operations|ops|operational)\b/,
      'Design': /\b(design|ux|ui|designer)\b/,
      'Legal': /\b(legal|lawyer|advogado)\b/
    };

    data.forEach(person => {
      const title = String(person.title || '').toLowerCase();
      for (const [area, pattern] of Object.entries(areaPatterns)) {
        if (pattern.test(title)) {
          if (!map[area]) map[area] = [];
          map[area].push(person);
          break;
        }
      }
    });
    return map;
  }, [data]);

  const seniorityPeopleMap = useMemo(() => {
    const map = {};
    if (!data.length) return map;

    const seniorityPatterns = {
      'C-Level': /\b(ceo|cto|cfo|coo|cmo|cpo|chro|ciso)\b/,
      'Director/VP': /\b(director|vice president|vp)\b/,
      'Manager': /\b(manager|gerente|head)\b/,
      'Lead': /\blead\b/,
      'Senior': /\bsenior|sênior|sr\b/,
      'Junior': /\bjunior|jr\b/,
      'Intern': /\b(intern|estagiário|trainee)\b/
    };

    data.forEach(person => {
      const title = String(person.title || '').toLowerCase();
      for (const [level, pattern] of Object.entries(seniorityPatterns)) {
        if (pattern.test(title)) {
          if (!map[level]) map[level] = [];
          map[level].push(person);
          break;
        }
      }
    });
    return map;
  }, [data]);

  // Análise de cargos
  const roleAnalysis = useMemo(() => {
    if (!data.length) return [];
    
    const roles = {};
    const seniorities = {};
    
    data.forEach(person => {
      if (!person.title) return;
      
      const title = person.title.toLowerCase();
      
      // Detectar senioridade
      const seniorityPatterns = {
        'C-Level': /\b(ceo|cto|cfo|coo|cmo|cpo|chro|ciso)\b/,
        'Director/VP': /\b(director|vice president|vp)\b/,
        'Senior': /\bsenior|sênior|sr\b/,
        'Manager': /\b(manager|gerente|head)\b/,
        'Lead': /\blead\b/,
        'Junior': /\bjunior|jr\b/,
        'Intern': /\b(intern|estagiário|trainee)\b/
      };
      
      for (const [level, pattern] of Object.entries(seniorityPatterns)) {
        if (pattern.test(title)) {
          seniorities[level] = (seniorities[level] || 0) + 1;
          break;
        }
      }
      
      // Extrair área/função
      const areaPatterns = {
        'Technology': /\b(developer|engineer|tech|software|data|ai|machine learning|devops|frontend|backend)\b/,
        'Sales': /\b(sales|vendas|business development|bd)\b/,
        'Marketing': /\b(marketing|growth|digital marketing)\b/,
        'Product': /\b(product|produto)\b/,
        'HR/People': /\b(hr|people|human resources|recursos humanos|talent)\b/,
        'Finance': /\b(finance|financial|accounting|controller)\b/,
        'Operations': /\b(operations|ops|operational)\b/,
        'Design': /\b(design|ux|ui|designer)\b/,
        'Legal': /\b(legal|lawyer|advogado)\b/
      };
      
      for (const [area, pattern] of Object.entries(areaPatterns)) {
        if (pattern.test(title)) {
          roles[area] = (roles[area] || 0) + 1;
          break;
        }
      }
    });
    
    const seniorityOrder = ['C-Level', 'Director/VP', 'Manager', 'Lead', 'Senior', 'Junior', 'Intern'];

    return {
      roles: Object.entries(roles).sort(([,a], [,b]) => b - a),
      seniorities: seniorityOrder
        .filter(level => level in seniorities)
        .map(level => [level, seniorities[level]])
    };
  }, [data]);

  // Análise de conexões
  const connectionAnalysis = useMemo(() => {
    if (!data.length) return {};
    
    const degrees = {};
    const mutualConnections = data
      .filter(p => p.mutual_connections && p.mutual_connections > 0)
      .sort((a, b) => b.mutual_connections - a.mutual_connections)
      .slice(0, 20);
      
    const totalMutualConnections = data.reduce((sum, p) => sum + (p.mutual_connections || 0), 0);
    const avgMutualConnections = totalMutualConnections / data.length;
    
    data.forEach(person => {
      const degree = person.degree_connection || 'Unknown';
      degrees[degree] = (degrees[degree] || 0) + 1;
    });
    
    return {
      degrees: Object.entries(degrees),
      topConnectors: mutualConnections,
      avgMutualConnections: Math.round(avgMutualConnections * 10) / 10,
      totalConnections: data.length
    };
  }, [data]);

  // Análise de localização
  const locationAnalysis = useMemo(() => {
    if (!data.length) return [];
    
    const locations = {};
    
    data.forEach(person => {
      if (!person.location || person.location.trim() === '') return;
      
      const location = person.location.trim();
      locations[location] = (locations[location] || 0) + 1;
    });
    
    return Object.entries(locations)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 15);
  }, [data]);

  const renderUpload = () => (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center mb-6">
          <Upload className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Upload do CSV</h2>
          <p className="text-gray-600">Faça upload do seu arquivo CSV do LinkedIn para começar a análise</p>
        </div>
        
        <div className="mb-4">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="w-full p-3 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-500 transition-colors"
            disabled={loading}
          />
        </div>
        
        {loading && (
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-gray-600">Processando arquivo...</p>
          </div>
        )}
        
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Formato esperado do CSV:</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <div>• <code>linkedin_url</code> - URL do perfil</div>
            <div>• <code>name</code> - Nome da pessoa</div>
            <div>• <code>degree_connection</code> - Grau de conexão</div>
            <div>• <code>title</code> - Título/cargo</div>
            <div>• <code>location</code> - Localização</div>
            <div>• <code>followers</code> - Número de seguidores</div>
            <div>• <code>mutual_connections</code> - Conexões mútuas</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
        <div className="text-center mb-6">
          <Upload className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Carregar CSVs por Pasta</h2>
          <p className="text-gray-600">Selecione uma pasta e escolha as subpastas cujos CSVs devem ser analisados</p>
        </div>

        <div className="mb-4">
          <input
            type="file"
            multiple
            webkitdirectory="true"
            directory=""
            onChange={handleFolderSelect}
            className="w-full p-3 border-2 border-dashed border-green-300 rounded-lg hover:border-green-500 transition-colors"
            disabled={loading}
          />
        </div>

        {Object.keys(folderStructure).length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded">
              <div className="text-sm text-gray-700">Pasta raiz: <span className="font-medium">{folderRoot || 'selecionada'}</span></div>
              <div className="space-x-2">
                <button onClick={() => setAllSubfolders(true)} className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300">Selecionar todos</button>
                <button onClick={() => setAllSubfolders(false)} className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300">Limpar</button>
              </div>
            </div>

            <div className="max-h-64 overflow-auto border rounded p-3 space-y-2">
              {Object.entries(folderStructure).map(([subpath, files]) => (
                <label key={subpath} className="flex items-center justify-between bg-white border rounded p-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-3"
                      checked={selectedSubfolders.has(subpath)}
                      onChange={() => toggleSubfolder(subpath)}
                    />
                    <span className="font-medium">{subpath}</span>
                  </div>
                  <span className="text-sm text-gray-600">{files.length} CSV(s)</span>
                </label>
              ))}
            </div>

            <button
              onClick={handleLoadSelectedCSVs}
              disabled={loading || selectedSubfolders.size === 0}
              className={`w-full py-2 rounded font-medium ${selectedSubfolders.size === 0 || loading ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-green-500 text-white hover:bg-green-600'}`}
            >
              {loading ? 'Carregando e deduplicando...' : 'Carregar CSVs das subpastas selecionadas'}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderCompanies = () => (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center mb-6">
        <BarChart3 className="w-6 h-6 text-blue-500 mr-2" />
        <h2 className="text-2xl font-bold text-gray-800">Análise de Empresas</h2>
      </div>
      
      {(() => {
        const pageSize = 10;
        const totalPages = Math.max(1, Math.ceil(companyAnalysis.length / pageSize));
        const page = Math.min(companiesPage, totalPages);
        const start = (page - 1) * pageSize;
        const pageItems = companyAnalysis.slice(start, start + pageSize);
        const globalStart = start;

        return (
          <>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-gray-600">Empresas mais frequentes na sua rede:</p>
                <div className="text-sm text-gray-500">
                  {companyAnalysis.length} empresas encontradas
                </div>
              </div>
              
              {pageItems.map(([company, count], index) => (
                <button
                  key={company}
                  onClick={() => { setSelectedCompany(prev => prev === company ? '' : company); setSelectedCompanyPage(1); }}
                  className="w-full text-left flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center">
                    <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                      {globalStart + index + 1}
                    </span>
                    <span className="font-medium capitalize">{company}</span>
                  </div>
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                    {count} pessoas
                  </span>
                </button>
              ))}
            </div>

            {companyAnalysis.length > pageSize && (
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => setCompaniesPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className={`inline-flex items-center px-4 py-2 rounded ${page <= 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white border hover:bg-gray-50'}`}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
                </button>
                <div className="text-sm text-gray-700">
                  Página {page} de {totalPages} • Mostrando {pageItems.length} de {companyAnalysis.length} empresas
                </div>
                <button
                  onClick={() => setCompaniesPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className={`inline-flex items-center px-4 py-2 rounded ${page >= totalPages ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white border hover:bg-gray-50'}`}
                >
                  Próxima <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            )}
          </>
        );
      })()}

      <div
        ref={companyDetailsRef}
        className={`overflow-hidden transition-all duration-300 ${selectedCompany ? 'max-h-[2000px] opacity-100 mt-8' : 'max-h-0 opacity-0 mt-0'}`}
      >
        {selectedCompany && (
        <div className="border-t pt-6 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-gray-800">Pessoas em {selectedCompany}</h3>
              <p className="text-sm text-gray-600">{companyPeopleMap[selectedCompany]?.length || 0} pessoas</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportCSV(`pessoas_${selectedCompany}.csv`, companyPeopleMap[selectedCompany] || [])}
                className="inline-flex items-center px-3 py-1 rounded bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Download className="w-4 h-4 mr-1" /> Exportar CSV
              </button>
              <button
                onClick={() => { setSelectedCompany(''); setSelectedCompanyPage(1); }}
                className="inline-flex items-center px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700"
              >
                <X className="w-4 h-4 mr-1" /> Fechar
              </button>
            </div>
          </div>

          {(() => {
            const people = companyPeopleMap[selectedCompany] || [];
            const pageSize = 10;
            const totalPages = Math.max(1, Math.ceil(people.length / pageSize));
            const page = Math.min(selectedCompanyPage, totalPages);
            const start = (page - 1) * pageSize;
            const pageItems = people.slice(start, start + pageSize);

            return (
              <>
                <div className="space-y-2">
                  {pageItems.map((person, i) => (
                    <div key={`${person.linkedin_url || person.name || i}-${start + i}`} className="flex items-center justify-between bg-gray-50 rounded p-3">
                      <div>
                        <div className="font-medium">{person.name || 'Sem nome'}</div>
                        <div className="text-sm text-gray-600">{person.title}</div>
                        <div className="text-xs text-gray-500">{person.location}</div>
                      </div>
                      {person.linkedin_url && (
                        <a href={person.linkedin_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Perfil</a>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-4">
                  <button
                    onClick={() => setSelectedCompanyPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className={`inline-flex items-center px-3 py-1 rounded ${page <= 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white border hover:bg-gray-50'}`}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
                  </button>
                  <div className="text-sm text-gray-700">Página {page} de {totalPages}</div>
                  <button
                    onClick={() => setSelectedCompanyPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className={`inline-flex items-center px-3 py-1 rounded ${page >= totalPages ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white border hover:bg-gray-50'}`}
                  >
                    Próxima <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
                <div className="h-20" aria-hidden="true"></div>
              </>
            );
          })()}
        </div>
        )}
      </div>
    </div>
  );

  const renderRoles = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-6">
          <Users className="w-6 h-6 text-green-500 mr-2" />
          <h2 className="text-2xl font-bold text-gray-800">Análise de Áreas Funcionais</h2>
        </div>
        
        <div className="space-y-3">
          {roleAnalysis.roles?.map(([role, count]) => (
            <button
              key={role}
              onClick={() => { setSelectedRoleArea(prev => prev === role ? '' : role); setSelectedRolePage(1); }}
              className="w-full text-left flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-green-50 transition-colors"
            >
              <span className="font-medium">{role}</span>
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                {count} pessoas
              </span>
            </button>
          ))}
        </div>
      </div>
      
      <div
        ref={roleDetailsRef}
        className={`overflow-hidden transition-all duration-300 ${selectedRoleArea ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
      {selectedRoleArea && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-800">Pessoas em {selectedRoleArea}</h3>
              <p className="text-sm text-gray-600">{rolePeopleMap[selectedRoleArea]?.length || 0} pessoas</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportCSV(`pessoas_${selectedRoleArea}.csv`, rolePeopleMap[selectedRoleArea] || [])}
                className="inline-flex items-center px-3 py-1 rounded bg-green-500 hover:bg-green-600 text-white"
              >
                <Download className="w-4 h-4 mr-1" /> Exportar CSV
              </button>
              <button
                onClick={() => { setSelectedRoleArea(''); setSelectedRolePage(1); }}
                className="inline-flex items-center px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700"
              >
                <X className="w-4 h-4 mr-1" /> Fechar
              </button>
            </div>
          </div>

          {(() => {
            const people = rolePeopleMap[selectedRoleArea] || [];
            const pageSize = 10;
            const totalPages = Math.max(1, Math.ceil(people.length / pageSize));
            const page = Math.min(selectedRolePage, totalPages);
            const start = (page - 1) * pageSize;
            const pageItems = people.slice(start, start + pageSize);

            return (
              <>
                <div className="space-y-2">
                  {pageItems.map((person, i) => {
                    // Extract company using the same logic as companyExtraction
                    let company = '';
                    if (person.title) {
                      const title = String(person.title || '').toLowerCase();
                      const patterns = [
                        /at\s+([^|,]+)/,
                        /@\s*([^|,]+)/,
                        /\|\s*([^|]+)$/,
                        /em\s+([^|,]+)/,
                        /na\s+([^|,]+)/
                      ];
                      
                      for (const pattern of patterns) {
                        const match = title.match(pattern);
                        if (match) { 
                          company = match[1].trim(); 
                          break; 
                        }
                      }
                      
                      if (company) {
                        company = company
                          .replace(/[^\p{L}\p{N}\s]/gu, ' ')
                          .replace(/\s+/g, ' ')
                          .trim();
                        if (company.length <= 2) company = '';
                      }
                    }

                    return (
                      <div key={`${person.linkedin_url || person.name || i}-${start + i}`} className="flex items-center justify-between bg-gray-50 rounded p-3">
                        <div>
                          <div className="font-medium">{person.name || 'Sem nome'}</div>
                          <div className="text-sm text-gray-600">{person.title}</div>
                          {company && <div className="text-xs text-blue-600 font-medium">{company}</div>}
                          <div className="text-xs text-gray-500">{person.location}</div>
                        </div>
                        {person.linkedin_url && (
                          <a href={person.linkedin_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Perfil</a>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between mt-4">
                  <button
                    onClick={() => setSelectedRolePage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className={`inline-flex items-center px-3 py-1 rounded ${page <= 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white border hover:bg-gray-50'}`}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
                  </button>
                  <div className="text-sm text-gray-700">Página {page} de {totalPages}</div>
                  <button
                    onClick={() => setSelectedRolePage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className={`inline-flex items-center px-3 py-1 rounded ${page >= totalPages ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white border hover:bg-gray-50'}`}
                  >
                    Próxima <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
                <div className="h-20" aria-hidden="true"></div>
              </>
            );
          })()}
        </div>
      )}
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Níveis de Senioridade</h3>
        
        <div className="space-y-3">
          {roleAnalysis.seniorities?.map(([level, count]) => (
            <button
              key={level}
              onClick={() => handleOpenSeniority(level)}
              className="w-full text-left flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-purple-50 transition-colors"
            >
              <span className="font-medium">{level}</span>
              <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold">
                {count} pessoas
              </span>
            </button>
          ))}
        </div>
      </div>

      <div
        ref={seniorityDetailsRef}
        className={`overflow-hidden transition-all duration-300 ${selectedSeniority ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
      {selectedSeniority && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-800">Pessoas - {selectedSeniority}</h3>
              <p className="text-sm text-gray-600">{seniorityPeopleMap[selectedSeniority]?.length || 0} pessoas</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportCSV(`pessoas_${selectedSeniority}.csv`, seniorityPeopleMap[selectedSeniority] || [])}
                className="inline-flex items-center px-3 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Download className="w-4 h-4 mr-1" /> Exportar CSV
              </button>
              <button
                onClick={() => { setSelectedSeniority(''); setSelectedSeniorityPage(1); }}
                className="inline-flex items-center px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700"
              >
                <X className="w-4 h-4 mr-1" /> Fechar
              </button>
            </div>
          </div>

          {(() => {
            const people = seniorityPeopleMap[selectedSeniority] || [];
            const pageSize = 10;
            const totalPages = Math.max(1, Math.ceil(people.length / pageSize));
            const page = Math.min(selectedSeniorityPage, totalPages);
            const start = (page - 1) * pageSize;
            const pageItems = people.slice(start, start + pageSize);

            return (
              <>
                <div className="space-y-2">
                  {pageItems.map((person, i) => {
                    // Extract company using the same logic as companyExtraction
                    let company = '';
                    if (person.title) {
                      const title = String(person.title || '').toLowerCase();
                      const patterns = [
                        /at\s+([^|,]+)/,
                        /@\s*([^|,]+)/,
                        /\|\s*([^|]+)$/,
                        /em\s+([^|,]+)/,
                        /na\s+([^|,]+)/
                      ];
                      
                      for (const pattern of patterns) {
                        const match = title.match(pattern);
                        if (match) { 
                          company = match[1].trim(); 
                          break; 
                        }
                      }
                      
                      if (company) {
                        company = company
                          .replace(/[^\p{L}\p{N}\s]/gu, ' ')
                          .replace(/\s+/g, ' ')
                          .trim();
                        if (company.length <= 2) company = '';
                      }
                    }

                    return (
                      <div key={`${person.linkedin_url || person.name || i}-${start + i}`} className="flex items-center justify-between bg-gray-50 rounded p-3">
                        <div>
                          <div className="font-medium">{person.name || 'Sem nome'}</div>
                          <div className="text-sm text-gray-600">{person.title}</div>
                          {company && <div className="text-xs text-blue-600 font-medium">{company}</div>}
                          <div className="text-xs text-gray-500">{person.location}</div>
                        </div>
                        {person.linkedin_url && (
                          <a href={person.linkedin_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Perfil</a>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between mt-4">
                  <button
                    onClick={() => setSelectedSeniorityPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className={`inline-flex items-center px-3 py-1 rounded ${page <= 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white border hover:bg-gray-50'}`}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
                  </button>
                  <div className="text-sm text-gray-700">Página {page} de {totalPages}</div>
                  <button
                    onClick={() => setSelectedSeniorityPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className={`inline-flex items-center px-3 py-1 rounded ${page >= totalPages ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white border hover:bg-gray-50'}`}
                  >
                    Próxima <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
                <div className="h-20" aria-hidden="true"></div>
              </>
            );
          })()}
        </div>
      )}
      </div>
    </div>
  );

  const renderConnections = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-6">
          <TrendingUp className="w-6 h-6 text-orange-500 mr-2" />
          <h2 className="text-2xl font-bold text-gray-800">Análise de Conexões</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <div className="text-3xl font-bold text-blue-600">{connectionAnalysis.totalConnections}</div>
            <div className="text-blue-800 font-medium">Total de Contatos</div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <div className="text-3xl font-bold text-green-600">{connectionAnalysis.avgMutualConnections}</div>
            <div className="text-green-800 font-medium">Média de Conexões Mútuas</div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <div className="text-3xl font-bold text-purple-600">{connectionAnalysis.topConnectors?.length || 0}</div>
            <div className="text-purple-800 font-medium">Super Conectores</div>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Distribuição por Grau de Conexão</h3>
          <div className="space-y-2">
            {connectionAnalysis.degrees?.map(([degree, count]) => (
              <div key={degree} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span>{degree}</span>
                <span className="font-semibold">{count} pessoas</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Top 20 Super Conectores</h3>
        <p className="text-gray-600 mb-4">Pessoas com mais conexões mútuas (potenciais para networking estratégico):</p>
        
        <div className="space-y-3">
          {connectionAnalysis.topConnectors?.map((person, index) => (
            <div key={person.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium">{person.name}</div>
                <div className="text-sm text-gray-600">{person.title}</div>
              </div>
              <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-bold">
                {person.mutual_connections} conexões mútuas
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderLocations = () => (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center mb-6">
        <MapPin className="w-6 h-6 text-red-500 mr-2" />
        <h2 className="text-2xl font-bold text-gray-800">Análise Geográfica</h2>
      </div>
      
      {locationAnalysis.length > 0 ? (
        <div className="space-y-3">
          <p className="text-gray-600 mb-4">Distribuição geográfica da sua rede:</p>
          
          {locationAnalysis.map(([location, count], index) => (
            <div key={location} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <span className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                  {index + 1}
                </span>
                <span className="font-medium">{location}</span>
              </div>
              <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold">
                {count} pessoas
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Nenhuma informação de localização encontrada nos dados.</p>
        </div>
      )}
    </div>
  );

  const renderSummary = () => (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center mb-6">
        <FileText className="w-6 h-6 text-purple-500 mr-2" />
        <h2 className="text-2xl font-bold text-gray-800">Resumo Executivo</h2>
      </div>
      
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
            <h3 className="font-bold text-blue-800 mb-2">Empresas</h3>
            <p className="text-sm text-blue-700">
              {companyAnalysis.length > 0 && (
                <>Empresa mais representada: <strong>{companyAnalysis[0][0]}</strong> ({companyAnalysis[0][1]} pessoas)</>
              )}
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
            <h3 className="font-bold text-green-800 mb-2">Áreas Funcionais</h3>
            <p className="text-sm text-green-700">
              {roleAnalysis.roles?.length > 0 && (
                <>Área mais comum: <strong>{roleAnalysis.roles[0][0]}</strong> ({roleAnalysis.roles[0][1]} pessoas)</>
              )}
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg">
            <h3 className="font-bold text-orange-800 mb-2">Networking</h3>
            <p className="text-sm text-orange-700">
              {connectionAnalysis.topConnectors?.length > 0 && (
                <>Super conector: <strong>{connectionAnalysis.topConnectors[0].name}</strong> ({connectionAnalysis.topConnectors[0].mutual_connections} conexões)</>
              )}
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
            <h3 className="font-bold text-purple-800 mb-2">Senioridade</h3>
            <p className="text-sm text-purple-700">
              {roleAnalysis.seniorities?.length > 0 && (
                <>Nível mais comum: <strong>{roleAnalysis.seniorities[0][0]}</strong> ({roleAnalysis.seniorities[0][1]} pessoas)</>
              )}
            </p>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-bold text-gray-800 mb-3">📊 Insights Estratégicos</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            {companyAnalysis.length > 0 && (
              <li>• <strong>Oportunidade de setor:</strong> Você tem forte presença no setor da {companyAnalysis[0][0]} - considere explorar oportunidades nesta área.</li>
            )}
            {connectionAnalysis.topConnectors?.length > 0 && (
              <li>• <strong>Networking estratégico:</strong> {connectionAnalysis.topConnectors[0].name} pode ser um conector-chave para expandir sua rede.</li>
            )}
            {roleAnalysis.roles?.length > 0 && (
              <li>• <strong>Expertise disponível:</strong> Sua rede tem forte representação em {roleAnalysis.roles[0][0]} - ótimo para consultorias técnicas.</li>
            )}
            <li>• <strong>Tamanho da rede:</strong> Com {connectionAnalysis.totalConnections} conexões, você tem uma base sólida para networking profissional.</li>
          </ul>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'upload', label: 'Upload', icon: Upload, component: renderUpload },
    { id: 'companies', label: 'Empresas', icon: BarChart3, component: renderCompanies },
    { id: 'roles', label: 'Cargos', icon: Users, component: renderRoles },
    { id: 'connections', label: 'Conexões', icon: TrendingUp, component: renderConnections },
    { id: 'locations', label: 'Localizações', icon: MapPin, component: renderLocations },
    { id: 'summary', label: 'Resumo', icon: FileText, component: renderSummary }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">LinkedIn Network Insights</h1>
          <p className="text-xl text-gray-600">Analise sua rede profissional e descubra oportunidades estratégicas</p>
          {data.length > 0 && (
            <div className="mt-4 inline-flex items-center bg-green-100 text-green-800 px-4 py-2 rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              {data.length.toLocaleString()} contatos carregados
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              disabled={id !== 'upload' && data.length === 0}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === id
                  ? 'bg-blue-500 text-white shadow-lg'
                  : data.length === 0 && id !== 'upload'
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-blue-50 shadow'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {label}
            </button>
          ))}
        </div>

        <div className="transition-all duration-300">
          {tabs.find(tab => tab.id === activeTab)?.component()}
        </div>
      </div>
    </div>
  );
};

export default LinkedInInsightsAnalyzer;