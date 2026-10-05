import { createAvatarView } from './avatar-view';
import { viewSettings } from './settings';
import './stream.css';

const settings = viewSettings(location.search);
document.documentElement.style.background = settings.background;
const canvas = document.querySelector<HTMLCanvasElement>('#avatar')!;
void createAvatarView(canvas, settings).then(view => {
  window.addEventListener('pagehide', () => view.destroy(), { once: true });
}).catch(() => { canvas.dataset.state = 'error'; });
