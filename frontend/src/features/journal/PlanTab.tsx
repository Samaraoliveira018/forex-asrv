import { MAX_TRADES_PER_DAY } from '@asrv/backend';
import { Checkbox, Card } from '@asrv/design-system';

const checklistItems = [
  'Verificar calendário de notícias',
  `Respeitar o limite de ${MAX_TRADES_PER_DAY} trades diários (break even não conta)`,
  'Mover o Stop para Break Even ao atingir a primeira parcial',
  'Se a oportunidade passou, registrar o dia sem operação',
];

export function PlanTab({
  checklist,
  onToggle,
}: {
  checklist: readonly boolean[];
  onToggle: (index: number, checked: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      <h1 className="asrv-page-title">Plano Operacional & Disciplina</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <h2 className="asrv-section-title mb-3">Regras de Ouro da Plataforma</h2>
          <div className="asrv-alert asrv-alert--danger space-y-2 text-xs leading-relaxed">
            <p>
              ⚡ <strong>Limite estrito:</strong> Máximo de {MAX_TRADES_PER_DAY} operações por dia.
              Break even não conta para o limite.
            </p>
            <p>
              🛑 <strong>Perda Individual Máxima:</strong> Nenhuma operação pode ter um prejuízo
              superior a 25% do saldo inicial do dia — capital inicial mais o resultado acumulado
              dos dias anteriores (taxas de spread mínimas são tratadas como Break Even).
            </p>
            <p>
              ⚖️ <strong>Break Even (0x0):</strong> Posições encerradas no zero a zero ou com
              pequenas variações de spread preservam o capital e não contam no limite diário.
            </p>
            <p>
              🛡️ <strong>Saber Ficar de Fora:</strong> Registrar dias em que você não operou
              mantém a sua ofensiva ativa!
            </p>
            <p>
              🔥 <strong>Ofensiva &amp; Metas:</strong> Acumule dias de disciplina para alcançar
              os níveis de 3, 7, 14, 30 e 60 dias.
            </p>
          </div>
        </Card>

        <Card>
          <h2 className="asrv-section-title mb-3">Checklist Operacional</h2>
          <div className="space-y-3">
            {checklistItems.map((item, index) => (
              <Checkbox
                key={item}
                label={item}
                checked={checklist[index] ?? false}
                onChange={(checked) => onToggle(index, checked)}
              />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
