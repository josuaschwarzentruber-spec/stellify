export interface SearchItem {
  id: string;
  type: 'job' | 'tip';
  title: string;
  category: string;
  location?: string;
  content: string;
  link: string;
}

export const searchData: SearchItem[] = [
  {
    id: 'j1',
    type: 'job',
    title: 'Senior Software Engineer',
    category: 'IT & Software',
    location: 'Zürich',
    content: 'Wir suchen einen erfahrenen Full-Stack Entwickler für unser Fintech-Startup in Zürich. Fokus auf React und Node.js.',
    link: '#jobs/j1'
  },
  {
    id: 'j2',
    type: 'job',
    title: 'Marketing Manager',
    category: 'Marketing',
    location: 'Genf',
    content: 'Verantwortung für die digitale Strategie im Schweizer Markt. Fließend Deutsch und Französisch erforderlich.',
    link: '#jobs/j2'
  },
  {
    id: 'j3',
    type: 'job',
    title: 'Projektleiter Bau',
    category: 'Baugewerbe',
    location: 'Bern',
    content: 'Leitung von Grossprojekten im Bereich Infrastruktur. Langjährige Erfahrung in der Schweiz von Vorteil.',
    link: '#jobs/j3'
  },
  {
    id: 't1',
    type: 'tip',
    title: 'Der perfekte Schweizer Lebenslauf',
    category: 'Bewerbung',
    content: 'In der Schweiz sind Foto und Geburtsdatum im CV weiterhin Standard. Erfahre, worauf HR-Manager besonders achten.',
    link: '#tips/t1'
  },
  {
    id: 't2',
    type: 'tip',
    title: 'Lohnverhandlung in der Schweiz',
    category: 'Karriere',
    content: 'Wie du dein Gehalt in CHF verhandelst. Tipps zu 13. Monatslohn und Bonus-Strukturen.',
    link: '#tips/t2'
  },
  {
    id: 't3',
    type: 'tip',
    title: 'Networking-Events in Zürich',
    category: 'Networking',
    content: 'Die besten Orte, um in der Zürcher Tech-Szene Fuss zu fassen und wertvolle Kontakte zu knüpfen.',
    link: '#tips/t3'
  }
];
