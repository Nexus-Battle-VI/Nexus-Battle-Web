/**
 * Punto único y controlado de iconografía.
 *
 * Los Components/Patterns consumen iconos únicamente desde aquí, nunca
 * importando `lucide-react` directamente. Esto evita abrir toda la librería
 * al producto: solo se reexportan los iconos con relación demostrada en el
 * Design System (`05 — Assets`, Icon Master `Icons/Chevron Down`) y en una HU
 * auditada (EN-021.5, HU-56). Añadir un icono nuevo aquí exige la misma
 * evidencia.
 *
 * `Eye` / `EyeOff` se añaden para el control accesible mostrar/ocultar
 * contraseña de `PasswordField` (HU-05.4), reutilizado por Registro y Login.
 *
 * `ChevronLeft`, `Gamepad2`, `Swords`, `Trophy` y `TrendingUp` se añaden para el
 * panel de estadísticas y logros (HU-06.4, RF-06): son la iconografía de la
 * navegación de retorno y de las tres métricas y del bloque de logros que la
 * referencia UX de HU-06.2 aprobó. Todos son decorativos (`aria-hidden`): la
 * información nunca depende del icono.
 *
 * `Star` se añade para el selector de calificación de 1 a 5 estrellas de
 * "Comentarios y calificación" (HU-40.4, Task #174): es el icono que el
 * prototipo de Figma de esa tarea usa para el control. Es decorativo
 * (`aria-hidden`): la calificación seleccionada se comunica por texto/estado,
 * nunca solo por el relleno del icono.
 */
export {
  ChevronDown,
  ChevronLeft,
  LogOut,
  User,
  Package,
  Settings,
  Eye,
  EyeOff,
  Gamepad2,
  Swords,
  Trophy,
  TrendingUp,
  Download,
  Star,
} from 'lucide-react'
