import type { ReactNode } from 'react'
import viewEndNodeIcon from '../assets/icons/view-end-node.png'

export const UTILITY_ICON_SIZE = 28
export const UTILITY_MENU_ICON_INACTIVE = '#787878'
export const UTILITY_ACTION_ICON_INACTIVE = '#B1B1B1'
/** @deprecated Use UTILITY_MENU_ICON_INACTIVE or UTILITY_ACTION_ICON_INACTIVE */
export const UTILITY_ICON_INACTIVE = UTILITY_MENU_ICON_INACTIVE
export const UTILITY_ICON_ACTIVE = '#000000'

function UtilityActionIcon({
  active = false,
  viewBox,
  children,
}: {
  active?: boolean
  viewBox: string
  children: ReactNode
}) {
  return (
    <svg
      className={`utility-nav-icon utility-nav-icon--action${
        active ? ' utility-nav-icon--action-active' : ''
      }`}
      width={UTILITY_ICON_SIZE}
      height={UTILITY_ICON_SIZE}
      viewBox={viewBox}
      fill="none"
      aria-hidden
    >
      {children}
    </svg>
  )
}

export function FitToScreenNavIcon({ active = false }: { active?: boolean }) {
  return (
    <UtilityActionIcon active={active} viewBox="0 0 28 28">
      <path
        d="M10.5 3H5.5C4.12 3 3 4.12 3 5.5V10.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M17.5 3H22.5C23.88 3 25 4.12 25 5.5V10.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M10.5 25H5.5C4.12 25 3 23.88 3 22.5V17.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M17.5 25H22.5C23.88 25 25 23.88 25 22.5V17.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </UtilityActionIcon>
  )
}

export function ResetNavIcon({ active = false }: { active?: boolean }) {
  return (
    <UtilityActionIcon active={active} viewBox="0 0 28 30">
      <path
        d="M16.25 5.25C9.25 5.25 4.75 9.75 4.75 15.25C4.75 20.25 8.25 24.25 13.25 25.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M11.25 5.25H16.25L14.75 9.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </UtilityActionIcon>
  )
}

export function ViewEndNodeNavIcon({ active = false }: { active?: boolean }) {
  return (
    <img
      src={viewEndNodeIcon}
      alt=""
      width={UTILITY_ICON_SIZE}
      height={UTILITY_ICON_SIZE}
      className={`utility-nav-icon utility-nav-icon--view-end${
        active ? ' utility-nav-icon--view-end-active' : ''
      }`}
      aria-hidden
    />
  )
}
