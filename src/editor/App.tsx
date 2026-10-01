import { useEffect, useRef, useState } from 'react';
import fixture from 'virtual:sample-rig';
import { EditorCanvas } from './EditorCanvas';
import { setAt } from './model';
import type { Rig } from '../rig/types';
import { parseRig, validateRig } from '../rig/validate';
import { Preview } from './Preview';
import { RigHistory, downloadRig } from './history';
import { openImageFolder, sampleImagesAvailable } from './project';
import { layerSignature } from './stale';
import { RigFields } from './RigFields';
import { GROUPS } from './parts';
import { PartList } from './PartList';
import { GUIDE_KEY, I18nProvider, readPreference, savePreference, useI18n, type PartGroup } from './i18n';
import { FirstGuide, GuideSteps, Help } from './Guide';
import { Icon } from './Icon';
import './style.css';

type EditorError = { kind: 'invalidRig' | 'invalidFolder' | 'invalidValue'; paths: string[] };
function errorPaths(value: string) { return [...new Set(value.match(/rig(?:\.[\w]+|\[\d+\])+/g) ?? [])]; }

const builtSignature = layerSignature(parseRig(fixture));

export function App() { return <I18nProvider><Workspace /></I18nProvider>; }
function Workspace() {
  const { t, parts, language, setLanguage, title } = useI18n();
  const openMenu = useRef<HTMLDetailsElement>(null);
  const [guide, setGuide] = useState(() => readPreference(GUIDE_KEY) !== '1');
  const [help, setHelp] = useState(false);
  const [history] = useState(() => new RigHistory(parseRig(fixture)));
  const [rig, setRig] = useState(history.present);
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const projectOpened = useRef(false);
  const objectUrls = useRef<string[]>([]);
  const [sourceUrl, setSourceUrl] = useState('');
  const [assets, setAssets] = useState<Record<string, string> | undefined>(undefined);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    let cancelled = false;
    sampleImagesAvailable().then(available => {
      if (cancelled) return;
      if (available && !projectOpened.current) setSourceUrl('/miko-qipao/source.png');
      setChecking(false);
    });
    return () => { cancelled = true; objectUrls.current.forEach(url => URL.revokeObjectURL(url)); };
  }, []);
  const [visible, setVisible] = useState<string[]>([...GROUPS]);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<EditorError | null>(null);
  const update = (next: Rig) => {
    const errors = validateRig(next);
    if (errors.length) { setError({ kind: 'invalidValue', paths: errorPaths(errors.join('\n')) }); return; }
    setError(null);
    history.change(next);
    setRig(history.present);
  };
  const openFile = async (file?: File) => {
    if (!file) return;
    try {
      update(parseRig(JSON.parse(await file.text())));
      setSelected(null);
    } catch (error) { setError({ kind: 'invalidRig', paths: errorPaths(String(error)) }); }
  };
  const openFolder = async (files: File[]) => {
    try {
      const project = await openImageFolder(files);
      projectOpened.current = true;
      if (project.rig) update(project.rig);
      setSelected(null);
      objectUrls.current.forEach(url => URL.revokeObjectURL(url));
      objectUrls.current = project.urls;
      setSourceUrl(project.sourceUrl);
      setAssets(project.assets);
      setChecking(false);
      setError(null);
    } catch { setError({ kind: 'invalidFolder', paths: [] }); }
  };
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setHelp(false); if (openMenu.current) openMenu.current.open = false; }
      if (!(event.ctrlKey || event.metaKey)) return;
      const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
      if (event.key.toLowerCase() === 's') { event.preventDefault(); downloadRig(history.present); }
      if (!typing && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        setRig(event.shiftKey ? history.redo() : history.undo());
      }
    };
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, [history]);
  const selectPart = (group: string) => { setSelected(group); setVisible(current => current.includes(group) ? current : [...current, group]); };
  const selectedGroup = selected?.split('.')[0] as PartGroup | undefined;
  const selectedPart = selectedGroup && parts[selectedGroup];
  const currentLayers = JSON.parse(layerSignature(rig)), builtLayers = JSON.parse(builtSignature);
  const changed = Object.keys(currentLayers).filter(key => JSON.stringify(currentLayers[key]) !== JSON.stringify(builtLayers[key]));
  const errorNotice = error && <p role="alert" className="error">{t[error.kind]} {error.paths.join(', ')}</p>;
  const dismissGuide = () => { setGuide(false); savePreference(GUIDE_KEY, '1'); };
  const chooseFile = (folder: boolean) => { if (openMenu.current) openMenu.current.open = false; (folder ? folderInput : fileInput).current!.click(); };
  return <main onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void openFile(event.dataTransfer.files[0]); }}>
    <header className="toolbar">
      <div className="brand"><h1>{t.product}</h1><p>{t.subtitle}</p></div>
      <nav aria-label={t.tools}>
        <input ref={fileInput} type="file" accept=".json,application/json" hidden aria-label={t.rigFile}
          onChange={event => { void openFile(event.target.files?.[0]); event.target.value = ''; }} />
        <input ref={folderInput} type="file" multiple hidden aria-label={t.folderFiles} {...{ webkitdirectory: '' }}
          onChange={event => { void openFolder(Array.from(event.target.files ?? [])); event.target.value = ''; }} />
        <details ref={openMenu} className="open-menu"><summary>{t.openProject}<Icon name="chevron" /></summary>
          <div className="project-menu"><button onClick={() => chooseFile(false)}>{t.openRig}</button><button onClick={() => chooseFile(true)}>{t.openFolder}</button></div>
        </details>
        <button className="icon-button" aria-label={t.save} title={`${t.save} · ⌘S`} onClick={() => downloadRig(rig)}><Icon name="save" /></button>
        <span className="toolbar-divider" />
        <button className="icon-button" aria-label={t.undo} title={`${t.undo} · ⌘Z`} disabled={!history.canUndo} onClick={() => setRig(history.undo())}><Icon name="undo" /></button>
        <button className="icon-button" aria-label={t.redo} title={`${t.redo} · ⇧⌘Z`} disabled={!history.canRedo} onClick={() => setRig(history.redo())}><Icon name="redo" /></button>
        <span className="toolbar-divider" />
        <button className="icon-button" aria-label={t.help} title={t.help} aria-expanded={help} onClick={() => setHelp(current => !current)}><Icon name="help" /></button>
        <div className="language-toggle" role="group" aria-label={t.language}>
          <button aria-label={t.english} aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>{t.enCode}</button>
          <button aria-label={t.japanese} aria-pressed={language === 'ja'} onClick={() => setLanguage('ja')}>{t.jaCode}</button>
        </div>
      </nav>
    </header>
    {help && <Help onClose={() => setHelp(false)} onGuide={() => { setGuide(true); setHelp(false); }} />}
    {changed.length > 0 && <div role="status" className="stale">{t.stale}<small>{t.changedParts}: {changed.map(key => parts[key as PartGroup]?.[0] ?? title(key)).join(' · ')}</small></div>}
    {!sourceUrl && <section className="panel empty-project"><h2>{checking ? t.checking : t.emptyTitle}</h2><p>{t.emptyHelp}</p>{errorNotice}</section>}
    {sourceUrl && <div className="workspace">
      <PartList rig={rig} visible={visible} selected={selected} onSelect={selectPart} onVisible={setVisible} />
      <section className="panel editor-panel">
        <div className="panel-title"><h2>{t.source}</h2><span>{rig.image.width} × {rig.image.height} {t.px}</span></div>
        <div className="canvas-stage">
          <EditorCanvas sourceUrl={sourceUrl} rig={rig} visible={visible} selected={selected} onSelect={setSelected} onChange={update}
            onBegin={() => history.begin()} onEnd={() => { history.end(); setRig(structuredClone(history.present)); }} />
          {guide && <FirstGuide onDismiss={dismissGuide} />}
        </div>
      </section>
      <div className="right-column">
        <Preview rig={rig} assets={assets} />
        <aside className="panel inspector">
          <div className="selection-heading"><h2>{selectedPart?.[0] ?? t.selection}</h2></div>
          {errorNotice}
          {selectedPart ? <><p className="part-description">{selectedPart[1]}</p><p className="part-tip"><strong>{t.tip}</strong> {selectedPart[2]}</p>
            <div className="fields">{selected && <RigFields rig={rig} path={selected} onChange={(path, value) => update(setAt(rig, path, value))} />}</div></>
            : <div className="selection-empty"><p>{t.selectPart}</p><GuideSteps /></div>}
        </aside>
      </div>
    </div>}
  </main>;
}
