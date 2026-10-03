// Build-time facts read from the application repository.
import workflow from '../../../.github/workflows/ci.yml?raw';
import { countTests, platformsFromWorkflow } from './engineering.ts';

const testSources = Object.values(import.meta.glob<string>('../../../tests/*.test.ts', { query: '?raw', import: 'default', eager: true }));

export const testCount = countTests(testSources);
export const platforms = platformsFromWorkflow(workflow);
