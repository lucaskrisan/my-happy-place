export type StoryCheckpoint = 
  | 'scene01-start'
  | 'scene01-call'
  | 'scene02-start'
  | 'scene02-quiz'
  | 'scene02-notification'
  | 'lucia-send-audio'
  | 'whatsapp'
  | 'scene03-start'
  | 'scene03-consequence'
  | 'scene03-quiz'
  | 'future-marina-call-01'
  | 'scene05-mirror';

export interface StoryStepMetadata {
  id: StoryCheckpoint;
  number: string;
  title: string;
  description: string;
  status: 'PRONTO' | 'EM AJUSTE';
  badges?: string[];
}

export const STORY_MAP: StoryStepMetadata[] = [
  {
    id: 'scene01-start',
    number: '01',
    title: 'A PORTA',
    description: 'Marina percebe a chegada de Daniel. O corpo reage antes dela entender.',
    status: 'PRONTO',
  },
  {
    id: 'scene01-call',
    number: '02',
    title: 'MEMÓRIAS + LIGAÇÃO',
    description: 'As lembranças aparecem, Lúcia chama Marina e a ligação da Mamãe invade o presente.',
    status: 'PRONTO',
  },
  {
    id: 'scene02-start',
    number: '03',
    title: 'JANTAR COM DANIEL',
    description: 'Daniel está apenas cansado. Marina começa a procurar um conflito que ainda não existe.',
    status: 'PRONTO',
  },
  {
    id: 'scene02-quiz',
    number: '04',
    title: 'QUIZ DE PREVISÃO',
    description: 'Antes de Marina pedir desculpa, a espectadora tenta prever o que ela fará.',
    status: 'PRONTO',
    badges: ['INTERAÇÃO'],
  },
  {
    id: 'scene02-notification',
    number: '05',
    title: 'NOTIFICAÇÃO DA MAMÃE',
    description: 'A notificação invade a cena e leva Marina novamente até Lúcia.',
    status: 'PRONTO',
  },
  {
    id: 'lucia-send-audio',
    number: '06',
    title: 'LÚCIA ENVIA O ÁUDIO',
    description: 'Lúcia aparece gravando a mensagem antes da conversa no WhatsApp.',
    status: 'PRONTO',
  },
  {
    id: 'whatsapp',
    number: '07',
    title: 'WHATSAPP',
    description: 'A regra aprendida por Marina aparece diretamente na voz da mãe.',
    status: 'PRONTO',
  },
  {
    id: 'scene03-start',
    number: '08',
    title: 'OUTRO DIA',
    description: 'O tempo passa. Clara tenta falar com Daniel e Marina começa a repetir a regra.',
    status: 'PRONTO',
  },
  {
    id: 'scene03-consequence',
    number: '09',
    title: 'A CONSEQUÊNCIA',
    description: 'Daniel permite que Clara fale. Clara recua. Marina percebe o que acabou de fazer.',
    status: 'PRONTO',
    badges: ['NOVO'],
  },
  {
    id: 'scene03-quiz',
    number: '10',
    title: 'AGORA É SOBRE VOCÊ',
    description: 'A história para de perguntar apenas sobre Marina e começa a perguntar sobre a própria espectadora.',
    status: 'PRONTO',
    badges: ['NOVO', 'INTERAÇÃO'],
  },
  {
    id: 'future-marina-call-01',
    number: '11',
    title: 'MARINA DO FUTURO',
    description: 'Depois de responder sobre si mesma, a espectadora recebe a primeira ligação da Marina Renascida.',
    status: 'PRONTO',
    badges: ['NOVO', 'INTERAÇÃO'],
  },
  {
    id: 'scene05-mirror',
    number: '12',
    title: 'O ESPELHO',
    description: 'Marina recebe um elogio, se olha de novo e transforma o próprio reflexo numa inspeção.',
    status: 'PRONTO',
    badges: ['NOVO', 'INTERAÇÃO'],
  },
];