import './CornerMenuIcons.css'

const ICON_VIEWBOX = '0 0 24.5874 24.5874'

function SettingsCornerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={`corner-menu__trigger-icon${className ? ` ${className}` : ''}`}
      viewBox={ICON_VIEWBOX}
      fill="none"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.2935 20.709C16.9412 20.709 20.7088 16.9413 20.7088 12.2937C20.7088 7.64603 16.9412 3.87837 12.2935 3.87837C7.64588 3.87837 3.87821 7.64603 3.87821 12.2937C3.87821 16.9413 7.64588 20.709 12.2935 20.709ZM12.2935 22.5384C17.9515 22.5384 22.5383 17.9517 22.5383 12.2937C22.5383 6.63567 17.9515 2.04895 12.2935 2.04895C6.63552 2.04895 2.04879 6.63567 2.04879 12.2937C2.04879 17.9517 6.63552 22.5384 12.2935 22.5384Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.2935 6.98834C12.7987 6.98834 13.2082 7.39787 13.2082 7.90305V11.379H16.6841C17.1893 11.379 17.5988 11.7885 17.5988 12.2937C17.5988 12.7989 17.1893 13.2084 16.6841 13.2084H13.2082V16.6842C13.2082 17.1894 12.7987 17.599 12.2935 17.599C11.7883 17.599 11.3788 17.1894 11.3788 16.6842V13.2084H7.90293C7.39775 13.2084 6.98822 12.7989 6.98822 12.2937C6.98822 11.7885 7.39775 11.379 7.90293 11.379H11.3788V7.90305C11.3788 7.39787 11.7883 6.98834 12.2935 6.98834Z"
        fill="currentColor"
      />
    </svg>
  )
}

function ComplexityCornerIcon({ className }: { className?: string }) {
  return (
    <img
      src="/icons/corner-chrome/complexity.png"
      alt=""
      className={`corner-menu__trigger-icon-img${className ? ` ${className}` : ''}`}
      draggable={false}
    />
  )
}

export function CornerMenuIcon({
  icon,
  className,
}: {
  icon: 'settings' | 'complexity'
  className?: string
}) {
  if (icon === 'settings') {
    return <SettingsCornerIcon className={className} />
  }

  return <ComplexityCornerIcon className={className} />
}

export function CornerArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden
    >
      <rect
        x="27.916"
        y="0"
        width="3.91148"
        height="3.91148"
        rx="1.95574"
        transform="rotate(90 27.916 0)"
        fill="currentColor"
      />
      <rect
        x="27.916"
        y="12.002"
        width="3.91148"
        height="3.91148"
        rx="1.95574"
        transform="rotate(90 27.916 12.002)"
        fill="currentColor"
      />
      <rect
        x="27.916"
        y="24.0034"
        width="3.91148"
        height="3.91148"
        rx="1.95574"
        transform="rotate(90 27.916 24.0034)"
        fill="currentColor"
      />
      <rect
        x="15.9141"
        y="0"
        width="3.91148"
        height="3.91148"
        rx="1.95574"
        transform="rotate(90 15.9141 0)"
        fill="currentColor"
      />
      <rect
        x="15.9141"
        y="12.002"
        width="3.91148"
        height="3.91148"
        rx="1.95574"
        transform="rotate(90 15.9141 12.002)"
        fill="currentColor"
      />
      <rect
        x="3.91211"
        y="0"
        width="3.91148"
        height="3.91148"
        rx="1.95574"
        transform="rotate(90 3.91211 0)"
        fill="currentColor"
      />
      <rect
        x="3.91211"
        y="24.0034"
        width="3.91148"
        height="3.91148"
        rx="1.95574"
        transform="rotate(90 3.91211 24.0034)"
        fill="currentColor"
      />
    </svg>
  )
}
