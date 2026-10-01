import { useEffect, useMemo, useRef, useState } from 'react';
import type { Point, Rig } from '../rig/types';
import { buildOverlay, changeVertex, imagePoint, moveHandle, nearestEdge, nearestHandle, screen, type Handle, type Viewport } from './model';
import { useI18n, type PartGroup } from './i18n';
import { PART_COLORS } from './parts';

interface Props {
  rig: Rig;
  sourceUrl: string;
  visible: string[];
  selected: string | null;
  onSelect: (path: string) => void;
  onChange: (rig: Rig) => void;
  onBegin?: () => void;
  onEnd?: () => void;
}
export function EditorCanvas({ rig, sourceUrl, visible, selected, onSelect, onChange, onBegin, onEnd }: Props) {
  const { t, title } = useI18n();
  const canvas = useRef<HTMLCanvasElement>(null);
  const source = useRef<HTMLImageElement | null>(null);
  const [imageReady, setImageReady] = useState(false);
  const [size, setSize] = useState({ width: 600, height: 600 });
  const [view, setView] = useState<Viewport>({ scale: 1, x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>([0, 0]);
  const space = useRef(false);
  const [hover, setHover] = useState<{ handle: Handle; point: Point } | null>(null);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ handle?: Handle; rig: Rig; start: Point; pan: Point; offset: Point } | null>(null);
  const overlay = useMemo(() => buildOverlay(rig), [rig]);
  const handles = overlay.handles.filter(h => visible.includes(h.group));
  const shapes = overlay.shapes.filter(s => visible.includes(s.group));
  const focusGroup = selected?.split('.')[0] ?? '';
  const interactiveHandles = handles.filter(h => !focusGroup || h.group === focusGroup);
  const interactiveShapes = shapes.filter(s => !focusGroup || s.group === focusGroup);
  const hint = !selected ? t.pickHint : interactiveShapes.some(s => s.editable) ? t.lineHint : interactiveHandles.length ? t.dragHint : t.noDots;
  useEffect(() => {
    const image = new Image();
    image.onload = () => { source.current = image; setImageReady(true); };
    image.src = sourceUrl;
    const observer = new ResizeObserver(entries => {
      const rect = entries[0].contentRect;
      setSize({ width: rect.width, height: rect.height });
    });
    observer.observe(canvas.current!);
    return () => { image.onload = null; observer.disconnect(); };
  }, [sourceUrl]);
  useEffect(() => {
    const scale = Math.min(size.width / rig.image.width, size.height / rig.image.height) * zoom;
    setView({ scale, x: (size.width - rig.image.width * scale) / 2 + pan[0],
      y: (size.height - rig.image.height * scale) / 2 + pan[1] });
  }, [size, rig.image.width, rig.image.height, zoom, pan]);
  useEffect(() => {
    const element = canvas.current!;
    element.width = Math.round(size.width);
    element.height = Math.round(size.height);
    const context = element.getContext('2d')!;
    context.fillStyle = '#f9fafc';
    context.fillRect(0, 0, element.width, element.height);
    if (imageReady && source.current) {
      context.globalAlpha = 0.7;
      context.drawImage(source.current, view.x, view.y, rig.image.width * view.scale, rig.image.height * view.scale);
      context.globalAlpha = 1;
    }
    for (const shape of shapes) {
      if (shape.band && selected?.split('.')[0] !== shape.group) continue;
      const active = focusGroup === shape.group;
      context.globalAlpha = !focusGroup ? 0.6 : active ? 1 : 0.2;
      context.strokeStyle = PART_COLORS[shape.group as PartGroup];
      context.lineWidth = active ? 2.5 : 1;
      context.beginPath();
      if (shape.kind === 'ellipse') {
        const [x, y] = screen(shape.points[0], view);
        context.ellipse(x, y, shape.radius![0] * view.scale, shape.radius![1] * view.scale, shape.angle ?? 0, 0, Math.PI * 2);
      } else {
        shape.points.forEach((point, i) => {
          const [x, y] = screen(point, view);
          if (i === 0) context.moveTo(x, y); else context.lineTo(x, y);
        });
        if (shape.closed) context.closePath();
      }
      context.stroke();
    }
    for (const handle of handles) {
      const [x, y] = screen(handle.point, view);
      const active = focusGroup === handle.group;
      context.globalAlpha = !focusGroup ? 0.6 : active ? 1 : 0.2;
      context.beginPath();
      context.arc(x, y, active ? 5 : 3.5, 0, Math.PI * 2);
      context.fillStyle = PART_COLORS[handle.group as PartGroup];
      context.fill();
      context.strokeStyle = '#ffffff';
      context.lineWidth = 1;
      context.stroke();
    }
    context.globalAlpha = 1;
  }, [rig, handles, shapes, selected, focusGroup, size, imageReady, view]);
  const local = (event: { clientX: number; clientY: number }): Point => {
    const rect = canvas.current!.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  };
  return (
    <div className="canvas-content">
      <div className="canvas-surface">
      <canvas ref={canvas} className="editor-canvas" data-testid="editor" tabIndex={0}
        aria-label={t.canvas} data-scale={view.scale} data-offset-x={view.x} data-offset-y={view.y}
        data-focus-group={focusGroup} data-visible-groups={visible.join(',')}
        data-dimmed-groups={focusGroup ? visible.filter(g => g !== focusGroup).join(',') : ''}
        data-inactive-opacity={focusGroup ? '0.2' : '0.6'}
        style={{ cursor: dragging ? 'grabbing' : hover ? 'grab' : 'default' }}
        onKeyDown={event => { if (event.code === 'Space') { event.preventDefault(); space.current = true; } }}
        onKeyUp={event => { if (event.code === 'Space') space.current = false; }}
        onBlur={() => { space.current = false; }}
        onContextMenu={event => event.preventDefault()}
        onWheel={event => {
          event.preventDefault();
          const point = local(event), ratio = Math.exp(-event.deltaY * 0.001);
          const nextZoom = Math.min(8, Math.max(0.25, zoom * ratio));
          const effective = nextZoom / zoom;
          setZoom(nextZoom);
          setPan([pan[0] + (point[0] - size.width / 2 - pan[0]) * (1 - effective),
            pan[1] + (point[1] - size.height / 2 - pan[1]) * (1 - effective)]);
        }}
        onPointerDown={event => {
          event.preventDefault();
          event.currentTarget.focus();
          const point = local(event);
          if (event.button === 1 || space.current) {
            drag.current = { rig, start: point, pan, offset: [0, 0] };
          } else if (event.button === 0) {
            const handle = nearestHandle(interactiveHandles, point, view);
            if (!handle) return;
            onSelect(handle.item);
            if (event.altKey && handle.vertex) {
              onChange(changeVertex(rig, handle.vertex.path, handle.vertex.index, null, handle.vertex.closed));
              return;
            }
            const origin = imagePoint(point, view);
            drag.current = { handle, rig, start: point, pan, offset: [handle.point[0] - origin[0], handle.point[1] - origin[1]] };
            onBegin?.();
          } else return;
          setHover(null);
          setDragging(true);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={event => {
          if (!drag.current) {
            const point = local(event), handle = nearestHandle(interactiveHandles, point, view);
            setHover(handle ? { handle, point } : null);
            return;
          }
          const point = local(event), current = drag.current;
          if (!current.handle) setPan([current.pan[0] + point[0] - current.start[0], current.pan[1] + point[1] - current.start[1]]);
          else {
            const target = imagePoint(point, view);
            onChange(moveHandle(current.rig, current.handle, [target[0] + current.offset[0], target[1] + current.offset[1]]));
          }
        }}
        onPointerLeave={() => setHover(null)}
        onPointerUp={() => { if (drag.current?.handle) onEnd?.(); drag.current = null; setDragging(false); }}
        onPointerCancel={() => { if (drag.current?.handle) onEnd?.(); drag.current = null; setDragging(false); }}
        onDoubleClick={event => {
          const edge = nearestEdge(interactiveShapes, local(event), view);
          if (edge) {
            onSelect(edge.shape.item);
            onChange(changeVertex(rig, edge.shape.item, edge.index, edge.point, !!edge.shape.closed));
          }
        }} />
      {hover && interactiveHandles.includes(hover.handle) && <div role="tooltip" className="handle-tooltip"
        style={{ left: Math.max(8, Math.min(hover.point[0] + 12, size.width - 220)), top: Math.max(8, hover.point[1] - 38) }}>{title(hover.handle.id)}</div>}
      </div>
      <div className="canvas-help">
        <span className="context-hint">{hint}</span>
        <div className="zoom-tools"><span title={t.zoom}>{Math.round(zoom * 100)}%</span><button title={t.panHint} onClick={() => { setZoom(1); setPan([0, 0]); }}>{t.fit}</button></div>
      </div>
    </div>
  );
}
