import type { NavigateFunction, NavigateOptions } from 'react-router'

export function navigateWithViewTransition(
  navigate: NavigateFunction,
  to: string,
  options?: NavigateOptions,
) {
  navigate(to, options)
}
