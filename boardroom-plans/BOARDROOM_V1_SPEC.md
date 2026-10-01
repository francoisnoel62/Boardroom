# BOARDROOM — V1 product and architecture specification

**Status:** approved V1 reference. The user explicitly confirmed shared understanding on 2026-10-01, closing the design interview. This confirmation does not initiate development. Technical feasibility and integration checks listed below remain outstanding.

**Date:** 2026-10-01.

**Basis:** the original `BOARDROOM_plan_global_metier.md` and the subsequent design interview. Where they differ, the user's interview decisions take precedence. Public product documentation and the interface will be in English; discussion language is selected per project.

## 1. The product we are building

BOARDROOM is a local, open-source decision workspace in which a human and three specialist AI advisers examine a question, investigate its context, challenge proposals, and produce a better plan.

The human is a participant in the discussion and the final decision maker. Disagreement can remain at the end. A polished synthesis must not erase objections, missing evidence, or an agent's dissent.

The project serves two connected purposes:

- Help its creator and other technical founders make strategic and technical decisions with fewer avoidable corrections after implementation.
- Serve as a flagship senior AI engineering portfolio project that a recruiter can install, use, inspect, and evaluate directly.

A real multi-agent discussion is a product requirement. A single-model baseline may be useful during development, but replacing the multi-agent experience is outside the agreed direction. Public evaluation through actual use and a convincing first experience take priority over producing a standalone benchmark report.

### V1 commitments

- Local application for Windows, macOS, and Linux, with a terminal interface and simple installation and configuration.
- TypeScript core with LangGraph orchestration; no mandatory BOARDROOM account or hosted BOARDROOM backend.
- Three advisers: **Product Owner**, **Lead Developer**, and **Marketing Manager**.
- Configurable role-to-model mapping; the initial live scenario uses three distinct models from at least two providers.
- Live discussion, human interventions, contextual investigations, permissions, local memory, persistent recovery, and inspectable evidence.
- Model API credentials supplied by the user. Official subscription integrations added progressively, with ChatGPT and Claude as first candidates.
- Optional Langfuse Cloud Hobby observability through a personal account. The application works without it.
- A clearly labelled recorded example that is available before connecting any model accounts, followed by real meetings using the user's connections.

No development deadline has been imposed. There is no agreed unlimited spending authorization: any development, signing, hosting, or provider costs remain separate from the product's configurable meeting budgets.

### Outside V1

A graphical/web interface is optional future work. Autonomous execution agents, recurring meetings, event-triggered monitoring, a complete experiment-management system, longitudinal adviser scoring, hosted multi-tenant SaaS, collaboration between human accounts, and payments are not V1 commitments.

These exclusions do not prevent advisers from proposing an experiment or recommending future actions in a plan. V1 records such proposals without implementing a separate operational management system around them.

## 2. Design tree and decision status

```text
BOARDROOM V1
├── Purpose [settled]
│   ├── Personal decision support and technical-founder beta
│   ├── Senior AI engineering flagship; public source
│   └── Recruiter evaluates by using the product
├── Delivery [settled constraints; technical validation required]
│   ├── Local Windows / macOS / Linux
│   ├── Terminal first; English UI and public docs
│   └── TypeScript + LangGraph; implementation details delegated
├── Meeting [settled]
│   ├── Three roles and configurable models
│   ├── Human participates and decides
│   ├── Duration target + budget + explicit extension
│   ├── Independent analysis → confrontation → revision and final views
│   └── Common versioned proposal; dissent remains visible
├── Knowledge [settled]
│   ├── Explicit project folders and sources
│   ├── Local preparation and source versions
│   ├── Evidence and statements retain their provenance
│   └── History retained; approved knowledge selectively reused
├── Tools and permissions [settled product rules]
│   ├── Local retrieval, web, MCP, and commands
│   ├── Agents request information or narrowly scoped permissions
│   ├── Once / remember a limited project rule / deny
│   ├── Independent work continues while affected work waits
│   └── Originals are always preserved; unsupported tools stay blocked
├── Observability [settled]
│   ├── Optional personal Langfuse account
│   ├── Content-free metrics/events by default
│   └── Diagnostic content is an explicit per-project setting
└── First-use experience [settled]
    ├── Recorded fictional SaaS launch example, clearly labelled
    ├── Live mode after connecting accounts
    └── Question + context are sufficient; an existing plan is optional
```

