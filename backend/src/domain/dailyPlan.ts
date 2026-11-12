export const OFFENSIVE_INTERVAL = 30;
export const MAX_DAILY_TRADES = 2;

export function dailyLossLimit(openingBalance: number): number {
  return Math.round(Math.max(0, openingBalance) * 10 + 1e-8) / 100;
}

export const CHECKLIST_SECTIONS = [
  { title: 'Estado mental', fields: [
    { id: 'feeling', label: 'Como estou me sentindo hoje?', kind: 'text' },
    { id: 'sleep', label: 'Tive uma boa noite de sono.' },
    { id: 'physical', label: 'Estou fisicamente bem.' },
    { id: 'emotional', label: 'Estou emocionalmente estável.' },
    { id: 'commitment', label: 'Estou disposto(a) a seguir meu plano operacional.' },
    { id: 'risk', label: 'Gestão de risco definida.' },
  ] },
  { title: 'Pré-trading', fields: [
    { id: 'preTrading', label: 'Realizei meu pré-trading antes de operar.' },
    { id: 'activity', label: 'Qual atividade realizei hoje?', kind: 'text' },
  ] },
  { title: 'Preparação para o mercado', fields: [
    { id: 'news', label: 'Verifiquei as notícias do dia.' },
    { id: 'overview', label: 'Fiz meu 360°.' },
    { id: 'assets', label: 'Ativos escolhidos para operar hoje', kind: 'text' },
  ] },
  { title: '1 · Captura da liquidez diária', fields: [
    { id: 'dailyLiquidity', label: 'O preço capturou a máxima (PDH) ou a mínima (PDL) do dia anterior.' },
  ] },
  { title: '2 · Tendência macro', fields: [
    { id: 'trend', label: 'Direção predominante', options: ['Alta', 'Baixa'] },
    { id: 'bias', label: 'Viés operacional', options: ['A favor da macroestrutura', 'Contra a macro apenas em último caso'] },
  ] },
  { title: '3 · Tendência mediana', hint: 'Em baixa, observe a captura do PDH e dos topos da correção. Em alta, observe a captura do PDL e dos fundos da correção.', fields: [
    { id: 'correction', label: 'Identifiquei o movimento corretivo.' },
    { id: 'priceZone', label: 'Região do preço', options: ['Cara', 'Barata'] },
    { id: 'asiaLiquidity', label: 'Capturou a máxima ou mínima da Ásia.' },
  ] },
  { title: '4 · Tendência micro e CHoCH', fields: [
    { id: 'microLiquidity', label: 'Capturou uma liquidez importante.' },
    { id: 'poi', label: 'Reagiu em um POI (Order Block) válido.' },
    { id: 'imbalance', label: 'Gerou ineficiência com movimento agressivo.' },
    { id: 'structure', label: 'Quebrou uma estrutura válida.' },
  ] },
  { title: '5 · Projeção de contexto', fields: [
    { id: 'fibonacci', label: 'Projetei a Fibonacci de extensão.' },
    { id: 'ote', label: 'Identifiquei níveis de OTE (Premium e Discount).' },
    { id: 'orderBlocks', label: 'Marquei os Order Blocks válidos.' },
    { id: 'fvg', label: 'Na ausência de Order Block, utilizei um FVG.' },
  ] },
  { title: '6 · Entrada', fields: [
    { id: 'internalLiquidity', label: 'Aguardei o ativo gerar liquidez interna.' },
    { id: 'internalSweep', label: 'Aguardei a captura da liquidez interna.' },
    { id: 'microReaction', label: 'O preço reagiu no Order Block da microestrutura.' },
    { id: 'entry', label: 'Entrada executada.' },
  ] },
  { title: '7 · Gerenciamento', fields: [
    { id: 'stop', label: 'Stop posicionado em 110% da Fibonacci.' },
    { id: 'targetFib', label: 'Alvo: Fibonacci de extensão (100%).' },
    { id: 'targetExternal', label: 'Alvo: liquidez externa.' },
    { id: 'targetPreviousDay', label: 'Alvo: captura de PDL ou PDH.' },
    { id: 'targetAsia', label: 'Alvo: máxima ou mínima da Ásia.' },
    { id: 'targetOrderBlock', label: 'Alvo: ponto de parada do preço (Order Block válido).' },
  ] },
  { title: 'Pós-operação', fields: [
    { id: 'journal', label: 'Preenchi minha planilha.' },
    { id: 'riskFollowed', label: 'Respeitei meu gerenciamento de risco.' },
    { id: 'planFollowed', label: 'Segui meu plano operacional.' },
    { id: 'score', label: 'Nota para minha execução', options: ['1', '2', '3', '4', '5'] },
    { id: 'lesson', label: 'Maior aprendizado de hoje', kind: 'text' },
  ] },
] satisfies { title: string; hint?: string; fields: { id: string; label: string; kind?: 'text'; options?: string[] }[] }[];

export interface DailyPlan {
  date: string;
  lossLimit: number | null;
  answers: Record<string, boolean | string>;
}

export function isWeekend(date: string): boolean {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

export function offensiveMilestones(streak: number): number[] {
  const block = Math.max(0, Math.floor((streak - 1) / 150));
  return Array.from({ length: 5 }, (_, i) => block * 150 + (i + 1) * OFFENSIVE_INTERVAL);
}

export function grossLoss(trades: readonly { pnl: number }[]): number {
  return trades.reduce((sum, trade) => sum + Math.round(Math.max(0, -trade.pnl) * 100), 0) / 100;
}
