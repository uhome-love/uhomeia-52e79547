const TYPESENSE_HOST = Deno.env.get('TYPESENSE_HOST')!;
const TYPESENSE_SEARCH_API_KEY = Deno.env.get('TYPESENSE_SEARCH_API_KEY')!;
const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN')!;
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')!;
const UHOMESITE_URL = Deno.env.get('UHOMESITE_URL') || 'https://uhome.com.br';

function slugify(t: string) { return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-').replace(/-+/g,'-'); }
function gerarSlug(imovel: any) { const tipo = slugify(imovel.tipo.split(' ')[0]); const dorms = imovel.dormitorios > 0 ? `${imovel.dormitorios}-quartos` : ''; const bairro = slugify(imovel.bairro); return [tipo, dorms, bairro, imovel.codigo].filter(Boolean).join('-'); }

Deno.serve(async () => {
  const params = new URLSearchParams({ q: 'Petrópolis Moinhos de Vento apartamento', query_by: 'bairro,tipo,titulo', filter_by: 'valor_venda:>=400000 && valor_venda:<=700000 && dormitorios:>=2', sort_by: 'destaque:desc', per_page: '3' });
  const r = await fetch(`https://${TYPESENSE_HOST}/collections/imoveis/documents/search?${params}`, { headers: { 'X-TYPESENSE-API-KEY': TYPESENSE_SEARCH_API_KEY } });
  const resultado = await r.json();
  const imoveis = (resultado.hits || []).map((h: any) => h.document);
  if (imoveis.length === 0) return new Response(JSON.stringify({ erro: 'Nenhum imóvel encontrado', total_hits: resultado.found }), { headers: { 'Content-Type': 'application/json' } });

  const imovel = imoveis[0];
  const link = UHOMESITE_URL + '/imovel/' + gerarSlug(imovel);
  const preco = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(imovel.valor_venda || 0);

  const payload = { messaging_product: 'whatsapp', to: '5551992597097', type: 'template', template: { name: 'vitrine_imoveis_personalizada', language: { code: 'pt_BR' }, components: [{ type: 'body', parameters: [{ type: 'text', text: 'Lucas' }, { type: 'text', text: imovel.titulo }, { type: 'text', text: imovel.bairro }, { type: 'text', text: imovel.tipo }, { type: 'text', text: preco }, { type: 'text', text: link }] }] } };
  const wr = await fetch(`https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, { method: 'POST', headers: { Authorization: 'Bearer ' + WHATSAPP_ACCESS_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const wres = await wr.json();

  return new Response(JSON.stringify({ sucesso: wr.ok, imoveis_encontrados: imoveis.length, melhor_match: { titulo: imovel.titulo, bairro: imovel.bairro, tipo: imovel.tipo, preco: preco, link }, resposta_meta: wres }), { headers: { 'Content-Type': 'application/json' } });
});
