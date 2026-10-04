import './privacy.ts';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite';
import { createRequire } from 'node:module';

export function optionalProbeResults() {
  let embeddingRuntimePresent = false;
  try { createRequire(import.meta.url).resolve('@huggingface/transformers'); embeddingRuntimePresent = true; }
  catch { /* An absent optional runtime is a block, not a successful embedding test. */ }
  return {
    embeddings: { status: 'blocked', runtimePresent: embeddingRuntimePresent,
      reason: 'Embedding runtime and model assets are not qualified in this package; no model download is configured. FTS5 is the fallback.' },
    providerStreaming: { status: 'blocked',
      reason: 'No provider account or development budget is configured in this build. Real streaming must be qualified in Plan 02.' },
    cloudTrace: { status: 'blocked',
      reason: 'No authorized cloud trace account is configured. Local filtered trace export is available; cloud telemetry stays off.' },
  };
}

const State = Annotation.Root({ count: Annotation<number>() });
const config = { configurable: { thread_id: 'boardroom-storage-probe-v1' } };

/** Separate feasibility probe; never presented as a live adviser meeting. */
export class StorageProbe {
  private readonly saver: SqliteSaver;
  private readonly graph;

  constructor(dataDirectory: string) {
    mkdirSync(dataDirectory, { recursive: true });
    this.saver = SqliteSaver.fromConnString(join(dataDirectory, 'checkpoints.sqlite'));
    this.saver.db.pragma('journal_mode = WAL');
    this.saver.db.pragma('busy_timeout = 5000');
    this.graph = new StateGraph(State)
      .addNode('increment', state => ({ count: state.count + 1 }))
      .addEdge(START, 'increment').addEdge('increment', END)
      .compile({ checkpointer: this.saver });
  }

  async runCheckpoint(): Promise<number> {
    const state = await this.graph.invoke({ count: 1 }, config);
    return state.count;
  }

  async readCheckpoint(): Promise<number | undefined> {
    const state = await this.graph.getState(config);
    return (state.values as { count?: number }).count;
  }

  checkFts5(): boolean {
    this.saver.db.exec('CREATE VIRTUAL TABLE IF NOT EXISTS temp.fts_probe USING fts5(content)');
    this.saver.db.prepare('DELETE FROM temp.fts_probe').run();
    this.saver.db.prepare('INSERT INTO temp.fts_probe(content) VALUES (?)').run('recorded demonstration');
    const result = this.saver.db.prepare("SELECT count(*) AS count FROM temp.fts_probe WHERE content MATCH 'demonstration'")
      .get() as { count: number };
    return result.count === 1;
  }

  close(): void { this.saver.db.close(); }
}
