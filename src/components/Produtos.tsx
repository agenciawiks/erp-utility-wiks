import { useState, useEffect } from "react";
import {
  Copy, Hash, FileText, Plus, Minus, RotateCcw, Trash2, CheckCircle2,
  History, Undo2, Link2, Package, AlertTriangle, Sparkles, Tag, Save,
} from "lucide-react";
import { appDb } from "../db";
import { usePersistentState } from "../usePersistentState";

// ─── Listas unificadas (um valor alimenta os dois geradores) ──────────────────
const BRANDS = [
  { key: "OPR", label: "Camisetas Opressoras", erp: "Camisetas Opressoras", sku: "OPR" },
  { key: "AURI", label: "Auri Verde", erp: "Auriverde", sku: "AURI" },
  { key: "TIME", label: "Timeline", erp: "Timeline", sku: "TIME" },
  { key: "OUTRA", label: "Outra (personalizada)…", erp: "", sku: "OUTRA" },
];

const TIPOS = [
  { key: "camiseta", label: "Camiseta", erp: "Camiseta", sku: "CAM", vestuario: true },
  { key: "polo", label: "Camiseta Polo", erp: "Camiseta Polo", sku: "CAM", vestuario: true },
  { key: "moletom", label: "Moletom", erp: "Moletom", sku: "CAM", vestuario: true },
  { key: "regata", label: "Regata", erp: "Regata", sku: "CAM", vestuario: true },
  { key: "caneca", label: "Caneca", erp: "Caneca", sku: "CAN", vestuario: false },
  { key: "bone", label: "Boné", erp: "Boné", sku: "BON", vestuario: false },
  { key: "adesivos", label: "Adesivos", erp: "Adesivos", sku: "ADE", vestuario: false },
  { key: "bottons", label: "Bottons", erp: "Bottons", sku: "BTN", vestuario: false },
  { key: "chinelos", label: "Chinelos", erp: "Chinelos", sku: "CHI", vestuario: false },
  { key: "bandeiras", label: "Bandeiras", erp: "Bandeiras", sku: "BAN", vestuario: false },
  { key: "mdf", label: "MDF", erp: "MDF", sku: "MDF", vestuario: false },
  { key: "mousepad", label: "Mousepad", erp: "Mousepad", sku: "MP", vestuario: false },
  { key: "outro", label: "Outro…", erp: "Outro", sku: "OUTRA", vestuario: false },
];

const MATERIAIS = ["PV Premium", "Algodão", "Dry Fit", "Malha PV", "Cerâmica", "Poliester"];
const CORES_PADRAO = ["Branco", "Preto", "Verde", "Azul", "Amarelo", "Vermelho", "Cinza", "Marinho", "Bicolor"];
const TAMANHOS = ["P", "M", "G", "GG", "XG", "EXG", "Único"];
const FRASE_VESTUARIO =
  "Recomendamos verificar atentamente as medidas do produto antes da compra para garantir o tamanho ideal.";

const novoId = (): string =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizarModelo = (t: string): string =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").toUpperCase();

const normalizarCor = (cor: string): string => {
  const fem: Record<string, string> = {
    branca: "Branco", preta: "Preto", vermelha: "Vermelho",
    amarela: "Amarelo", cinza: "Cinza", azul: "Azul", verde: "Verde",
  };
  const l = cor.trim().toLowerCase();
  return fem[l] || cor.charAt(0).toUpperCase() + cor.slice(1);
};

interface SkuItem {
  id: string; sku: string; loja: string; customLoja?: string;
  categoria: string; customCategoria?: string; colecao: string;
  idSeq: number; padSize: number; createdAt: number;
}
interface ErpItem {
  id: string; produto: string; marca: string; estampa: string;
  material: string[]; cores: string[]; tamanhos: string[]; obs: string;
  sku: string; output: string; createdAt: number;
}

