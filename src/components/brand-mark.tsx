import type { SVGProps } from "react";

export function BrandMark({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={className} {...props}>
      <path d="M7 8h12l10 13V8h12v32H29L19 27v13H7V8Z" fill="currentColor" />
      <path d="M19 8h10v13L19 8Z" fill="white" fillOpacity=".82" />
      <path d="M19 27h10v13L19 27Z" fill="white" fillOpacity=".82" />
    </svg>
  );
}
