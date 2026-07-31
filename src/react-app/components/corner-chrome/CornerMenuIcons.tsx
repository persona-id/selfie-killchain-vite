import './CornerMenuIcons.css'

const CORNER_MENU_ICON_SRC = {
  settings: '/icons/corner-chrome/complexity.png',
  complexity: '/icons/corner-chrome/settings.png',
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
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
    >
      <path
        d="M8.5 23.5L23.5 8.5M23.5 8.5H14.5M23.5 8.5V17.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