// ─── UI helpers ──────────────────────────────────────────────────────────────
function ChipGroup({
  options, selected, onChange, accent = "indigo",
}: {
  options: string[]; selected: string[];
  onChange: (v: string[]) => void; accent?: "indigo" | "orange";
}) {
  const on = accent === "orange"
    ? "bg-orange-600 border-orange-500 text-white shadow-orange-500/30"
    : "bg-indigo-600 border-indigo-500 text-white shadow-indigo-500/30";
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const sel = selected.includes(opt);
        return (
          <span
            key={opt}
            onClick={() =>
              onChange(sel ? selected.filter((s) => s !== opt) : [...selected, opt])
            }
            className={`px-3.5 py-1.5 flex items-center gap-1.5 rounded-lg text-xs font-semibold cursor-pointer select-none transition-all shadow-sm border ${
              sel
                ? on
                : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-400"
            }`}
          >
            {sel && <CheckCircle2 size={13} />}
            {opt}
          </span>
        );
      })}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 mb-4">
      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
        <div className="w-1.5 h-3.5 bg-slate-400 dark:bg-slate-500 rounded-full" />
        {label}
      </label>
      {children}
      {hint && <span className="text-[10px] text-slate-400 dark:text-slate-500 leading-snug">{hint}</span>}
    </div>
  );
}

const inputClass =
  "w-full px-3.5 py-2.5 text-sm font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all shadow-sm";
const selectClass = `${inputClass} appearance-none cursor-pointer`;

