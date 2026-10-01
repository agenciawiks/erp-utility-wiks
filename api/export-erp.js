// Exporta um produto (SKU + descrição ERP) direto pro repositório
// agenciawiks/guilherme (Wiks Brain), via GitHub Contents API.
// Cria um arquivo novo em erp-geracao/produtos/ (mesmo formato/pasta que
// a skill `gerar-erp` do Claude Code já usa) e insere uma linha no índice
// wiks-brain/03-Resources/processos/produtos gerados via erp.md.

const OWNER = 'agenciawiks';
const REPO = 'guilherme';
const BRANCH = 'main';
const INDEX_PATH = 'wiks-brain/03-Resources/processos/produtos gerados via erp.md';
const ANCHOR = '<!-- NOVA-LINHA-AQUI (não apagar — o export automático do erp-utility-wiks insere a linha nova logo acima deste comentário) -->';

function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

async function githubRequest(token, path, options = {}) {
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {}),
    },
  });
  return res;
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return response.status(500).json({ error: 'GITHUB_TOKEN is not configured on Vercel' });
  }

  try {
    const { produto, marca, estampa, material, cores, tamanhos, obs, sku, output } = request.body || {};
    if (!produto || !marca) {
      return response.status(400).json({ error: 'produto e marca são obrigatórios' });
    }

    const data = hojeISO();
    const slug = slugify(produto);
    const filePath = `erp-geracao/produtos/${slug}-${data}.md`;

    // "output" é o PROMPT gerado pelo app (pra colar num assistente de IA
    // e virar descrição de verdade) — não é a descrição final em si.
    const corpo = (output && String(output).trim())
      ? `## ${produto}\n> Marca: ${marca}\n\n### Prompt gerado (colar num assistente de IA pra virar descrição completa)\n\n\`\`\`\n${output}\n\`\`\``
      : [
          `## ${produto}`,
          `> Marca: ${marca}`,
          '',
          material ? `- Material: ${material}` : null,
          Array.isArray(cores) && cores.length ? `- Cores: ${cores.join(', ')}` : null,
          Array.isArray(tamanhos) && tamanhos.length ? `- Tamanhos: ${tamanhos.join(', ')}` : null,
          obs ? `- Observações: ${obs}` : null,
        ].filter(Boolean).join('\n');

    const frontmatter = [
      '---',
      `marca: ${marca}`,
      `produto: ${produto}`,
      `data: ${data}`,
      'status: gerado',
      sku ? `sku: ${sku}` : 'sku: ""',
      'origem: erp-utility-wiks',
      '---',
      '',
    ].join('\n');

    const fileContent = frontmatter + corpo + '\n';

    // 1. Cria o arquivo do produto
    const putFileRes = await githubRequest(token, filePath, {
      method: 'PUT',
      body: JSON.stringify({
        message: `docs(erp-geracao): adiciona ${produto} via erp-utility-wiks`,
        content: Buffer.from(fileContent, 'utf-8').toString('base64'),
        branch: BRANCH,
      }),
    });

    if (!putFileRes.ok) {
      const err = await putFileRes.json().catch(() => ({}));
      return response.status(502).json({ error: 'Falha ao criar arquivo do produto', details: err });
    }

    // 2. Lê o índice atual pra pegar o sha e inserir a linha nova antes do âncora
    const getIndexRes = await githubRequest(token, encodeURIComponent(INDEX_PATH).replace(/%2F/g, '/'));
    if (!getIndexRes.ok) {
      const err = await getIndexRes.json().catch(() => ({}));
      return response.status(502).json({ error: 'Produto exportado, mas falha ao ler o índice', details: err, filePath });
    }
    const indexData = await getIndexRes.json();
    const indexContent = Buffer.from(indexData.content, 'base64').toString('utf-8');

    if (!indexContent.includes(ANCHOR)) {
      return response.status(502).json({
        error: 'Produto exportado, mas o âncora não foi encontrado no índice — insira a linha manualmente',
        filePath,
      });
    }

    const novaLinha = `| ${data} | ${marca} | ${produto} | ${sku ? `\`${sku}\`` : '—'} | app \`erp-utility-wiks\` | \`${filePath}\` |`;
    const novoConteudo = indexContent.replace(ANCHOR, `${novaLinha}\n${ANCHOR}`);

    const putIndexRes = await githubRequest(token, encodeURIComponent(INDEX_PATH).replace(/%2F/g, '/'), {
      method: 'PUT',
      body: JSON.stringify({
        message: `docs(wiks-brain): indexa ${produto} (erp-utility-wiks)`,
        content: Buffer.from(novoConteudo, 'utf-8').toString('base64'),
        sha: indexData.sha,
        branch: BRANCH,
      }),
    });

    if (!putIndexRes.ok) {
      const err = await putIndexRes.json().catch(() => ({}));
      return response.status(502).json({
        error: 'Produto exportado, mas falha ao atualizar o índice — insira a linha manualmente',
        details: err,
        filePath,
      });
    }

    return response.status(200).json({ success: true, filePath });
  } catch (error) {
    console.error('Export ERP error:', error);
    return response.status(500).json({ error: error.message });
  }
}
