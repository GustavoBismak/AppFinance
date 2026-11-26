// js/import-lancamentos.js — Importador de Extratos (OFX/CSV) e Leitor de Nota Fiscal (OCR no cliente)

window.ImportadorLancamentos = {
    // Regras de categorização automática por palavras-chave
    categoryRules: [
        {
            keywords: ['salario', 'salário', 'folha', 'pro-labore', 'prolabore', 'remuneracao', 'remuneração', 'rendimento', 'dividendo', 'juros sobre capital', 'reembolso', 'cashback'],
            category: 'Renda',
            typeHint: 'receita'
        },
        {
            keywords: ['ifood', 'rappi', 'ubereats', 'uber eats', 'supermercado', 'mercado', 'atacadao', 'atacadão', 'assai', 'assaí', 'carrefour', 'pao de acucar', 'extra', 'padaria', 'restaurante', 'lanchonete', 'burger', 'mcdonald', 'bk ', 'pizza', 'sushi', 'acougue', 'açougue', 'hortifruti', 'cafe', 'café', 'sorvete', 'confeitaria', 'almoco', 'almoço', 'jantar', 'marmita'],
            category: 'Alimentação'
        },
        {
            keywords: ['posto', 'combustivel', 'combustível', 'gasolina', 'etanol', 'diesel', 'shell', 'ipiranga', 'petrobras', 'br mania', 'ale ', 'oficina', 'mecanico', 'mecânico', 'auto pecas', 'autopeças', 'pneu', 'ipva', 'estacionamento', 'sem parar', 'veloe', 'conectcar', 'pedagio', 'pedágio', 'lava rapido', 'lava-rapido'],
            category: 'Carro',
            fallbackCategory: 'Transporte'
        },
        {
            keywords: ['uber', '99 ', '99app', 'cabify', 'indriver', 'passagem', 'onibus', 'ônibus', 'metro', 'metrô', 'bilhete unico', 'bilhete único', 'rodoviaria', 'azul ', 'gol ', 'latam', 'buser'],
            category: 'Transporte'
        },
        {
            keywords: ['aluguel', 'condominio', 'condomínio', 'energia', 'luz', 'enel', 'cpfl', 'cemig', 'copel', 'equatorial', 'celesc', 'energisa', 'agua', 'água', 'sabesp', 'sanepar', 'copasa', 'comgas', 'comgás', 'gas ', 'internet', 'vivo', 'claro', 'tim ', 'oi ', 'iptu', 'imobiliaria', 'imobiliária', 'moradia'],
            category: 'Moradia'
        },
        {
            keywords: ['farmacia', 'farmácia', 'drogaria', 'droga raia', 'drogasil', 'pague menos', 'panvel', 'ultrafarma', 'hospital', 'clinica', 'clínica', 'laboratorio', 'laboratório', 'medico', 'médico', 'dentista', 'consulta', 'exame', 'unimed', 'amil', 'sulamerica', 'bradesco saude', 'hapvida', 'academia', 'smartfit', 'smart fit', 'bluefit'],
            category: 'Saúde'
        },
        {
            keywords: ['netflix', 'spotify', 'amazon prime', 'prime video', 'disney', 'hbo', 'max ', 'youtube', 'globoplay', 'cinema', 'cinemark', 'ingresso', 'steam', 'playstation', 'xbox', 'nintendo', 'airbnb', 'hotel', 'pousada', 'bar ', 'pub ', 'choperia', 'cervejaria', 'teatro', 'show ', 'lazer'],
            category: 'Lazer'
        }
    ],

    normalizeText: (text) => {
        return String(text || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();
    },

    resolveCategoryName: (preferred, fallback, availableCategories) => {
        const list = Array.isArray(availableCategories) && availableCategories.length > 0
            ? availableCategories
            : ['Alimentação', 'Moradia', 'Transporte', 'Lazer', 'Saúde', 'Renda', 'Carro', 'Outros'];

        const findInList = (target) => {
            if (!target) return null;
            const normTarget = window.ImportadorLancamentos.normalizeText(target);
            return list.find(c => window.ImportadorLancamentos.normalizeText(c) === normTarget)
                || list.find(c => window.ImportadorLancamentos.normalizeText(c).includes(normTarget))
                || null;
        };

        return findInList(preferred)
            || findInList(fallback)
            || findInList('Outros')
            || list[0];
    },

    suggestCategory: (descricao, tipo, availableCategories) => {
        const normDesc = window.ImportadorLancamentos.normalizeText(descricao);
        if (tipo === 'receita') {
            return window.ImportadorLancamentos.resolveCategoryName('Renda', 'Salário', availableCategories);
        }

        for (const rule of window.ImportadorLancamentos.categoryRules) {
            if (rule.typeHint && rule.typeHint !== tipo) continue;
            if (rule.keywords.some(kw => normDesc.includes(window.ImportadorLancamentos.normalizeText(kw)))) {
                return window.ImportadorLancamentos.resolveCategoryName(rule.category, rule.fallbackCategory, availableCategories);
            }
        }
        return window.ImportadorLancamentos.resolveCategoryName('Outros', null, availableCategories);
    },

    suggestForma: (descricao) => {
        const norm = window.ImportadorLancamentos.normalizeText(descricao);
        if (norm.includes('pix')) return 'Pix';
        if (norm.includes('credito') || norm.includes('fatura') || norm.includes('parcela')) return 'Cartão de Crédito';
        if (norm.includes('debito') || norm.includes('compra cartao')) return 'Cartão de Débito';
        if (norm.includes('dinheiro') || norm.includes('saque')) return 'Dinheiro';
        return 'Pix';
    },

    parseMoneyValue: (raw) => {
        if (typeof raw === 'number') return raw;
        let s = String(raw || '').trim().replace(/[R$\s]/g, '');
        if (!s) return NaN;

        // Detecta formato brasileiro (1.234,56) vs americano (1,234.56)
        const hasComma = s.includes(',');
        const hasDot = s.includes('.');
        if (hasComma && hasDot) {
            if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
                s = s.replace(/\./g, '').replace(',', '.');
            } else {
                s = s.replace(/,/g, '');
            }
        } else if (hasComma) {
            s = s.replace(',', '.');
        }
        s = s.replace(/[^0-9.-]/g, '');
        return parseFloat(s);
    },

    parseDateStr: (raw) => {
        const s = String(raw || '').trim();
        if (!s) return null;

        // YYYY-MM-DD
        let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) return `${m[1]}-${m[2]}-${m[3]}`;

        // DD/MM/YYYY ou DD-MM-YYYY
        m = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
        if (m) return `${m[3]}-${m[2]}-${m[1]}`;

        // DD/MM/YY
        m = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{2})$/);
        if (m) return `20${m[3]}-${m[2]}-${m[1]}`;

        // OFX YYYYMMDD...
        m = s.match(/^(\d{4})(\d{2})(\d{2})/);
        if (m) return `${m[1]}-${m[2]}-${m[3]}`;

        return null;
    },

    readFileTextSmart: (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const buffer = reader.result;
                let text = new TextDecoder('utf-8').decode(buffer);
                // Se tiver caractere de substituição UTF-8 inválido, tenta Windows-1252/Latin1
                if (text.includes('\uFFFD')) {
                    text = new TextDecoder('windows-1252').decode(buffer);
                }
                resolve(text);
            };
            reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
            reader.readAsArrayBuffer(file);
        });
    },

    parseOFX: (content, availableCategories) => {
        const blocks = content.match(/<STMTTRN>[\s\S]*?(?:<\/STMTTRN>|(?=<STMTTRN>|<\/BANKTRANLIST>))/gi) || [];
        const transactions = [];

        const extractTag = (block, tag) => {
            const regex = new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i');
            const match = block.match(regex);
            return match ? match[1].trim() : '';
        };

        for (const block of blocks) {
            const dtPosted = extractTag(block, 'DTPOSTED');
            const trnAmt = extractTag(block, 'TRNAMT');
            const memo = extractTag(block, 'MEMO');
            const name = extractTag(block, 'NAME');
            const trnType = extractTag(block, 'TRNTYPE').toUpperCase();

            const data = window.ImportadorLancamentos.parseDateStr(dtPosted);
            const rawVal = window.ImportadorLancamentos.parseMoneyValue(trnAmt);
            if (!data || isNaN(rawVal) || rawVal === 0) continue;

            const descricao = (memo || name || 'Movimentação Bancária').replace(/\s+/g, ' ').trim();
            const isReceita = rawVal > 0 || trnType === 'CREDIT' && rawVal >= 0;
            const tipo = isReceita ? 'receita' : 'despesa';
            const valor = Math.abs(rawVal);

            transactions.push({
                data,
                descricao,
                valor,
                tipo,
                categoria: window.ImportadorLancamentos.suggestCategory(descricao, tipo, availableCategories),
                forma: window.ImportadorLancamentos.suggestForma(descricao)
            });
        }
        return transactions;
    },

    splitCSVLine: (line, delimiter) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                inQuotes = !inQuotes;
            } else if (ch === delimiter && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += ch;
            }
        }
        result.push(current.trim());
        return result.map(col => col.replace(/^"|"$/g, '').trim());
    },

    parseCSV: (content, availableCategories) => {
        const lines = content
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .split('\n')
            .map(l => l.trim())
            .filter(Boolean);

        if (lines.length < 2) return [];

        // Encontra a linha de cabeçalho (primeira linha com pelo menos 2 colunas e texto)
        let headerIdx = 0;
        let delimiter = ';';
        for (let i = 0; i < Math.min(lines.length, 10); i++) {
            const line = lines[i];
            const semicolons = (line.match(/;/g) || []).length;
            const commas = (line.match(/,/g) || []).length;
            const tabs = (line.match(/\t/g) || []).length;
            const sep = semicolons >= commas && semicolons >= tabs ? ';' : (tabs > commas ? '\t' : ',');
            const cols = window.ImportadorLancamentos.splitCSVLine(line, sep);
            const joined = window.ImportadorLancamentos.normalizeText(cols.join(' '));
            if (cols.length >= 2 && (joined.includes('data') || joined.includes('date') || joined.includes('valor') || joined.includes('amount') || joined.includes('descri') || joined.includes('title'))) {
                headerIdx = i;
                delimiter = sep;
                break;
            }
        }

        const headers = window.ImportadorLancamentos.splitCSVLine(lines[headerIdx], delimiter)
            .map(h => window.ImportadorLancamentos.normalizeText(h));

        const findCol = (patterns) => headers.findIndex(h => patterns.some(p => h.includes(p)));

        let idxData = findCol(['data', 'date', 'dt', 'movimento', 'vencimento']);
        let idxDesc = findCol(['descri', 'historico', 'lancamento', 'title', 'estabelecimento', 'memo', 'detalhe', 'nome']);
        let idxVal = findCol(['valor', 'amount', 'value', 'quantia']);
        const idxCredito = findCol(['credito', 'entrada', 'receita']);
        const idxDebito = findCol(['debito', 'saida', 'despesa']);
        const idxTipo = findCol(['tipo', 'type', 'natureza']);

        // Fallback posicional se não reconhecer cabeçalhos
        if (idxData === -1) idxData = 0;
        if (idxDesc === -1) idxDesc = headers.length >= 3 ? 1 : 0;
        if (idxVal === -1 && idxCredito === -1 && idxDebito === -1) idxVal = headers.length - 1;

        const transactions = [];
        for (let i = headerIdx + 1; i < lines.length; i++) {
            const cols = window.ImportadorLancamentos.splitCSVLine(lines[i], delimiter);
            if (cols.length < 2) continue;

            const data = window.ImportadorLancamentos.parseDateStr(cols[idxData]);
            if (!data) continue;

            let rawVal = NaN;
            if (idxVal !== -1) {
                rawVal = window.ImportadorLancamentos.parseMoneyValue(cols[idxVal]);
            } else {
                const cred = idxCredito !== -1 ? window.ImportadorLancamentos.parseMoneyValue(cols[idxCredito]) : 0;
                const deb = idxDebito !== -1 ? window.ImportadorLancamentos.parseMoneyValue(cols[idxDebito]) : 0;
                if (!isNaN(cred) && cred > 0) rawVal = cred;
                else if (!isNaN(deb) && deb !== 0) rawVal = -Math.abs(deb);
            }
            if (isNaN(rawVal) || rawVal === 0) continue;

            let tipo = rawVal > 0 ? 'receita' : 'despesa';
            if (idxTipo !== -1 && cols[idxTipo]) {
                const t = window.ImportadorLancamentos.normalizeText(cols[idxTipo]);
                if (t.includes('receit') || t.includes('cred') || t.includes('entrad')) tipo = 'receita';
                else if (t.includes('desp') || t.includes('deb') || t.includes('said')) tipo = 'despesa';
            }

            const descricao = (cols[idxDesc] || 'Lançamento Importado').replace(/\s+/g, ' ').trim();
            const valor = Math.abs(rawVal);

            transactions.push({
                data,
                descricao,
                valor,
                tipo,
                categoria: window.ImportadorLancamentos.suggestCategory(descricao, tipo, availableCategories),
                forma: window.ImportadorLancamentos.suggestForma(descricao)
            });
        }
        return transactions;
    },

    parseFile: async (file, availableCategories, existingLancamentos = []) => {
        const text = await window.ImportadorLancamentos.readFileTextSmart(file);
        const nameLower = (file.name || '').toLowerCase();
        const isOFX = nameLower.endsWith('.ofx') || nameLower.endsWith('.qfx') || text.includes('<OFX>') || text.includes('<STMTTRN>');

        const parsed = isOFX
            ? window.ImportadorLancamentos.parseOFX(text, availableCategories)
            : window.ImportadorLancamentos.parseCSV(text, availableCategories);

        // Marca possíveis duplicatas comparando com lançamentos existentes
        return parsed.map(tx => {
            const normDesc = window.ImportadorLancamentos.normalizeText(tx.descricao);
            const isDuplicate = existingLancamentos.some(ex => {
                if (ex.data !== tx.data) return false;
                const diff = Math.abs((parseFloat(ex.valor) || 0) - tx.valor);
                if (diff > 0.02) return false;
                const exDesc = window.ImportadorLancamentos.normalizeText(ex.descricao);
                return exDesc === normDesc || exDesc.includes(normDesc.slice(0, 10)) || normDesc.includes(exDesc.slice(0, 10));
            });
            return { ...tx, isDuplicate };
        });
    },

    // Carrega Tesseract.js sob demanda via CDN apenas quando usuário usar Foto da Nota
    loadTesseract: () => {
        if (window.Tesseract) return Promise.resolve(window.Tesseract);
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
            script.onload = () => {
                if (window.Tesseract) resolve(window.Tesseract);
                else reject(new Error('Biblioteca OCR não inicializou.'));
            };
            script.onerror = () => reject(new Error('Falha ao carregar leitor de nota fiscal (verifique sua conexão).'));
            document.head.appendChild(script);
        });
    },

    preprocessReceiptImage: (file) => {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(url);
                const maxDim = 1500;
                let w = img.width;
                let h = img.height;
                if (w > maxDim || h > maxDim) {
                    const ratio = Math.min(maxDim / w, maxDim / h);
                    w = Math.round(w * ratio);
                    h = Math.round(h * ratio);
                }

                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.filter = 'grayscale(100%) contrast(135%)';
                ctx.drawImage(img, 0, 0, w, h);

                resolve({
                    ocrDataUrl: canvas.toDataURL('image/jpeg', 0.88),
                    previewUrl: URL.createObjectURL(file)
                });
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Não foi possível abrir a imagem da nota.'));
            };
            img.src = url;
        });
    },

    extractReceiptData: (ocrText, availableCategories) => {
        const fullText = String(ocrText || '');
        const lines = fullText
            .split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 0);

        // 1. Extrair Data
        let data = new Date().toISOString().split('T')[0];
        for (const line of lines) {
            const m = line.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{2,4})/);
            if (m) {
                const year = m[3].length === 2 ? `20${m[3]}` : m[3];
                const month = m[2];
                const day = m[1];
                if (parseInt(month, 10) >= 1 && parseInt(month, 10) <= 12 && parseInt(day, 10) >= 1 && parseInt(day, 10) <= 31) {
                    data = `${year}-${month}-${day}`;
                    break;
                }
            }
        }

        // 2. Extrair Valor Total com Regras Aprimoradas
        let valor = '';
        const normFullText = window.ImportadorLancamentos.normalizeText(fullText);

        // Palavras-chave de TOTAL no cupom fiscal (ordem de prioridade)
        const totalKeywords = [
            'total a pagar',
            'valor a pagar',
            'total geral',
            'valor total',
            'total pago',
            'total r$',
            'vlr total',
            'tot a pagar',
            'tot geral',
            'total liquido',
            'valor liquido',
            'total',
            'subtotal'
        ];

        // Regex para capturar valores em formato brasileiro: R$ 123,45 ou 123,45 ou 1.234,56
        const moneyRegex = /(?:r\$\s*)?(\d{1,4}(?:\.\d{3})*,\d{2}|\d+[.,]\d{2})/gi;

        // Estratégia A: Buscar linha que contenha palavra de TOTAL e valor na mesma linha ou na linha imediatamente seguinte
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const normLine = window.ImportadorLancamentos.normalizeText(line);

            // Ignora linhas de tributos/descontos/itens intermediários que contenham "total de tributos" ou "base de calculo"
            if (normLine.includes('tribut') || normLine.includes('base') || normLine.includes('icms') || normLine.includes('desconto')) {
                continue;
            }

            const hasTotalKeyword = totalKeywords.some(kw => normLine.includes(kw));
            if (hasTotalKeyword) {
                // Tenta extrair valor na própria linha
                const matchesOnLine = [...line.matchAll(moneyRegex)];
                if (matchesOnLine.length > 0) {
                    // Pega o último valor da linha de total (geralmente é o valor final)
                    const lastMatch = matchesOnLine[matchesOnLine.length - 1][1];
                    const parsed = window.ImportadorLancamentos.parseMoneyValue(lastMatch);
                    if (!isNaN(parsed) && parsed > 0 && parsed < 200000) {
                        valor = parsed.toFixed(2);
                        break;
                    }
                }

                // Se a palavra de total está sozinha na linha (muito comum em cupom SAT/NFC-e), olha a próxima linha
                if (!valor && i + 1 < lines.length) {
                    const nextLine = lines[i + 1];
                    const nextMatches = [...nextLine.matchAll(moneyRegex)];
                    if (nextMatches.length > 0) {
                        const parsed = window.ImportadorLancamentos.parseMoneyValue(nextMatches[0][1]);
                        if (!isNaN(parsed) && parsed > 0 && parsed < 200000) {
                            valor = parsed.toFixed(2);
                            break;
                        }
                    }
                }
            }
        }

        // Estratégia B: Se não achou por palavra de total, busca linha com forma de pagamento (ex: CARTAO, DINHEIRO, PIX) seguido de valor
        if (!valor) {
            const payKeywords = ['cartao', 'debito', 'credito', 'dinheiro', 'pix', 'visa', 'master', 'elo', 'pagamento'];
            for (const line of lines) {
                const normLine = window.ImportadorLancamentos.normalizeText(line);
                if (payKeywords.some(kw => normLine.includes(kw))) {
                    const matches = [...line.matchAll(moneyRegex)];
                    if (matches.length > 0) {
                        const parsed = window.ImportadorLancamentos.parseMoneyValue(matches[matches.length - 1][1]);
                        if (!isNaN(parsed) && parsed > 0 && parsed < 200000) {
                            valor = parsed.toFixed(2);
                            break;
                        }
                    }
                }
            }
        }

        // Estratégia C (Fallback Inteligente): Filtra valores monetários excluindo CNPJ, Códigos de Barra e pega o valor mais plausível
        if (!valor) {
            let candidateValues = [];
            for (const line of lines) {
                const norm = window.ImportadorLancamentos.normalizeText(line);
                // Ignora linhas de documentos e tributos
                if (norm.includes('cnpj') || norm.includes('cpf') || norm.includes('tribut') || norm.includes('chave') || norm.includes('serie')) {
                    continue;
                }
                const matches = [...line.matchAll(moneyRegex)];
                for (const m of matches) {
                    const parsed = window.ImportadorLancamentos.parseMoneyValue(m[1]);
                    // Filtra valores inválidos ou números gigantes (ex: códigos)
                    if (!isNaN(parsed) && parsed > 0.50 && parsed < 50000) {
                        candidateValues.push(parsed);
                    }
                }
            }
            if (candidateValues.length > 0) {
                // Em cupom fiscal, o maior valor do documento geralmente é o total geral da compra
                const maxVal = Math.max(...candidateValues);
                valor = maxVal.toFixed(2);
            }
        }

        // 3. Extrair Nome do Estabelecimento
        const ignoreWords = ['cupom', 'fiscal', 'danfe', 'nfce', 'nfc-e', 'documento auxiliar', 'cnpj', 'ie:', 'extrato', 'comprovante', 'sat', 'via cliente', 'consumidor'];
        let descricao = 'Compra em Nota Fiscal';
        for (const line of lines.slice(0, 10)) {
            const norm = window.ImportadorLancamentos.normalizeText(line);
            const hasLetters = /[a-z]{3,}/.test(norm);
            const isIgnored = ignoreWords.some(w => norm.includes(w));
            if (hasLetters && !isIgnored && line.length >= 3 && line.length <= 60) {
                descricao = line.replace(/[^a-zA-Z0-9À-ÿ\s&.\-]/g, '').trim();
                if (descricao.length >= 3) break;
            }
        }

        const categoria = window.ImportadorLancamentos.suggestCategory(`${descricao} ${ocrText}`, 'despesa', availableCategories);
        const forma = window.ImportadorLancamentos.suggestForma(ocrText);

        return {
            data,
            descricao,
            valor,
            tipo: 'despesa',
            categoria,
            forma,
            rawText: ocrText
        };
    },

    scanReceiptImage: async (file, availableCategories, onProgress) => {
        try {
            const [{ ocrDataUrl, previewUrl }, Tesseract] = await Promise.all([
                window.ImportadorLancamentos.preprocessReceiptImage(file),
                window.ImportadorLancamentos.loadTesseract()
            ]);

            let result = null;
            try {
                result = await Tesseract.recognize(ocrDataUrl, 'por', {
                    logger: (m) => {
                        if (m.status === 'recognizing text' && typeof onProgress === 'function') {
                            onProgress(Math.round((m.progress || 0) * 100));
                        }
                    }
                });
            } catch (ocrErr) {
                console.warn('[OCR por falhou, tentando fallback eng]', ocrErr);
                result = await Tesseract.recognize(ocrDataUrl, 'eng');
            }

            const rawText = result?.data?.text || '';
            const extracted = window.ImportadorLancamentos.extractReceiptData(rawText, availableCategories);
            return { ...extracted, previewUrl };
        } catch (err) {
            console.error('[OCR Error]', err);
            // Em caso de qualquer falha no OCR, ainda retorna os dados para permitir preenchimento com a foto visível!
            let previewUrl = '';
            try { previewUrl = URL.createObjectURL(file); } catch (_) {}
            return {
                data: new Date().toISOString().split('T')[0],
                descricao: 'Compra em Nota Fiscal',
                valor: '',
                tipo: 'despesa',
                categoria: availableCategories[0] || 'Alimentação',
                forma: 'Pix',
                previewUrl,
                ocrWarning: 'Não conseguimos ler todos os dados automaticamente da foto. Confira e complete os campos abaixo:'
            };
        }
    }
};
