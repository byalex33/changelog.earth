// ponytail: coarse coastlines for a 60-column globe; use a land-mask texture for higher resolution.
const continents = [
 [[-168,70],[-140,70],[-124,60],[-105,72],[-80,65],[-53,48],[-66,44],[-81,25],[-97,16],[-106,23],[-117,32],[-128,51],[-165,60]],
 [[-81,12],[-70,10],[-50,0],[-35,-7],[-40,-23],[-53,-35],[-69,-55],[-76,-40],[-81,-5]],
 [[-54,60],[-43,60],[-20,76],[-35,84],[-60,80]],
 [[-17,35],[6,37],[33,31],[43,12],[51,11],[41,-12],[31,-30],[18,-35],[10,-20],[8,4],[-14,7]],
 [[-10,36],[-10,44],[3,51],[6,58],[19,71],[40,70],[60,76],[100,77],[140,70],[179,65],[169,51],[142,46],[130,32],[121,20],[106,8],[98,22],[81,7],[69,25],[52,12],[40,30],[30,41],[15,38]],
 [[112,-11],[133,-11],[142,-10],[154,-25],[146,-39],[131,-32],[115,-35]],
 [[47,-13],[50,-16],[47,-26],[44,-24]],
 [[130,-3],[150,-5],[153,-10],[135,-8]],
 [[-180,-72],[-120,-76],[-65,-66],[-30,-76],[50,-69],[110,-67],[180,-74],[180,-90],[-180,-90]],
];
function contains(polygon, x, y) {
 let inside = false;
 for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
  const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
  if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
 }
 return inside;
}
export function earthFrame(angle = 0) {
 const rows = [];
 for (let row = 0; row < 30; row++) {
  let line = '';
  for (let col = 0; col < 60; col++) {
   const x = (col - 29.5) / 29, y = (14.5 - row) / 14;
   const depth = 1 - x * x - y * y;
   if (depth < 0) { line += ' '; continue; }
   const z = Math.sqrt(depth);
   const latitude = Math.asin(y) * 180 / Math.PI;
   const longitude = ((Math.atan2(x, z) * 180 / Math.PI + angle + 540) % 360 + 360) % 360 - 180;
   const land = continents.some(polygon => contains(polygon, longitude, latitude));
   const light = Math.max(0, Math.min(1, .25 - x * .25 + y * .2 + z * .6));
   line += land ? ':=+*#@'[Math.min(5, Math.floor(light * 6))] : (light > .6 ? ':' : '.');
  }
  rows.push(line);
 }
 return rows.join('\n');
}
