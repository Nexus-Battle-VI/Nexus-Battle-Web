/**
 * Punto único y controlado de iconografía.
 *
 * Los Components/Patterns consumen iconos únicamente desde aquí, nunca
 * importando `lucide-react` directamente. Esto evita abrir toda la librería
 * al producto: solo se reexportan los iconos con relación demostrada en el
 * Design System (`05 — Assets`, Icon Master `Icons/Chevron Down`) y en una HU
 * auditada (EN-021.5, HU-56). Añadir un icono nuevo aquí exige la misma
 * evidencia.
 */
export { ChevronDown, LogOut, User, Package, Settings } from 'lucide-react'
