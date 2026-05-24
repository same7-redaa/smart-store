# AGENTS.md — Universal AI Agent Instructions

This file tells any AI assistant how to operate intelligently using 57 specialized skills.
Read it entirely. Follow it strictly. It works for ANY project.

---

## 1. CORE DIRECTIVE

You are an AI agent that MUST follow this 4-step pipeline for EVERY user request:

```
STEP 1: CLASSIFY   → Determine task type (12 categories)
STEP 2: LOAD SKILL → Read SKILLS_MASTER.md then the matching skill file
STEP 3: DOCUMENT   → Read & update PROJECT.md with progress
STEP 4: VERIFY     → Check quality before delivering
```

## 2. STEP 1 — CLASSIFY THE REQUEST

Read the user's message. Match keywords to ONE category:

| User says (Arabic or English) | Category |
|-------------------------------|----------|
| "اعمل", "كتب", "نفذ", "أضف", "طور", "build", "create", "implement", "develop" | **BUILD** |
| "عطل", "غلط", "مشكلة", "bug", "خطأ", "fix", "error", "broken", "crash" | **DEBUG** |
| "شوف", "حلل", "قارن", "ليش", "analyze", "compare", "evaluate", "review" | **ANALYSIS** |
| "صمم", "شكل", "UI", "واجهة", "لون", "design", "layout", "style", "theme" | **DESIGN** |
| "بطيء", "حسن", "speed", "optimize", "performance", "slow", "fast" | **OPTIMIZE** |
| "تذكر", "حفظ", "save", "memory", "remember", "recall", "store" | **MEMORY** |
| "commit", "push", "git", "PR", "pull request", "issue" | **GIT** |
| "API", "endpoint", "backend", "server", "route" | **API** |
| "اختبر", "test", "اختبار", "unit", "coverage", "mock" | **TEST** |
| "وثق", "document", "اكتب", "README", "explain", "guide" | **DOCS** |
| "config", "opencode", "skill", "إعدادات", "تعديل", "setting" | **CONFIG** |
| Anything else, general chat, unclear | **GENERAL** |

## 3. STEP 2 — LOAD THE SKILL

### 3.1 First, read the master reference:
```
C:\Users\Hp\.config\opencode\SKILLS_MASTER.md
```
This contains a summary of every skill.

### 3.2 Then, read the specific skill file:
```
C:\Users\Hp\.agents\skills\<skill-name>\SKILL.md
```

### 3.3 Skill-to-Category Mapping

| Category | Primary Skill File | Workflow |
|----------|-------------------|----------|
| **BUILD** | `stepwise-decomposition-master\SKILL.md` | Break down → Build each piece → Improve → Verify |
| **DEBUG** | `bug-hunter\SKILL.md` | Trace symptom → Isolate root cause → Fix → Verify |
| **ANALYSIS** | `adversarial-debate-reasoning\SKILL.md` | Multiple perspectives → Debate → Synthesize → Verify |
| **DESIGN** | `ui-ux-pro-max\SKILL.md` | Choose style/palette → Design → Review → Implement |
| **OPTIMIZE** | `performance-optimizer\SKILL.md` | Measure → Identify bottleneck → Optimize → Re-measure → Verify |
| **MEMORY** | `persistent-memory\SKILL.md` | Search → Retrieve → Store on request → Verify |
| **GIT** | One of: `git-commmit\SKILL.md` / `gh-cli\SKILL.md` / `github-issue-workflow\SKILL.md` |
| **API** | `api-endpoint-builder\SKILL.md` | Design → Build → Document → Test → Verify |
| **TEST** | `vitest\SKILL.md` | Write tests → Run → Fix → Achieve coverage → Verify |
| **DOCS** | `documentation-writer\SKILL.md` | Plan structure → Write → Review → Verify |
| **CONFIG** | `customize-opencode` (built-in) | Read config → Edit → Validate → Verify |
| **GENERAL** | `recursive-self-enhancement\SKILL.md` | Plan → Execute → Improve iteratively → Verify |

### 3.4 Additional Skills Available (57 total)

All skills are at `C:\Users\Hp\.agents\skills\<folder>\SKILL.md`.
The orchestrator above selects the PRIMARY skill. You may also load SECONDARY skills when needed:

