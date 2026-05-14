// Entry module — Jellyfin injects this via <script type="module"> in the
// transformation callback. All concrete behaviour lives in the jf-*.js modules.
import { bootstrap } from './jf-bootstrap.js';

bootstrap();
