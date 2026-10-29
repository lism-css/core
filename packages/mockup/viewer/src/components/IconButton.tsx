import type { ElementType } from 'react';
import { Center, Icon } from 'lism-css/react';

interface IconButtonProps {
  icon: ElementType;
  /** Accessible name. Also used as the tooltip. */
  label: string;
  onClick: () => void;
  /** Rendered as `aria-expanded` when the button controls a disclosure. */
  isExpanded?: boolean;
  controls?: string;
}

/** Square icon-only button used in the viewer sidebar. */
export default function IconButton({ icon, label, onClick, isExpanded, controls }: IconButtonProps) {
  return (
    <Center
      as="button"
      type="button"
      set="plain"
      className="z--mockupViewerIconBtn"
      p="10"
      bdrs="10"
      hov={{ bgc: 'base' }}
      hasTransition
      aria-label={label}
      aria-expanded={isExpanded}
      aria-controls={controls}
      title={label}
      onClick={onClick}
    >
      <Icon icon={{ as: icon, size: '1.25em' }} />
    </Center>
  );
}
