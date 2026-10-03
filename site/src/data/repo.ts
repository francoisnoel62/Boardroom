// Build-time facts read from the application repository.
import workflow from '../../../.github/workflows/ci.yml?raw';
import cliSource from '../../../src/cli.ts?raw';
import terminalSource from '../../../src/terminal-validation.tsx?raw';
import { exitCodesIn, handledCommands, parseHelp } from './cli.ts';
import { countTests, platformsFromWorkflow } from './engineering.ts';

const testSources = Object.values(import.meta.glob<string>('../../../tests/*.test.ts', { query: '?raw', import: 'default', eager: true }));

export const testCount = countTests(testSources);
export const platforms = platformsFromWorkflow(workflow);
export const help = parseHelp(cliSource);
export const commands = handledCommands(cliSource);
export const exitCodes = exitCodesIn([cliSource, terminalSource]);