The user has confirmed the complete interpretation represented here. Engineering experiments described below validate feasibility; they are not evidence that the proposed implementation already works.

## 3. First-use and meeting experience

### First launch

The user can immediately explore an example meeting about launching a fictional SaaS product. Its documents, data, and recorded status are visibly identified as demonstration material. Replay does not suggest that new model calls are running.

The example should demonstrate a concrete improvement: a sourced objection changes the proposal, another adviser revises its position, and the final plan preserves any remaining disagreement. Product scope, engineering feasibility, and acquisition strategy give each of the three roles a meaningful contribution.

Live mode guides the user through model connections and project selection. Configuration exposes a small number of ordinary controls, with advanced rules available when needed. Observability setup is optional and must not be required to start a meeting.

### Starting a meeting

A question and project context are sufficient. The user may also attach an existing plan. The PO helps turn an ambiguous question into an actionable question and prepares an initial proposal where necessary.

The meeting records its decision question, relevant constraints, selected roles/models, source snapshot, discussion language, duration target, and budget settings. The human can correct the framing before consequential work proceeds.

### During the meeting

The terminal presents a shared readable conversation. Each intervention identifies its role and model. Visible messages are concise arguments, requests, responses, and reasoning summaries. Sources, tool results, and additional details can be opened on demand.

The user can address an adviser, add information, ask for an investigation, suspend work, or request a conclusion. Ordinary contributions enter the discussion at the next appropriate intervention. A structural change to the problem, constraints, or proposal pauses affected work and creates a new context version. Earlier work remains attributable to its original context.

A pending permission or missing fact blocks only work that depends on it. Independent work continues. Silence, elapsed time, a timeout, or another agent's suggestion never counts as user approval.

### Completing the meeting

The system produces a new plan and a concise decision memo. The memo identifies material changes, evidence, remaining objections and unknowns, and each adviser's final view. The human can accept, reject, modify, defer, or request further investigation; that human decision is recorded separately.

The interface must distinguish a complete result from a partial result caused by a stop, missing adviser, insufficient budget, or unresolved requirement. Missing votes cannot be displayed as approvals.

## 4. Debate rules

The initial analyses are independent: agents receive the shared factual baseline without seeing one another's initial conclusions. Subsequent investigations can introduce different evidence, whose provenance remains visible.

During confrontation, agents target specific assertions or proposal elements. An objection should explain why it could affect the decision and, where possible, suggest a correction, mitigation, or way to resolve uncertainty. Repetition without new information is not a reason to consume the remaining budget.

The program controls phase progression, work scheduling, limits, and intervention routing. The PO authors the common proposal; the Lead Developer and Marketing Manager can challenge and amend it. There is no fourth moderator adviser in V1.

Final views reference the same immutable proposal version. Each view contains:

- Verdict: `APPROVED`, `REJECTED`, or `INSUFFICIENT_EVIDENCE`.
- A confidence score from 0 to 100, defined as the agent's declared assurance in its own view.
- A justification, critical uncertainty, and any conditions.
- Links to relevant claims, evidence, and objections.

Confidence is not presented as an empirically calibrated probability of business success. It is not a voting weight that can override the human. A materially changed proposal needs renewed views; prior votes remain attached to their old version.

Two approvals and one rejection are a valid meeting outcome. The system does not extend the meeting automatically to manufacture unanimity. Agents may maintain evidence-backed objections to the human's assertions after the human chooses a course of action.

## 5. Time, usage, and failure handling

The ordinary control is a **duration target**, accompanied by a **cost ceiling** where monetary usage applies. A fixed number of rounds is not the main user-facing control. Explicit user pauses do not consume the duration target.

The scheduler reserves capacity for revision and final views and can conclude early when useful work is complete. The user can ask to conclude or explicitly extend the limits. Reaching a hard limit can yield a labelled partial result; it is not permission to overrun that limit.

Usage reporting distinguishes estimates, provider-reported usage, subscription quota information, and unavailable information. An unavailable value is never displayed as zero. Subscription access is not represented as unlimited free API access. There is no automatic switch to a separately billed API when a subscription route fails or runs out of quota.

