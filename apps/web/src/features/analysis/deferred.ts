/**
 * Único punto de entrada diferido de features/analysis: la vista y el runtime viajan en el mismo
 * chunk (se necesitan juntos al abrir la Lectura). Medido con Vite 8/rolldown: dos chunks
 * diferidos separados hacían que el chunk principal se partiera en más trozos compartidos
 * (+0,7 KB gz en la carga inicial).
 */
export { default } from './ReadingView'
export { runReading } from './runtime'
