

## Atualizar Playbook Las Casas com Versão Elite Baseada no Produto Real

### O que muda

Substituir o playbook genérico atual do Las Casas (linhas 80-89 do `homi-assistant/index.ts`) — que tem apenas 10 linhas — pelo playbook completo baseado no PDF real do produto, com diferenciais concretos, gatilhos mentais, estratégia avançada e scripts específicos.

### Mudança

**Arquivo: `supabase/functions/homi-assistant/index.ts`**

Substituir linhas 80-89 pelo playbook expandido contendo:

- **Posicionamento real**: "Não é loteamento — é bairro planejado com lifestyle"
- **Diferenciais do produto**: Região Ecoville/Zona Norte, vias arborizadas, Praça Edu Las Casas, segurança 24h, controle de acessos, terrenos em condomínio fechado
- **Perfil e psicologia**: Compra emocional (família), justifica com razão (valorização), quer se imaginar vivendo
- **Erros comuns dos corretores**: Vender como lote, falar metragem/preço, não criar imagem mental, mandar tabela direto
- **Scripts específicos**:
  - Abertura: "Esse aqui não é só terreno… é um bairro planejado pra quem quer viver diferente"
  - Conexão: "Normalmente quem olha ele já tá buscando mais espaço e qualidade de vida, faz sentido contigo?"
  - Valor: "Tu não depende só da tua casa… o entorno inteiro já entrega isso"
  - Visualização: "Imagina chegar em casa e ter praça, segurança e espaço pra família tudo no mesmo lugar"
  - Ligação: "Vi teu interesse no Las Casas e te liguei porque ele não é um loteamento comum…"
  - Qualificação: "Tu tá mais buscando casa ou ainda avaliando terreno?"
  - Condução visita: "Esse tipo de projeto só faz sentido quando tu vê o bairro funcionando"
  - Fechamento: "Esse aqui costuma virar chave quando a pessoa pisa lá dentro"
- **Frases de alto impacto**: 5 frases prontas para a IA variar
- **Gatilhos mentais**: Segurança (família), Espaço (liberdade), Valorização (razão), Exclusividade
- **Frase crítica**: "Esse produto não é pra quem quer só preço — é pra quem quer qualidade de vida"

### Arquivo alterado

| Arquivo | Mudança |
|---|---|
| `supabase/functions/homi-assistant/index.ts` | Substituir playbook Las Casas (linhas 80-89) pelo playbook elite completo baseado no produto real |

### O que NÃO muda
- Demais playbooks (Connect JW, Shift, Orygem, Open Bosque, Melnick Day)
- StageCoachBar (já usa templates genéricos que funcionam)
- Nenhuma outra edge function