On a model failure, the system asks the user whether to retry, replace the model, continue with fewer advisers, or stop. Unrelated work may continue where safe. A replacement is recorded explicitly.

Completed interventions and tool results are persisted. Recovery resumes at the last coherent point rather than replaying completed work. An interrupted external action with an uncertain outcome must be inspected or resolved before another execution is offered; it cannot be blindly repeated.

## 6. Project knowledge and evidence

A named project explicitly attaches folders and other sources. Agents may consult the whole authorized project, with configurable exclusions. They do not automatically inherit access to other projects. Provider authorization, source access, and tool authorization are separate concerns.

V1 ingests text, Markdown, source code, textual PDFs, and DOCX. OCR, images as primary knowledge documents, and complex spreadsheet interpretation are future capabilities. Unsupported or incompletely parsed content must be reported rather than silently presented as fully understood.

Storage, extraction, and indexing are local by default. Authorized models receive relevant passages and can request further material. An additional external indexing or extraction service would require explicit enablement.

Each source has an identity, revision/content hash, original location, and extraction metadata. Citations resolve to the exact source version and a meaningful locator: page, section, paragraph, or lines where available. File changes are detected; an explicit refresh updates the meeting's context and retains previous versions used in the discussion.

Claims retain whether they are facts supported by cited material, assumptions, opinions, or unknowns. A citation does not automatically establish a source's correctness. Conflicting sources and unresolved interpretations stay visible. Text inside documents and tool results cannot grant permissions or override product policies.

The full meeting history is retained for consultation. Approved decisions and explicitly retained knowledge can be retrieved for later meetings. Reusing a hypothesis does not silently promote it to a fact.

## 7. Actions, consent, and original preservation

Agents must be able to state what they need to proceed: a missing document, a clarification, a web lookup, a command, or permission to create an artifact. The application represents an actionable request as structured data, not merely prose in the conversation.

A request displays the action, purpose, target, relevant arguments, and scope. The user can authorize it once, remember a narrowly scoped rule for the project, or deny it. Rules remain inspectable and revocable. Authorizations are checked at execution time as well as when a task is prepared.

**Original project documents are always preserved.** An agent's writing request can create new files or work on copies; even an approved request does not implicitly remove this invariant. New plans and memos are written to distinct output locations.

MCP, a tool description, or a prompt instruction is not by itself an enforcement boundary. Commands and local tool servers that can reach the filesystem or network need controls appropriate to their actual execution environment. Copying a workspace alone does not prevent a process from reaching original files elsewhere on the machine.

The user has confirmed the unavailable-isolation behavior: **the meeting and available investigations continue, and the application offers guided setup only when the unavailable tool is useful.** A command remains blocked until its required protection is available. Secure command setup is not a prerequisite for every first meeting.

The exact cross-platform enforcement is an engineering validation point. It must be resolved before a command capability is advertised as available under these rules. The product must accurately show unsupported capabilities instead of silently weakening preservation guarantees. In particular, an OS sandbox for shell commands does not automatically cover local or remote MCP servers. Their launch environment, credentials, and actual capabilities require separate enforcement.

## 8. Model connections

All supported routes implement a common capability description, while preserving their actual differences: model availability, streaming, structured output, tool calling, authentication, metering, and cancellation.

The initial live experience is multi-provider. API credentials are user-supplied and stored separately from shareable project configuration, meeting exports, and logs. Official subscription integrations are added progressively, with ChatGPT and Claude as first candidates. They are not a universal interchangeable OAuth feature.

Current primary-source findings establish candidate routes:

- OpenAI documents eligible Responses requests through Sign in with ChatGPT for local and open-source applications. Account/model eligibility and preview restrictions must be checked in the integration.
- Anthropic documents conditions for integrating the unmodified Claude Code binary with the user's own authentication. This is distinct from offering BOARDROOM's own Claude subscription OAuth flow or assuming universal Agent SDK entitlement.
- Gemini CLI documents Google login and headless operation, but third-party reuse of its OAuth backend is restricted. Its exact subscription integration is not a V1 release prerequisite.

