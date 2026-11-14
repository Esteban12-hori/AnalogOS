// Posición del póster del globo antes de que cargue React. Se incrusta en index.html
// (vite.config.ts) y debe coincidir con domain/mapZoom.ts: lo verifica tests/boot.test.ts.
export function posterLayout(width, height) {
  var HALF_OVER_RADIUS = 445 / 396.5
  var inset = width >= 1100 ? 520 : 0
  var fov = (40 * Math.PI) / 180
  var usable = Math.max(width - inset, 1)
  var tall = Math.max(height, 1)
  var horizontal = 2 * Math.atan(Math.tan(fov / 2) * (usable / tall))
  var ratio = 1.12 / Math.sin(Math.min(fov, horizontal) / 2)
  var radius = (Math.tan(Math.asin(1 / ratio)) / Math.tan(fov / 2)) * (tall / 2)
  var size = 2 * radius * HALF_OVER_RADIUS
  return { size: size, left: usable / 2 - size / 2, top: tall / 2 - size / 2 }
}