- **Reasoning (13):** `master-conductor`, `stepwise-decomposition-master`, `tree-of-thought-explorer`, `adversarial-debate-reasoning`, `recursive-self-enhancement`, `reflexion-optimization-engine`, `confidence-self-consistency`, `self-verification-loop`, `error-driven-learning`, `few-shot-master`, `meta-prompt-optimizer`, `complex-reasoning`, `logic-lens`
- **Code Quality (8):** `bug-hunter`, `codebase-audit-pre-push`, `brooks-lint`, `performance-optimizer`, `vitest`, `k6-load-testing`, `lambdatest-agent-skills`, `squirrel`
- **React/UI (6):** `typescript-advanced-types`, `vercel-react-best-practices`, `ui-ux-pro-max`, `tailwind-css-patterns`, `rayden-code`, `copywriting`
- **API/Backend (3):** `api-endpoint-builder`, `hono`, `azure-ai`
- **Git (4):** `git-commit`, `github-issue-workflow`, `gh-cli`, `github-actions-docs`
- **Memory (7):** `persistent-memory`, `conversation-memory`, `deep-agents-memory`, `memory-merger`, `context-map`, `continual-learning`, `technical-change-tracker`
- **Security (7):** `aws-security-audit`, `aws-secrets-rotation`, `aws-iam-best-practices`, `aws-compliance-checker`, `audit-skills`, `skill-audit`, `fact-checker`
- **Docs (6):** `documentation-writer`, `prompt-engineer`, `seo-audit`, `office-productivity`, `status-report`, `python-pptx-generator`
- **DevOps (3):** `tmux`, `jq`, `track-management`
- **Discovery (3):** `global-chat-agent-discovery`, `agenttrace-session-audit`, `skill-check`
- **Config (1):** `customize-opencode` (built-in)

## 4. STEP 3 — DOCUMENT IN PROJECT.md

Before starting ANY task:
1. Read `PROJECT.md` to understand the project context
2. Note the existing structure, conventions, and progress

After completing the task, append to the Progress Log in `PROJECT.md`:
```
- [date] what was accomplished
- [date] which files were changed
- [date] any decisions or notes
```

## 5. STEP 4 — VERIFY BEFORE DELIVERY

Before sending ANY result to the user, CHECK:

### Code Quality Checks
- Run the project's linter: `npm run lint`, `tsc --noEmit`, or equivalent
- Ensure all changed files are syntactically valid
- Check that imports are correct and no dead code exists

### Completeness Checks
- Did you answer ALL parts of the user's request?
- Is the response complete and direct (no placeholder text)?
- Did you update `PROJECT.md`?

### Safety Checks
- Never commit secrets, API keys, or credentials
- Never introduce security vulnerabilities
- Never overwrite user files without confirmation

If ANY check fails: stop, fix the issue, re-verify, then deliver.

## 6. MEMORY SYSTEM

Persistent memory is available via:
```bash
python "C:\Users\Hp\.agents\skills\persistent-memory\scripts\memory.py" <command>
```

Commands: `init`, `sync`, `search "<query>" --limit 8`, `add "<text>" --tags "<tags>"`, `recent --limit 10`, `stats`

Use memory to:
- Remember user preferences across sessions
- Store durable project facts
- Recall prior context at task start

## 7. AUTO-DISCOVERY OF NEW SKILLS

At the start of each session:
1. Run a glob: `C:\Users\Hp\.agents\skills\**\SKILL.md`
2. Compare against the list in this file
3. If new skills exist, read their SKILL.md and add them to your mental model

## 8. INFRASTRUCTURE

| Component | Path |
|-----------|------|
| All skills root | `C:\Users\Hp\.agents\skills\` |
| Skills master reference | `C:\Users\Hp\.config\opencode\SKILLS_MASTER.md` |
| Main opencode config | `C:\Users\Hp\.config\opencode\opencode.jsonc` |
| Plugin docs | `C:\Users\Hp\.agents\skills\docs\plugins.md` |
| Bundles docs | `C:\Users\Hp\.agents\skills\docs\BUNDLES.md` |
| Security guidelines | `C:\Users\Hp\.agents\skills\docs\SECURITY_GUARDRAILS.md` |
| FAQ | `C:\Users\Hp\.agents\skills\docs\FAQ.md` |

## 9. INITIALIZATION FOR NEW PROJECTS

When encountering a new project directory:

1. Check if `AGENTS.md` (this file) exists — if yes, follow it
2. Check if `PROJECT.md` exists — if not, create it with basic project info
3. Check for common config files (`package.json`, `tsconfig.json`, etc.)
4. Document findings in `PROJECT.md`
5. Begin following the 4-step pipeline for all requests

If `AGENTS.md` does NOT exist, the user should copy this file from `C:\Users\Hp\.config\opencode\SKILLS_MASTER.md` or from any project that has it, or run `C:\Users\Hp\.config\opencode\init-skills.bat`.

## 10. FINAL NOTE

You have 57 specialized skills at your disposal. The orchestration system above selects the right one automatically. Trust the system. Follow the pipeline. Always verify before delivering.

Every skill file contains a complete workflow with examples, rules, and best practices. Read it fully before executing.
