// Press kit data for /brand. The palette is checked against tokens.css by a unit test,
// and the downloadable marks are drawn from it, so the kit cannot drift from the site.

export type Theme = 'dark' | 'light';

export interface PaletteColor { token: string; name: string; role: string; dark: string; light: string }

export const palette: PaletteColor[] = [
  { token: 'surface-0', name: 'Night', role: 'Page background', dark: '#101924', light: '#f5f4ec' },
  { token: 'surface-1', name: 'Room', role: 'Raised sections', dark: '#142230', light: '#edece2' },
  { token: 'surface-3', name: 'Table', role: 'The table in the mark, cards', dark: '#28434a', light: '#e1e6dc' },
  { token: 'line-strong', name: 'Chalk line', role: 'Borders and the ring of the mark', dark: '#78938d', light: '#6b827d' },
  { token: 'text-strong', name: 'Paper', role: 'Headings', dark: '#f5f4ec', light: '#101924' },
  { token: 'text', name: 'Ink', role: 'Body text and the advisers in the mark', dark: '#c4d3d6', light: '#2c3b44' },
  { token: 'accent', name: 'Lamp', role: 'Accent and your seat in the mark', dark: '#d8eeae', light: '#43600f' },
  { token: 'approved', name: 'Approved', role: 'Verdict colour, always with its label', dark: '#a9d88f', light: '#336019' },
  { token: 'rejected', name: 'Rejected', role: 'Verdict colour, always with its label', dark: '#f5a898', light: '#9e3524' },
  { token: 'insufficient', name: 'Insufficient evidence', role: 'Verdict colour, always with its label', dark: '#f2cb72', light: '#7a4e00' },
];

const color = (token: string, theme: Theme) => {
  const entry = palette.find(item => item.token === token);
  if (!entry) throw new Error(`Unknown palette token "${token}".`);
  return entry[theme];
};

/** The table mark: three advisers around the table, and you, highlighted, at the bottom seat. */
export function markSvg(theme: Theme, { background }: { background: boolean }): string {
  const ring = color('line-strong', theme);
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="512" height="512" fill="none">',
    '<title>Boardroom</title>',
    background ? `<rect width="32" height="32" rx="7" fill="${color('surface-0', theme)}"/>` : '',
    `<circle cx="16" cy="16" r="14" stroke="${ring}" stroke-width="1.2" stroke-dasharray="1.5 3"/>`,
    `<rect x="9.5" y="9" width="13" height="14" rx="5.5" fill="${color('surface-3', theme)}" stroke="${ring}" stroke-width="1.2"/>`,
    ...[[16, 4.6], [4.6, 16], [27.4, 16]].map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="2.1" fill="${color('text', theme)}"/>`),
    `<circle cx="16" cy="27.4" r="2.6" fill="${color('accent', theme)}"/>`,
    '</svg>',
    '',
  ].filter(line => line !== '').join('\n');
}

export const markFiles = [
  { file: 'boardroom-mark-dark.svg', theme: 'dark', background: true, label: 'Mark on Night' },
  { file: 'boardroom-mark-light.svg', theme: 'light', background: true, label: 'Mark on Paper' },
  { file: 'boardroom-mark-for-dark-backgrounds.svg', theme: 'dark', background: false, label: 'Transparent, for dark backgrounds' },
  { file: 'boardroom-mark-for-light-backgrounds.svg', theme: 'light', background: false, label: 'Transparent, for light backgrounds' },
] as const;

export const descriptions = {
  short:
    'Boardroom is a local, open-source terminal workspace where a room of AI advisers challenges your plan before you commit. ' +
    'Three advisers argue from selected sources; the decision stays yours. ' +
    'Explore the recorded example or the implemented live workflow, whose real-account qualification remains pending.',
  long:
    'Boardroom is a local, open-source decision workspace for the terminal, licensed under Apache-2.0. ' +
    'Before you commit weeks of work to a plan, you put it in front of a Product Owner, Lead Developer and Marketing Manager. ' +
    'They read your sources, cite them, object and revise; disagreement stays on the record instead of being forced into consensus, ' +
    'and the decision stays with you. Records stay on your machine, with no Boardroom account or server; authorized live calls send selected context to your model providers. ' +
    'The current build, qualified on Windows x64, Linux x64 and macOS arm64, plays a recorded example of the whole journey, ' +
    'from proposal to exported plan and memo. The live workflow with three models from two providers is implemented; real-account qualification remains pending. ' +
    'Durable contributions begin Plan 03; context revisions, pause/resume and a public beta remain planned.',
};

export const wordCount = (text: string) => text.split(/\s+/).filter(word => /[\p{L}\p{N}]/u.test(word)).length;
