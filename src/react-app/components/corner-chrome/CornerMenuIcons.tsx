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
    <img
      src="/icons/menu-arrow.png"
      alt=""
      className={className}
      draggable={false}
      aria-hidden
    />
  )
}