// ─── Componente principal ────────────────────────────────────────────────────
export default function Produtos() {
  // Base compartilhada
  const [marca, setMarca] = usePersistentState<string>("prod_marca", "OPR");
  const [customMarca, setCustomMarca] = usePersistentState<string>("prod_customMarca", "");
  const [tipo, setTipo] = usePersistentState<string>("prod_tipo", "camiseta");
  const [customCategoria, setCustomCategoria] = usePersistentState<string>("prod_customCategoria", "");
  const [colecao, setColecao] = usePersistentState<string>("prod_colecao", "");
  const [estampa, setEstampa] = usePersistentState<string>("prod_estampa", "");

  // SKU
  const [idSeq, setIdSeq] = usePersistentState<number>("prod_idSeq", 1);
  const [padSize, setPadSize] = usePersistentState<number>("prod_padSize", 2);

  // ERP
  const [material, setMaterial] = usePersistentState<string[]>("prod_material", []);
  const [cores, setCores] = usePersistentState<string[]>("prod_cores", []);
  const [customCor, setCustomCor] = useState("");
  const [tamanhos, setTamanhos] = usePersistentState<string[]>("prod_tamanhos", []);
  const [obs, setObs] = usePersistentState<string>("prod_obs", "");
  const [output, setOutput] = usePersistentState<string>(
    "prod_output",
    'Preencha a base + os campos do ERP e clique em "Gerar descrição".'
  );
  const [erpId, setErpId] = usePersistentState<string>("prod_erpId", "");

  // Efêmeros
  const [skusHist, setSkusHist] = useState<SkuItem[]>([]);
  const [erpsHist, setErpsHist] = useState<ErpItem[]>([]);
  const [skuCopyStatus, setSkuCopyStatus] = useState<"idle" | "copied" | "copied_inc">("idle");
  const [erpCopyLabel, setErpCopyLabel] = useState("Copiar descrição");
  const [copiedTag, setCopiedTag] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [histCopiadoId, setHistCopiadoId] = useState<string | null>(null);
  const [delConfirm, setDelConfirm] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [skus, erps] = await Promise.all([appDb.loadSkus(), appDb.loadErps()]);
        setSkusHist(skus as SkuItem[]);
        setErpsHist(erps as ErpItem[]);
      } catch (e) {
        console.error("Erro ao carregar históricos:", e);
      }
    })();
  }, []);

  const recarregar = async () => {
    const [skus, erps] = await Promise.all([appDb.loadSkus(), appDb.loadErps()]);
    setSkusHist(skus as SkuItem[]);
    setErpsHist(erps as ErpItem[]);
  };

  // ── Valores derivados da base ──────────────────────────────────────────────
  const marcaSel = BRANDS.find((b) => b.key === marca);
  const tipoSel = TIPOS.find((t) => t.key === tipo);
  const isOutraMarca = marca === "OUTRA";
  const isOutroTipo = tipo === "outro";

  const skuLoja = (isOutraMarca ? normalizarModelo(customMarca) : marcaSel?.sku || "").trim();
  const skuCat = (isOutroTipo ? normalizarModelo(customCategoria) : tipoSel?.sku || "").trim();
  const skuColecao = normalizarModelo(colecao).trim();
  const idFmt = String(idSeq).padStart(padSize, "0");
  const skuGerado = [skuLoja, skuCat, skuColecao, idFmt].filter(Boolean).join("-");
  const skuValido = Boolean(skuLoja && skuCat);
  const skuExcede = skuGerado.length > 50;
  const skuDuplicado = skuValido && skusHist.some((s) => s.id === skuGerado);

  const erpMarca = isOutraMarca ? customMarca.trim() : marcaSel?.erp || "";
  const erpProduto = isOutroTipo ? "Outro" : tipoSel?.erp || "";
  const isVestuario = !!tipoSel?.vestuario;

  const tagRecomendada =
    erpMarca === "Timeline" ? "timeline"
    : erpMarca === "Auriverde" ? "auriverde"
    : erpMarca === "Camisetas Opressoras" ? "opressoras"
    : "";
  const estLower = estampa.toLowerCase();
  const isPolitical =
    erpMarca === "Camisetas Opressoras" ||
    ["bolsonaro", "lula", "direita", "esquerda", "politica", "política"].some((w) => estLower.includes(w));

  const erpPronto = !output.startsWith("Preencha") && !output.startsWith("⚠");

  // ── Registros para salvar ─────────────────────────────────────────────────
  const montarSku = (): SkuItem => ({
    id: skuGerado,
    sku: skuGerado,
    loja: isOutraMarca ? "OUTRA" : marcaSel?.sku || "",
    customLoja: customMarca,
    categoria: isOutroTipo ? "OUTRA" : tipoSel?.sku || "",
    customCategoria,
    colecao,
    idSeq,
    padSize,
    createdAt: Date.now(),
  });

  const montarErp = (id: string): ErpItem => ({
    id,
    produto: erpProduto,
    marca: erpMarca,
    estampa,
    material,
    cores,
    tamanhos,
    obs,
    sku: skuValido ? skuGerado : "",
    output,
    createdAt: Date.now(),
  });

  // Copia pro clipboard sem quebrar o resto se o navegador bloquear
  const copiarTexto = async (txt: string) => {
    try {
      await navigator.clipboard.writeText(txt);
    } catch {
      /* clipboard indisponível (iframe, permissão negada) — segue o fluxo */
    }
  };

  // ── Ações SKU ─────────────────────────────────────────────────────────────
  const copiarSku = async (incremental = false) => {
    if (!skuValido) return;
    await copiarTexto(skuGerado);
    setSkuCopyStatus(incremental ? "copied_inc" : "copied");
    try {
      await appDb.saveSku(montarSku());
      await recarregar();
    } catch (e) {
      console.error("Erro ao salvar SKU:", e);
    }
    if (incremental) setIdSeq((p) => p + 1);
    setTimeout(() => setSkuCopyStatus("idle"), 1500);
  };

  // ── Ações ERP ─────────────────────────────────────────────────────────────
  const gerarErp = () => {
    if (!erpMarca || !erpProduto || !estampa) {
      setOutput("⚠ Preencha Marca, Tipo de produto e Estampa na base acima.");
      return;
    }
    setErpId(novoId());

    let p = `# NOVO PRODUTO:\n`;
    p += `- PRODUTO: ${erpProduto}\n`;
    p += `- MARCA: ${erpMarca}\n`;
    p += `- ESTAMPA: ${estampa}\n`;
    if (skuValido) p += `- SKU: ${skuGerado}\n`;
    p += `- COR: ${cores.length ? cores.join(", ") : "—"}\n`;
    p += `- TAMANHOS: ${tamanhos.length ? tamanhos.join(", ") : "—"}\n`;
    p += `- MATERIAL: ${material.length ? material.join(", ") : "—"}\n`;

    let obsFinais = obs.trim();
    if (isVestuario) {
      obsFinais = obsFinais
        ? (obsFinais.includes(FRASE_VESTUARIO) ? obsFinais : `${obsFinais}\n\n${FRASE_VESTUARIO}`)
        : FRASE_VESTUARIO;
    }
    if (obsFinais) p += `\n# OBSERVAÇÕES:\n${obsFinais}`;

    setOutput(p);
  };

  const copiarErp = async () => {
    if (!erpPronto) return;
    await copiarTexto(output);
    setErpCopyLabel("Copiado!");
    setTimeout(() => setErpCopyLabel("Copiar descrição"), 1500);
    const id = erpId || novoId();
    if (!erpId) setErpId(id);
    try {
      await appDb.saveErp(montarErp(id));
      await recarregar();
    } catch (e) {
      console.error("Erro ao salvar ERP:", e);
    }
  };

  const copiarTag = async () => {
    if (!tagRecomendada) return;
    await copiarTexto(tagRecomendada);
    setCopiedTag(true);
    setTimeout(() => setCopiedTag(false), 1500);
  };

  const adicionarCor = () => {
    if (!customCor.trim()) return;
    const c = normalizarCor(customCor);
    if (!cores.includes(c)) setCores([...cores, c]);
    setCustomCor("");
  };

  // ── Salvar produto completo (SKU + ERP juntos) ────────────────────────────
  const salvarProduto = async () => {
    const feitos: string[] = [];
    let exportResult: { success: boolean; error?: string } | null = null;
    try {
      if (skuValido) {
        await appDb.saveSku(montarSku());
        feitos.push("SKU");
      }
      if (erpPronto) {
        const id = erpId || novoId();
        if (!erpId) setErpId(id);
        const erpSalvo = montarErp(id);
        await appDb.saveErp(erpSalvo);
        feitos.push("descrição ERP");
        // Exporta pro Wiks Brain — não bloqueia o fluxo se falhar, o
        // produto já foi salvo normalmente nas linhas acima.
        exportResult = await appDb.exportErpParaVault(erpSalvo);
      }
      if (!feitos.length) {
        setStatusMsg("Gere ao menos o SKU ou a descrição ERP antes de salvar.");
        return;
      }
      await recarregar();
      const baseMsg =
        feitos.length === 2
          ? `Produto salvo: ${skuGerado} + descrição ERP, já vinculados.`
          : `Salvo: ${feitos[0]}.`;
      const exportMsg = exportResult
        ? exportResult.success
          ? " Exportado pro Wiks Brain."
          : ` ⚠ Falha ao exportar pro Wiks Brain (${exportResult.error}) — produto salvo normalmente, só não entrou no vault.`
        : "";
      setStatusMsg(baseMsg + exportMsg);
      setTimeout(() => setStatusMsg(""), 6000);
    } catch (e) {
      console.error("Erro ao salvar produto:", e);
      setStatusMsg("Erro ao salvar — veja o console.");
    }
  };

  const limparTudo = () => {
    setEstampa(""); setColecao("");
    setMaterial([]); setCores([]); setCustomCor(""); setTamanhos([]); setObs("");
    setIdSeq(1);
    setErpId("");
    setOutput('Preencha a base + os campos do ERP e clique em "Gerar descrição".');
    setStatusMsg("");
  };

  // ── Reutilizar do histórico ──────────────────────────────────────────────
  const reutilizarSku = (item: SkuItem) => {
    const b = item.loja === "OUTRA" ? BRANDS[3] : BRANDS.find((x) => x.sku === item.loja);
    setMarca(b?.key || "OUTRA");
    if (item.loja === "OUTRA") setCustomMarca(item.customLoja || "");
    const t = item.categoria === "OUTRA" ? TIPOS[TIPOS.length - 1] : TIPOS.find((x) => x.sku === item.categoria);
    setTipo(t?.key || "outro");
    if (item.categoria === "OUTRA") setCustomCategoria(item.customCategoria || "");
    setColecao(item.colecao || "");
    setIdSeq(item.idSeq || 1);
    setPadSize(item.padSize || 2);
    setStatusMsg(`Parâmetros do SKU ${item.sku} carregados na base.`);
    setTimeout(() => setStatusMsg(""), 3000);
  };

  const reutilizarErp = (item: ErpItem) => {
    const b = BRANDS.find((x) => x.erp === item.marca);
    setMarca(b?.key || "OUTRA");
    if (!b) setCustomMarca(item.marca || "");
    const t = TIPOS.find((x) => x.erp === item.produto);
    setTipo(t?.key || "outro");
    setEstampa(item.estampa || "");
    setMaterial(item.material || []);
    setCores(item.cores || []);
    setTamanhos(item.tamanhos || []);
    setObs(item.obs || "");
    setOutput(item.output);
    setErpId(item.id);
    setStatusMsg(`Cadastro "${item.estampa}" carregado.`);
    setTimeout(() => setStatusMsg(""), 3000);
  };

  const copiarHist = async (id: string, texto: string) => {
    await copiarTexto(texto);
    setHistCopiadoId(id);
    setTimeout(() => setHistCopiadoId(null), 1500);
  };

  const apagar = async (kind: "sku" | "erp", id: string) => {
    if (delConfirm !== id) {
      setDelConfirm(id);
      setTimeout(() => setDelConfirm((p) => (p === id ? null : p)), 3000);
      return;
    }
    try {
      if (kind === "sku") await appDb.deleteSku(id);
      else await appDb.deleteErp(id);
      setDelConfirm(null);
      await recarregar();
    } catch (e) {
      console.error("Erro ao apagar:", e);
    }
  };

  const btn = "px-3 py-2.5 rounded-lg border text-sm font-black transition-all flex items-center justify-center cursor-pointer";

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 my-4">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-700 pb-5 mb-6">
        <div className="p-3 bg-slate-800 dark:bg-slate-700 text-white rounded-xl shadow-lg">
          <Package size={26} />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
            Cadastro de Produto
          </h2>
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            SKU e descrição ERP na mesma página — use um dos lados sozinho ou os dois emendados.
          </p>
        </div>
      </div>

      {/* ── Base compartilhada ── */}
      <div className="bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-4 bg-slate-500 rounded-full" />
          <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Base — alimenta os dois lados
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5">
          <Field label="Marca / Loja">
            <select value={marca} onChange={(e) => setMarca(e.target.value)} className={selectClass}>
              {BRANDS.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
            </select>
          </Field>
          {isOutraMarca && (
            <Field label="Nome da marca personalizada">
              <input
                value={customMarca}
                onChange={(e) => setCustomMarca(e.target.value.substring(0, 20))}
                placeholder="Ex: LOJAPROPRIA"
                className={inputClass}
              />
            </Field>
          )}

          <Field label="Tipo de produto" hint="Define o PRODUTO no ERP e a CATEGORIA no SKU ao mesmo tempo.">
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={selectClass}>
              {TIPOS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </Field>
          {isOutroTipo && (
            <Field label="Código da categoria (SKU)" hint="3 letras. Ex: MOLETOM → MOL">
              <input
                value={customCategoria}
                onChange={(e) => setCustomCategoria(e.target.value.substring(0, 5))}
                placeholder="MOL"
                className={inputClass}
              />
            </Field>
          )}

          <Field label="Coleção (opcional)" hint="Entra no SKU. Ex: PATRIOTAS, INVERNO26">
            <input value={colecao} onChange={(e) => setColecao(e.target.value)} placeholder="PATRIOTAS" className={inputClass} />
          </Field>
          <Field label="Estampa / Design" hint="Entra na descrição do ERP.">
            <input value={estampa} onChange={(e) => setEstampa(e.target.value)} placeholder="Ex: Bolsonaro Patriota 2026" className={inputClass} />
          </Field>
        </div>
      </div>

      {/* ── Dois geradores lado a lado ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SKU */}
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-orange-500 text-white rounded-lg"><Hash size={16} /></div>
            <h3 className="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-white">SKU</h3>
          </div>

          <Field label="Número sequencial (ID)">
            <div className="flex gap-2 items-center">
              <button onClick={() => setIdSeq((p) => Math.max(1, p - 1))} className={`${btn} bg-red-500/10 border-red-500/30 text-red-500`}><Minus size={14} /></button>
              <input
                type="number" min={1} value={idSeq}
                onChange={(e) => setIdSeq(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 text-center font-bold px-2 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <button onClick={() => setIdSeq((p) => p + 1)} className={`${btn} bg-green-500/10 border-green-500/30 text-green-500`}><Plus size={14} /></button>
              <select
                value={padSize} onChange={(e) => setPadSize(parseInt(e.target.value))} title="Zeros à esquerda"
                className="ml-1 font-mono text-xs px-2 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value={1}>1</option><option value={2}>01</option><option value={3}>001</option><option value={4}>0001</option>
              </select>
            </div>
          </Field>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Prévia</span>
              <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${skuExcede ? "bg-red-500/10 text-red-500" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                {skuGerado.length}/50
              </span>
            </div>
            <div className={`w-full flex items-center justify-center p-4 border-2 border-dashed rounded-xl min-h-[64px] ${skuExcede ? "border-red-500/50" : "border-slate-300 dark:border-slate-700"}`}>
              <span className={`font-mono text-base sm:text-lg font-black uppercase tracking-wider break-all text-center ${skuExcede ? "text-red-500" : "text-orange-600 dark:text-orange-400"}`}>
                {skuGerado || "PREENCHA-A-BASE"}
              </span>
            </div>
            {skuExcede && <p className="text-[11px] font-bold text-red-500 mt-1.5">⚠️ Passou de 50 caracteres — encurte a coleção.</p>}
            {skuDuplicado && <p className="text-[11px] font-bold text-amber-500 mt-1.5">⚠️ Esse SKU já existe no histórico — use "Copiar & +1".</p>}
            {!skuValido && <p className="text-[11px] text-slate-400 mt-1.5">Escolha marca e tipo de produto na base para liberar o SKU.</p>}
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <button onClick={() => copiarSku(false)} disabled={!skuValido}
              className="flex-1 flex justify-center items-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-orange-600/30 disabled:opacity-40">
              <Copy size={15} /> {skuCopyStatus === "copied" ? "Copiado!" : "Copiar SKU"}
            </button>
            <button onClick={() => copiarSku(true)} disabled={!skuValido} title="Copia e soma +1 no ID"
              className="flex-1 flex justify-center items-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-600/30 disabled:opacity-40">
              <Plus size={15} /> {skuCopyStatus === "copied_inc" ? "Copiado +1!" : "Copiar & +1"}
            </button>
          </div>
        </div>

        {/* ERP */}
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-indigo-500 text-white rounded-lg"><FileText size={16} /></div>
            <h3 className="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-white">Descrição ERP</h3>
          </div>

          {isPolitical && (
            <div className="mb-4 p-3 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-[11px] flex gap-2 items-start">
              <AlertTriangle size={15} className="shrink-0 text-amber-500 mt-0.5" />
              <span>Conteúdo político — revise as regras do marketplace (TikTok Shop, etc.) antes de publicar.</span>
            </div>
          )}
          {tagRecomendada && (
            <div className="mb-4 p-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-[11px] flex justify-between items-center gap-2">
              <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><Tag size={14} className="text-indigo-500" /> Tag p/ Tiny ERP</span>
              <button onClick={copiarTag} className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${copiedTag ? "bg-emerald-600 text-white" : "bg-indigo-500/10 text-indigo-500 hover:scale-105"}`}>
                {copiedTag ? "Copiado!" : tagRecomendada}
              </button>
            </div>
          )}

          <Field label="Material">
            <ChipGroup options={MATERIAIS} selected={material} onChange={setMaterial} />
          </Field>
          <Field label="Cor(es) — sempre no masculino">
            <ChipGroup options={CORES_PADRAO} selected={cores} onChange={setCores} />
            <div className="flex gap-2 mt-2">
              <input
                value={customCor} onChange={(e) => setCustomCor(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); adicionarCor(); } }}
                placeholder="Outra cor (ex: cáqui)" className={`${inputClass} !py-2 text-xs`}
              />
              <button onClick={adicionarCor} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-xl shrink-0">Add</button>
            </div>
          </Field>
          <Field label="Tamanho(s)">
            <ChipGroup options={TAMANHOS} selected={tamanhos} onChange={setTamanhos} />
          </Field>
          <Field label="Observações">
            <textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex: edição limitada, coleção Copa..." className={`${inputClass} resize-y min-h-[70px]`} />
          </Field>

          {isVestuario && (
            <div className="mb-3 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-[11px] flex gap-2 items-center">
              <Sparkles size={14} className="text-emerald-500 shrink-0" />
              <span>Aviso de medidas será adicionado automaticamente ao fim da descrição.</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button onClick={gerarErp}
              className="flex-1 flex justify-center items-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-indigo-600/30">
              <FileText size={15} /> Gerar descrição
            </button>
            <button onClick={copiarErp} disabled={!erpPronto}
              className="flex-1 flex justify-center items-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-600/30 disabled:opacity-40">
              <Copy size={15} /> {erpCopyLabel}
            </button>
          </div>

          <pre className="mt-3 bg-slate-100 dark:bg-black/50 border-2 border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap text-slate-800 dark:text-slate-200 min-h-[90px] font-mono overflow-x-auto">
            {output}
          </pre>
        </div>
      </div>

      {/* ── Ações do produto ── */}
      <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
        <button onClick={salvarProduto}
          className="flex justify-center items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-900 dark:bg-slate-200 dark:hover:bg-white dark:text-slate-900 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg">
          <Save size={16} /> Salvar produto (SKU + ERP)
        </button>
        <button onClick={limparTudo}
          className="flex justify-center items-center gap-2 px-5 py-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-black uppercase tracking-wider rounded-xl transition-all">
          <RotateCcw size={15} /> Limpar
        </button>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 sm:ml-2">
          {skuValido && <span className="flex items-center gap-1 text-orange-500"><CheckCircle2 size={13} /> SKU</span>}
          {erpPronto && <span className="flex items-center gap-1 text-indigo-500"><CheckCircle2 size={13} /> ERP</span>}
          {skuValido && erpPronto && <span className="flex items-center gap-1 text-emerald-500"><Link2 size={13} /> vinculados</span>}
        </div>
        {statusMsg && <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 sm:ml-auto">{statusMsg}</span>}
      </div>

      {/* ── Históricos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-10">
        {/* SKUs */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <History size={15} className="text-slate-400" />
            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">SKUs cadastrados</h3>
          </div>
          {skusHist.length ? (
            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {skusHist.map((item) => {
                const erpsLig = erpsHist.filter((e) => e.sku === item.id);
                return (
                  <div key={item.id} className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-orange-500/40 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <code className="font-mono text-sm font-black text-slate-800 dark:text-slate-100 uppercase break-all">{item.sku}</code>
                        <div className="flex flex-wrap gap-1 mt-1 text-[9px] font-bold">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{item.loja === "OUTRA" ? item.customLoja : item.loja}</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{item.categoria === "OUTRA" ? item.customCategoria : item.categoria}</span>
                          {erpsLig.length > 0 && <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 flex items-center gap-1"><Link2 size={10} /> {erpsLig.length} ERP{erpsLig.length > 1 ? "s" : ""}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => reutilizarSku(item)} title="Carregar na base" className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-orange-500/10 hover:text-orange-500 rounded-lg text-slate-500"><Undo2 size={12} /></button>
                        <button onClick={() => copiarHist(item.id, item.sku)} title="Copiar" className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-orange-500 hover:text-white rounded-lg text-slate-500">
                          {histCopiadoId === item.id ? <CheckCircle2 size={12} className="text-green-500" /> : <Copy size={12} />}
                        </button>
                        <button onClick={() => apagar("sku", item.id)} title="Apagar" className={`p-1.5 rounded-lg ${delConfirm === item.id ? "bg-red-500 text-white px-2" : "bg-slate-100 dark:bg-slate-800 hover:bg-red-500/10 hover:text-red-500 text-slate-400"}`}>
                          {delConfirm === item.id ? <span className="text-[9px] font-black uppercase">Confirmar?</span> : <Trash2 size={12} />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center">Nenhum SKU ainda.</p>
          )}
        </div>

        {/* ERPs */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <History size={15} className="text-slate-400" />
            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Descrições ERP</h3>
          </div>
          {erpsHist.length ? (
            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {erpsHist.map((item) => (
                <div key={item.id} className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-500/40 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate block">{item.estampa || "(sem estampa)"}</span>
                      <div className="flex flex-wrap gap-1 mt-1 text-[9px] font-bold">
                        {item.produto && <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{item.produto}</span>}
                        {item.marca && <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{item.marca}</span>}
                        {item.sku && <span className="px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-500 font-mono flex items-center gap-1"><Link2 size={10} /> {item.sku}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => reutilizarErp(item)} title="Carregar" className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-500/10 hover:text-indigo-500 rounded-lg text-slate-500"><Undo2 size={12} /></button>
                      <button onClick={() => copiarHist(item.id, item.output)} title="Copiar" className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-500 hover:text-white rounded-lg text-slate-500">
                        {histCopiadoId === item.id ? <CheckCircle2 size={12} className="text-green-500" /> : <Copy size={12} />}
                      </button>
                      <button onClick={() => apagar("erp", item.id)} title="Apagar" className={`p-1.5 rounded-lg ${delConfirm === item.id ? "bg-red-500 text-white px-2" : "bg-slate-100 dark:bg-slate-800 hover:bg-red-500/10 hover:text-red-500 text-slate-400"}`}>
                        {delConfirm === item.id ? <span className="text-[9px] font-black uppercase">Confirmar?</span> : <Trash2 size={12} />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center">Nenhuma descrição ainda.</p>
          )}
        </div>
      </div>
    </div>
  );
}
