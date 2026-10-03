import { useState } from 'react';
import { readPreference, savePreference } from './preferences';
import { useI18n } from './i18n';
import { CopyButton } from './CopyButton';

export function AskAgent({ rootPath, displayRootPath, projectPath, target = 'both', newProject = false, readOnlySource }: {
  rootPath?: string; displayRootPath?: string; projectPath?: string; target?: 'eyes' | 'mouth' | 'both'; newProject?: boolean; readOnlySource?: string;
}) {
  const { t } = useI18n();
  const [recipient, setRecipient] = useState(() => readPreference('mesh-avatar-agent-recipient') === 'claude' ? 'claude' : 'codex');
  const agent = newProject || recipient === 'codex' ? 'Codex' : 'Claude Code';
  const path = projectPath ?? 'projects/my-avatar';
  const prompt = (readOnlySource ? t.agentCopySample.replace('SOURCE', readOnlySource).replace('PROJECT', path) : '') + (newProject ? t.agentNewPrompt : recipient === 'codex' ? t.agentCodexPrompt : t.agentClaudePrompt).replace('PROJECT', path).replace('TARGET', target === 'eyes' ? t.agentEyes : target === 'mouth' ? t.agentMouth : t.agentBoth);
  return <section className="ask-agent" data-testid={newProject ? 'ask-agent-new' : 'ask-agent-variants'} aria-label={t.askAgent}>
    <p className="agent-instruction">{t.agentInstruction.replace('AGENT', agent)}</p>
    {rootPath ? <div className="agent-path"><code className="root-path" title={displayRootPath}>{displayRootPath ?? t.rootUnavailable}</code><CopyButton value={rootPath} label={t.copyPath} icon /></div> : <p className="workflow-note">{t.rootUnavailable}</p>}
    {!newProject && <><div className="agent-recipient" role="group" aria-label={t.agentRecipient}>
      {(['codex', 'claude'] as const).map(value => <button key={value} type="button" aria-pressed={recipient === value} onClick={() => { setRecipient(value); savePreference('mesh-avatar-agent-recipient', value); }}>{value === 'codex' ? 'Codex' : 'Claude Code'}</button>)}
    </div>{recipient === 'codex' && <p className="agent-disclosure">{t.agentDisclosure}</p>}</>}
    <textarea aria-label={t.copyPrompt} readOnly value={prompt} rows={4} />
    <CopyButton value={prompt} label={t.copyPrompt} />
  </section>;
}
