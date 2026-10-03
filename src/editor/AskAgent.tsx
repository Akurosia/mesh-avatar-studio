import { useI18n } from './i18n';
import { CopyButton } from './CopyButton';

export function AskAgent({ rootPath, projectPath, target = 'both', newProject = false, readOnlySource }: {
  rootPath?: string; projectPath?: string; target?: 'eyes' | 'mouth' | 'both'; newProject?: boolean; readOnlySource?: string;
}) {
  const { t } = useI18n();
  const path = projectPath ?? 'projects/my-avatar';
  const prompt = (readOnlySource ? t.agentCopySample.replace('SOURCE', readOnlySource).replace('PROJECT', path) : '') + (newProject ? t.agentNewPrompt : t.agentVariantPrompt).replace('PROJECT', path).replace('TARGET', target === 'eyes' ? t.agentEyes : target === 'mouth' ? t.agentMouth : t.agentBoth);
  return <section className="ask-agent" data-testid={newProject ? 'ask-agent-new' : 'ask-agent-variants'} aria-label={t.askAgent}>
    <p className="agent-instruction">{t.agentInstruction}</p>
    {rootPath ? <div className="agent-path"><code className="root-path" title={rootPath}>{rootPath}</code><CopyButton value={rootPath} label={t.copyPath} icon /></div> : <p className="workflow-note">{t.rootUnavailable}</p>}
    <textarea aria-label={t.copyPrompt} readOnly value={prompt} rows={4} />
    <CopyButton value={prompt} label={t.copyPrompt} />
  </section>;
}
