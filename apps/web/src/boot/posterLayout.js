// Posición del póster del globo antes de que cargue React. Se incrusta en index.html junto con
// shell/stageGeometry.js (features/boot/loadingHints.ts) y debe coincidir con domain/mapZoom.ts:
// lo verifica tests/boot.test.ts. `insets` = márgenes base del tramo (baseStageInsets).
export function posterLayout(width, height, insets) {
  var HALF_OVER_RADIUS = 445 / 396.5
  var t = insets ? insets.top : 0
  var r = insets ? insets.right : 0
  var b = insets ? insets.bottom : 0
  var l = insets ? insets.left : 0
  var tanHalf = Math.tan((40 * Math.PI) / 360)
  var tall = Math.max(height, 1)
  var usableWidth = Math.max(width - l - r, 1)
  var usableHeight = Math.max(height - t - b, 1)
  var vertical = 2 * Math.atan(tanHalf * (usableHeight / tall))
  var horizontal = 2 * Math.atan(tanHalf * (usableWidth / tall))
  var ratio = 1.12 / Math.sin(Math.min(vertical, horizontal) / 2)
  var radius = (Math.tan(Math.asin(1 / ratio)) / tanHalf) * (tall / 2)
  var size = 2 * radius * HALF_OVER_RADIUS
  return { size: size, left: l + usableWidth / 2 - size / 2, top: t + usableHeight / 2 - size / 2 }
}
