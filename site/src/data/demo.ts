// Build-time bridge from the repository's own artifacts to the site.
// Changing the fixture, the retained export or the capture changes the site.
import meeting from '../../../assets/demo/meeting.json';
import context from '../../../assets/demo/context.md?raw';
import cast from '../../../docs/media/recorded-example.cast?raw';
import screen from '../../../docs/media/terminal-screen.txt?raw';
import memo from '../../../docs/validation/recorded-export/memo.md?raw';
import plan from '../../../docs/validation/recorded-export/plan.md?raw';
import { buildStory, readExportedSourceHash } from './story.ts';

export const story = buildStory(meeting, context);
export const sourceLines = context.replace(/\r?\n$/, '').split(/\r?\n/);
export const exportedPlan = plan.trimEnd();
export const exportedMemo = memo.trimEnd();
export const sourceHash = readExportedSourceHash(memo);
export const terminalScreen = screen.trimEnd();
export const captureTitle = (JSON.parse(cast.split('\n', 1)[0] ?? '{}') as { title?: string }).title ?? 'BOARDROOM';
