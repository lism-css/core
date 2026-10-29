'use client';
import { useContext } from 'react';
import type { ElementType } from 'react';
import atts from 'lism-css/lib/helper/atts';
import { Lism, Flow, type LayoutComponentProps } from 'lism-css/react';
import type { FlowLayoutProps } from 'lism-css/lib/types/LayoutProps';
import { AccordionContext } from './context';

type PanelProps<T extends ElementType = 'div'> = LayoutComponentProps<T, FlowLayoutProps> & {
  accID?: string;
  isOpen?: boolean;
};

export default function Panel<T extends ElementType = 'div'>({
  children,
  className,
  as,
  accID: propAccID = '__LISM_ACC_ID__',
  isOpen = false,
  ...props
}: PanelProps<T>) {
  const ctx = useContext(AccordionContext);
  const id = ctx?.accID || propAccID;

  return (
    <Lism
      as={(as ?? 'div') as 'div'}
      className={atts(className, 'b--accordion_panel')}
      id={id}
      hidden={isOpen ? undefined : ('until-found' as unknown as boolean)}
    >
      <Flow className="b--accordion_content" {...(props as object)}>
        {children}
      </Flow>
    </Lism>
  );
}
