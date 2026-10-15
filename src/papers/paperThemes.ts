export type PaperTheme = {
  id: string;
  name: string;
  backgroundColor: string;
  textColor: string;
  css: string;
  pdfCss: string;
};

const glitterCss = `
  background-image:
    radial-gradient(circle at 7px 8px, rgba(255,255,255,0.95) 0 1px, transparent 2px),
    radial-gradient(circle at 23px 19px, rgba(205,135,174,0.55) 0 1px, transparent 2px),
    radial-gradient(circle at 14px 29px, rgba(255,255,255,0.9) 0 1.2px, transparent 2.5px);
  background-size: 32px 32px;
`;

export const PAPER_THEMES: PaperTheme[] = [
  {
    id: 'plain-cream',
    name: 'Krem',
    backgroundColor: '#FFFDF8',
    textColor: '#55463F',
    css: '',
    pdfCss: 'background-color: #FFFDF8;',
  },
  {
    id: 'lavender',
    name: 'Lavanta',
    backgroundColor: '#F0E6F5',
    textColor: '#604B6D',
    css: '',
    pdfCss: 'background-color: #F0E6F5;',
  },
  {
    id: 'blush',
    name: 'Pudra',
    backgroundColor: '#FFF0F1',
    textColor: '#6E4B50',
    css: '',
    pdfCss: 'background-color: #FFF0F1;',
  },
  {
    id: 'glitter-pink',
    name: 'Simli Pembe',
    backgroundColor: '#FFF0F6',
    textColor: '#75465F',
    css: glitterCss,
    pdfCss: `background-color: #FFF0F6; ${glitterCss}`,
  },
];