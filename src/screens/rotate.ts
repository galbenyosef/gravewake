// Portrait prompt: covers everything while the device is upright.
import { use } from '../decl/engine';
import { ui } from '../store';
import { screenUi } from './shared';
import rotateKdl from './rotate.kdl?raw';
import rotateCss from './rotate.css?raw';

export const rotateUi = screenUi(rotateKdl, rotateCss);
if (import.meta.hot) import.meta.hot.accept(['./rotate.kdl?raw', './rotate.css?raw'], ([k, c]) => rotateUi.reload(k?.default, c?.default));

export function drawRotate() {
  rotateUi.show(ui.getState().portrait ? use('rotate') : null);
}
