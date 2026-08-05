import './CornerMenuIcons.css'

const CORNER_MENU_ICON_SRC = {
  settings: '/icons/corner-chrome/settings.png',
  complexity: '/icons/corner-chrome/complexity.png',
} as const

export function CornerMenuIcon({
  icon,
  className,
}: {
  icon: keyof typeof CORNER_MENU_ICON_SRC
  className?: string
}) {
  return (
    <img
      src={CORNER_MENU_ICON_SRC[icon]}
      alt=""
      className={`corner-menu__trigger-icon-img${className ? ` ${className}` : ''}`}
      draggable={false}
    />
  )
}

export function CornerArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="32"
      height="32"
      viewBox="-2 -2 36 36"
      fill="none"
      overflow="visible"
      aria-hidden
    >
      <path
        d="M2 29.5L30 2M30 2V7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