A provider integration does not count as complete until it has been exercised end to end with the relevant account type, permissions, interruption, usage reporting, and recovery behavior. No such implementation validation has occurred during this interview.

## 9. Observability and privacy

Langfuse Cloud Hobby is the chosen first external integration. The developer uses a personal account for their own tests; other users can optionally connect their accounts. There is no default centralized upload to a BOARDROOM account, and the product works without cloud observability.

By default, export metrics and events without document text, conversation contents, or tool-result contents. Diagnostic payloads are an explicit per-project option with secret filtering. Event names, attributes, errors, paths, and metadata also need review; hiding model inputs and outputs alone is insufficient.

Useful events include meeting and phase transitions, model latency, reported usage, retrieval counts, permission outcomes, failures, and recovery. Diagnostic mode can add the permitted content needed to explain a run.

Cloud traces are not the decision registry or the only recovery record. Durable project memory remains local. Observability export failures must not stop the decision workflow. Free-plan usage and export queues need bounds; exact quota-overrun behavior must be verified before promising a strict no-cost operating policy.

## 10. Architecture proposal

The user has delegated reversible choices of libraries, local storage, and code organization, provided tradeoffs are documented. Changes to user experience, privacy, cost, or distribution remain reviewable product decisions.

The proposed boundaries are:

| Module | Responsibility and stable boundary |
|---|---|
| Terminal client | Render shared conversation, setup, evidence inspection, decisions, and explicit consent. Does not own meeting state. |
| Meeting application service | Start, suspend, intervene, conclude, and resume; expose events and commands to clients. |
| LangGraph orchestration | Execute the debate phases and dependency-aware work, with durable checkpoints. |
| Domain and persistence | Projects, context versions, proposal versions, claims, objections, stances, human decisions, permissions, and durable action records. |
| Provider adapters | Normalize the usable interface while exposing route-specific capabilities and limitations. |
| Knowledge service | Ingest authorized sources, version extracted content, retrieve passages, and resolve citations. |
| Policy and action broker | Translate requests into reviewable capabilities, evaluate consent, enforce execution bounds, and record results. |
| Local execution adapters | Implement filesystem, network, command, and MCP behavior under platform-specific constraints. |
| Export service | Produce a new plan, memo, and optional sanitized meeting record without overwriting originals. |
| Observability adapter | Produce bounded optional cloud exports under per-project data policy. |

### Delegated technical selections

These are the proposed implementation choices, based on primary-source research. None has been installed or tested as a BOARDROOM application during the interview.

| Area | Selection | Reason and required validation |
|---|---|---|
| Runtime and delivery | Node 24 LTS bundled in a package for each supported OS/architecture, with application code, assets, and prepared native dependencies. | The end user does not install Node. A package may contain several files; a universal single binary is not a requirement. Validate clean-machine launch, paths, native ABI, updates, and applicable platform signing. |
| Terminal | Ink and React, behind the terminal-client boundary. | Suitable for interactive layout and input. Validate streaming without disrupting typing, multiline paste, resize, cancellation, Unicode, and terminal compatibility. |
| Orchestration | LangGraph JavaScript/TypeScript, with explicit application-owned state and events. | Keep workflow mechanics separate from product rules and action permissions. Provider agents do not become independent authorities over the project. |
| Workflow checkpoints | Official `@langchain/langgraph-checkpoint-sqlite` / `SqliteSaver`. | Its current dependency on `better-sqlite3` is a native distribution constraint. Pin and test the compatible dependency set rather than silently replacing its driver. |
| Durable domain data | SQLite through the same compatible native-driver family, with short transactions and a local write coordinator. | Store projects, proposals, decisions, evidence links, permission records, action receipts, and source manifests locally. Use disk outside the installation package. |
| Source snapshots | Content-addressed extracted/source snapshots and explicit manifests in application data. | A revision is not overwritten when the source changes. Hashes identify what was used; this is application-level version preservation, not a claim of tamper-proof storage against the machine owner. |
| Retrieval | SQLite FTS5 lexical search plus a replaceable local embedding/ranking component. | Keep exact identifiers useful for code and add semantic retrieval without a separate database service. Confirm FTS5 in the distributed driver. Retrieval parameters and the embedding model are engineering choices to validate on representative project material. |
| Local embeddings | Transformers.js / ONNX Runtime as the initial candidate, running outside the terminal's main work path. | Evaluate CPU use, English/French/code retrieval, model licensing, model-download size, RAM, and packaging. Lexical retrieval remains usable while optional semantic assets are unavailable; report the active capability accurately. |
| Document extraction | Text/Markdown/code with stable source offsets; PDF.js for textual PDF; Mammoth for DOCX semantic extraction. | Preserve PDF physical-page references. For DOCX, use saved section/block references rather than pretending to know Word page numbers. Report extraction limitations. |
| Runtime schemas | Versioned structured schemas for events, proposals, stances, tool requests, and saved state. | Validate model and tool output before it changes domain state; schema validation does not establish factual truth or grant authority. |
| Exports | UTF-8 Markdown for the plan and memo, with an optional structured JSON meeting export. | Portable, inspectable, and independent of any cloud account. Export sanitization and original-preservation rules apply. Native Word/PDF export is not needed to ingest those formats. |
| Observability | Langfuse's TypeScript/LangGraph integration behind an application-controlled filtering/export adapter. | Confirm that all exported fields comply with the selected project policy; callbacks alone are not proof that the export is content-free. |

