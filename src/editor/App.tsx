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
import './style.css';

export const GROUPS = ['head', 'body', 'face', 'eyes', 'mouth', 'cheeks', 'strands', 'accessories', 'hand', 'buns', 'mesh', 'view'] as const;

const builtSignature = layerSignature(parseRig(fixture));

export function App() {
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
  const [error, setError] = useState('');
  const update = (next: Rig) => {
    const errors = validateRig(next);
    if (errors.length) { setError(errors.join('\n')); return; }
    setError('');
    history.change(next);
    setRig(history.present);
  };
  const openFile = async (file?: File) => {
    if (!file) return;
    try {
      update(parseRig(JSON.parse(await file.text())));
      setSelected(null);
    } catch (error) { setError(error instanceof Error ? error.message : String(error)); }
  };
  const openFolder = async (files: File[]) => {
    try {
      const project = await openImageFolder(files);
      projectOpened.current = true;
      if (project.rig) update(project.rig);
      objectUrls.current.forEach(url => URL.revokeObjectURL(url));
      objectUrls.current = project.urls;
      setSourceUrl(project.sourceUrl);
      setAssets(project.assets);
      setChecking(false);
      setError('');
    } catch (error) { setError(error instanceof Error ? error.message : String(error)); }
  };
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
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
  return (
    <main onDragOver={event => event.preventDefault()} onDrop={event => {
      event.preventDefault();
      void openFile(event.dataTransfer.files[0]);
    }}>
      <header className="toolbar">
        <div><h1>Mesh Avatar Studio</h1><p>Rig editor</p></div>
        <nav aria-label="Project tools">
          <input ref={fileInput} type="file" accept=".json,application/json" hidden aria-label="Open rig file"
            onChange={event => { void openFile(event.target.files?.[0]); event.target.value = ''; }} />
          <input ref={folderInput} type="file" multiple hidden aria-label="Open image folder files"
            {...{ webkitdirectory: '' }} onChange={event => {
              void openFolder(Array.from(event.target.files ?? []));
              event.target.value = '';
            }} />
          <button onClick={() => fileInput.current!.click()}>Open rig</button>
          <button onClick={() => folderInput.current!.click()}>Open image folder</button>
          <button onClick={() => downloadRig(rig)}>Save rig</button>
          <button disabled={!history.canUndo} onClick={() => setRig(history.undo())}>Undo</button>
          <button disabled={!history.canRedo} onClick={() => setRig(history.redo())}>Redo</button>
        </nav>
      </header>
      <div className="layer-bar" aria-label="Rig groups">
        {GROUPS.map(group => (
          <label key={group}>
            <input type="checkbox" checked={visible.includes(group)} onChange={() => setVisible(current =>
              current.includes(group) ? current.filter(value => value !== group) : [...current, group])} />
            {group}
          </label>
        ))}
      </div>
      {layerSignature(rig) !== builtSignature && (
        <p role="status" className="stale">Layers are stale: cut-out geometry changed. The existing images and eye curves are retained; re-cutting requires the planned layer builder.</p>
      )}
      {!sourceUrl && (
        <section className="panel empty-project">
          <h2>{checking ? 'Checking for sample images…' : 'Open a project'}</h2>
          <p>Open rig.json and an image folder to begin. Sample images are installed separately.</p>
          {error && <p role="alert" className="error">{error}</p>}
        </section>
      )}
      {sourceUrl && <div className="workspace">
        <section className="panel editor-panel">
          <div className="panel-title"><h2>Source & rig</h2><span>{rig.image.width} × {rig.image.height} px</span></div>
          <EditorCanvas sourceUrl={sourceUrl} rig={rig} visible={visible} selected={selected} onSelect={setSelected} onChange={update}
            onBegin={() => history.begin()} onEnd={() => {
              history.end();
              setRig(structuredClone(history.present));
            }} />
        </section>
        <Preview rig={rig} assets={assets} />
        <aside className="panel inspector">
          <h2>Selection</h2>
          <select aria-label="Selected rig item" value={selected ?? ''} onChange={event => setSelected(event.target.value || null)}>
            <option value="">Select a rig item</option>
            {GROUPS.map(group => <option key={group} value={group}>{group}</option>)}
            {(rig.strands ?? []).map((strand, i) => <option key={strand.name} value={`strands.${i}`}>{strand.name}</option>)}
            {selected && !GROUPS.includes(selected as typeof GROUPS[number]) && !/^strands\.\d+$/.test(selected) &&
              <option value={selected}>{selected}</option>}
          </select>
          {error && <p role="alert" className="error">{error}</p>}
          {!selected && <p className="muted">Select a rig handle to edit its fields.</p>}
          <div className="fields">
            {selected && <RigFields rig={rig} path={selected}
              onChange={(path, value) => update(setAt(rig, path, value))} /> }
          </div>
        </aside>
      </div>}
    </main>
  );
}
