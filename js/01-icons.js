/* js/01-icons.js — アイコン(SVG)の定義と、data-i 属性を持つボタンへの挿入 */
const I={
sel:'<path d="M5 3l14 7-6 2-2 6z"/>',
lay:'<path d="M8 3L5 21M16 3l3 18M7.2 8h9.6M6.3 13h11.4M5.5 18h13"/>',
era:'<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7M5 11l9 9"/>',
trn:'<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 10h14M8 21l1.5-4M16 21l-1.5-4"/><circle cx="9" cy="13.5" r=".8"/><circle cx="15" cy="13.5" r=".8"/>',
play:'<path d="M7 4.5v15l12-7.5z"/>',
pause:'<path d="M8 5v14M16 5v14"/>',
home:'<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
plus:'<path d="M12 5v14M5 12h14"/>',
minus:'<path d="M5 12h14"/>',
undo:'<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/>',
check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
x:'<path d="M6 6l12 12M18 6L6 18"/>',
swap:'<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
sta:'<circle cx="12" cy="8" r="5"/><path d="M12 13v8M8 21h8"/>',
clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
fit:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
edit:'<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/>',
cube:'<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
sub:'<path d="M6 4v9a3 3 0 003 3h9M14 12l4 4-4 4"/>'};
const ic=k=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${I[k]}</svg>`;
document.querySelectorAll('[data-i]').forEach(b=>b.insertAdjacentHTML('afterbegin',ic(b.dataset.i)));