**Why not select Bun compilation immediately?** The consulted official LangGraph SQLite checkpointer depends on `better-sqlite3 ^12.10.0`, whose native code uses Node/V8 interfaces. The newer driver major version 13 migrates to Node-API but is outside that dependency range. Bun's Node-API support therefore does not establish compatibility with this selected checkpointer. Bundled Node is the conservative initial distribution choice. Reconsidering Bun later remains possible after a compatible dependency set is demonstrated. Sources: [checkpointer manifest](https://raw.githubusercontent.com/langchain-ai/langgraphjs/main/libs/checkpoint-sqlite/package.json), [driver v12 native source](https://raw.githubusercontent.com/WiseLibs/better-sqlite3/v12.10.0/src/better_sqlite3.cpp), [driver v13 release](https://github.com/WiseLibs/better-sqlite3/releases/tag/v13.0.0), [Bun Node-API](https://bun.sh/docs/runtime/node-api).

### Persistence and recovery boundaries

Keep the durable product records separate in responsibility from LangGraph's checkpoints. A practical initial layout is a domain database, a workflow-checkpoint database, and a source/artifact store within application data. An index is rebuildable; decisions and action receipts are authoritative records.

SQLite WAL permits concurrent readers but one writer at a time and requires local storage. Serialize local writes as needed while allowing model and investigation work to run concurrently. Do not keep a database transaction open while waiting for a network response or human input. [SQLite WAL](https://www.sqlite.org/wal.html#concurrency)

The action ledger assigns a stable identifier before an external action begins and records its result independently of graph progress. On resume, the workflow reconciles its checkpoint with those receipts. Cross-database atomicity is not assumed. An uncertain action outcome becomes a visible recovery case rather than an automatic retry.

### Platform and adapter gates

The initial prototype must exercise the **complete packaged path**, including the native SQLite addon, PDF assets/workers, candidate embedding runtime, provider streaming, terminal input, and optional trace export. The existence of compatible-looking libraries is insufficient proof of an installable product.

Command execution uses a platform-specific adapter with explicit filesystem and network bounds. Established sandboxes can inform this implementation, but their guarantees and prerequisites differ. Codex documents platform-dependent isolation and separate handling for MCP; Windows configuration can require administrator consent. Claude Code's documented sandbox does not cover native Windows. These are reasons for capability detection and guided setup, not reasons to downgrade protections silently. [Codex permissions](https://learn.chatgpt.com/docs/permissions), [Windows sandbox](https://learn.chatgpt.com/docs/windows/windows-sandbox), [Claude sandboxing](https://code.claude.com/docs/en/sandboxing)

Subscription/native-agent adapters must expose tool requests to the same policy boundary or run with equivalent verified restrictions. If a route cannot honor a required permission or provenance capability, it is shown as unsupported for that operation. A provider's independent tool loop must not bypass BOARDROOM's approved scopes.

## 11. Delivery sequence and acceptance evidence

This is an implementation sequence for a later authorized build, not permission to start coding now.

1. **Validate the installation and capability boundary.** Exercise a minimal TypeScript/LangGraph process, persistent checkpoint, terminal stream, representative PDF/DOCX ingestion, and controlled tool execution on all target OSs. Identify any prerequisites before committing to a distribution claim.
2. **Deliver one complete live decision.** Question/context → three independent views → targeted discussion → versioned proposal → three final views → human decision → new plan and memo. Real providers, not a replay, establish this path.
3. **Make intervention and recovery reliable.** Add structural context updates, permission waiting, model failures, cancellation, restart, and ambiguous-action handling. Verify that completed work and original files are preserved.
4. **Complete project knowledge and memory.** Add source refresh, meaningful citations, historical decisions, and permission-scoped retrieval across supported formats.
5. **Complete onboarding and integrations.** Package clean installs, the recorded SaaS example, connection discovery, optional official subscription paths, and optional Langfuse export with content controls.
6. **Prepare the public beta.** Confirm reproducible setup, public documentation, support diagnostics, sample-data provenance, dependency distribution obligations, and appropriate release/signing arrangements. A license and any paid release infrastructure require concrete review before publication or purchase.

Meaningful release checks include:

- A live three-role meeting using three models and at least two providers.
- An objection that can be traced to a source version and a documented proposal revision.
- A dissenting or insufficient-evidence final view displayed correctly.
- Human intervention while work is running, with affected and unaffected tasks handled correctly.
- A denied write or command that cannot modify protected originals.
- A restart after an intervention or tool result without duplicate completed actions.
- Correct display of unknown usage and explicit handling of exhausted quotas.
- A clean first-use path on Windows, macOS, and Linux.
- Observability off, metrics-only, and explicitly enabled diagnostic content behaving as labelled.
- A demo that is clearly distinguished from a live run.

These are product and engineering checks. They do not turn a public benchmark corpus into a prerequisite that the user rejected.

## 12. Primary references consulted

Provider plans and capabilities are time-sensitive. These references support the interview research as of 2026-10-01; implementation must recheck relevant behavior.

- [LangGraph JavaScript installation](https://docs.langchain.com/oss/javascript/langgraph/install)
- [LangGraph JavaScript SQLite checkpointer](https://github.com/langchain-ai/langgraphjs/tree/main/libs/checkpoint-sqlite)
- [Node 24 distributions](https://nodejs.org/download/release/latest-v24.x/)
- [Ink](https://github.com/vadimdemedes/ink)
- [SQLite WAL concurrency](https://www.sqlite.org/wal.html#concurrency)
- [PDF.js document API](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib-PDFDocumentProxy.html)
- [PDF.js page API](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib-PDFPageProxy.html)
- [Mammoth DOCX extraction](https://github.com/mwilliamson/mammoth.js)
- [Transformers.js local runtime and caching](https://huggingface.co/docs/transformers.js/tutorials/node)
- [ONNX Runtime JavaScript/Node platforms](https://onnxruntime.ai/docs/get-started/with-javascript/node.html)
- [LangGraph persistence concepts](https://docs.langchain.com/oss/python/langgraph/persistence)
- [LangGraph interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts)
- [MCP specification](https://modelcontextprotocol.io/specification/2026-07-28)
- [Sign in with ChatGPT — local/open-source plan usage](https://developers.openai.com/siwc/token-sharing-open-source)
- [Sign in with ChatGPT — preview limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations)
- [Claude Code integration and authentication conditions](https://code.claude.com/docs/en/legal-and-compliance)
- [Claude Agent SDK quickstart](https://code.claude.com/docs/en/agent-sdk/quickstart)
- [Gemini CLI authentication](https://geminicli.com/docs/get-started/authentication/)
- [Gemini CLI FAQ](https://geminicli.com/docs/resources/faq/)
- [Langfuse pricing](https://langfuse.com/pricing)
- [Langfuse billable units](https://langfuse.com/docs/administration/billable-units)
- [Langfuse retention and access windows](https://langfuse.com/docs/administration/data-retention)
- [Langfuse LangChain/LangGraph integration](https://langfuse.com/integrations/frameworks/langchain)
- [Langfuse masking](https://langfuse.com/docs/observability/features/masking)
