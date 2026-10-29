import { useId, type ElementType, type MouseEvent, type ReactNode } from 'react';
import { Flex, Icon, Stack, Text } from 'lism-css/react';
import { NavMenu } from '@lism-css/ui/react/NavMenu';
import { ChevronsLeftIcon, ChevronsRightIcon, ComponentIcon, GalleryVerticalEndIcon, PaletteIcon } from 'lucide-react';
import type { ViewerPage } from 'virtual:lism-mockup/pages';

import type { PageGroup } from '../lib/groupPages';
import { isModifiedClick } from '../lib/isModifiedClick';
import { buildGalleryHref, buildPageHref, buildTokensHref, type ViewerRoute } from '../lib/useViewerRoute';
import IconButton from './IconButton';
import { TOKENS_VIEW_LABEL } from './TokensView';

interface ViewerNavProps {
  id: string;
  title: string;
  /** When false the sidebar collapses into an icon-only rail. */
  isOpen: boolean;
  onToggle: () => void;
  /** The mockup's own screens by category, without the pinned page. */
  groups: PageGroup[];
  /** Listed with the viewer links instead of with the screens. See `lib/pinnedPage`. */
  pinnedPage: ViewerPage | null;
  route: ViewerRoute;
  onOpenGallery: () => void;
  onOpenTokens: () => void;
  onOpenPage: (pageId: string) => void;
}

/** One of the viewer's own links. The collapsed rail shows exactly these, as icons. */
interface ViewerLink {
  key: string;
  href: string;
  icon: ElementType;
  label: string;
  isCurrent: boolean;
  onSelect: () => void;
}

const navClickHandler = (onSelect: () => void) => (event: MouseEvent<HTMLElement>) => {
  if (isModifiedClick(event)) return;
  event.preventDefault();
  onSelect();
};

export default function ViewerNav({
  id,
  title,
  isOpen,
  onToggle,
  groups,
  pinnedPage,
  route,
  onOpenGallery,
  onOpenTokens,
  onOpenPage,
}: ViewerNavProps) {
  const isCurrentPage = (pageId: string) => route.view === 'page' && pageId === route.pageId;

  // Each list is labelled by its own heading, so screen readers announce the group a
  // link belongs to. Category names come from `mockup.config.json` and may contain
  // spaces, which `aria-labelledby` reads as an id separator — hence generated ids
  // rather than ones derived from the label.
  const labelIdPrefix = useId();
  const groupLabelId = (suffix: string) => `${labelIdPrefix}nav-${suffix}`;

  // Both the expanded list and the collapsed rail render from this one list, so the
  // two states cannot drift apart.
  const viewerLinks: ViewerLink[] = [
    {
      key: 'tokens',
      href: buildTokensHref(),
      icon: PaletteIcon,
      label: TOKENS_VIEW_LABEL,
      isCurrent: route.view === 'tokens',
      onSelect: onOpenTokens,
    },
    ...(pinnedPage
      ? [
          {
            key: 'pinned',
            href: buildPageHref(pinnedPage.id),
            icon: ComponentIcon,
            label: pinnedPage.label,
            isCurrent: isCurrentPage(pinnedPage.id),
            onSelect: () => onOpenPage(pinnedPage.id),
          },
        ]
      : []),
    {
      key: 'gallery',
      href: buildGalleryHref(),
      icon: GalleryVerticalEndIcon,
      label: 'All pages',
      isCurrent: route.view === 'gallery',
      onSelect: onOpenGallery,
    },
  ];

  if (!isOpen) {
    return (
      <Stack
        as="nav"
        id={id}
        className="z--mockupViewerNav"
        aria-label="Mockup navigation"
        fxsh="0"
        ov-y="auto"
        px="10"
        py="20"
        g="20"
        ai="center"
        bd-e
        bgc="base-2"
        bdw="1px"
        bds="dashed"
      >
        <IconButton icon={ChevronsRightIcon} label="Show page list" onClick={onToggle} isExpanded={false} controls={id} />
        <NavMenu.Root itemP="10" g="5">
          {viewerLinks.map((link) => (
            <NavMenu.Item key={link.key}>
              <NavMenu.Link
                href={link.href}
                aria-label={link.label}
                title={link.label}
                aria-current={link.isCurrent ? 'page' : undefined}
                bgc={link.isCurrent ? 'base' : undefined}
                onClick={navClickHandler(link.onSelect)}
              >
                <Icon icon={{ as: link.icon, size: '1.25em' }} />
              </NavMenu.Link>
            </NavMenu.Item>
          ))}
        </NavMenu.Root>
      </Stack>
    );
  }

  return (
    <Stack
      as="nav"
      id={id}
      className="z--mockupViewerNav"
      aria-label="Mockup navigation"
      fxsh="0"
      w="16rem"
      ov-y="auto"
      py="20"
      g="25"
      bd-e
      bgc="base-2"
      bdw="1px"
      bds="dashed"
    >
      <Stack g="5">
        <Flex ai="center" jc="between" g="10" pe="10">
          <NavGroupLabel id={groupLabelId('viewer')}>{title}</NavGroupLabel>
          <IconButton icon={ChevronsLeftIcon} label="Hide page list" onClick={onToggle} isExpanded controls={id} />
        </Flex>
        <NavMenu.Root itemP="15" aria-labelledby={groupLabelId('viewer')}>
          {viewerLinks.map((link) => (
            <NavLink key={link.key} href={link.href} icon={link.icon} isCurrent={link.isCurrent} onSelect={link.onSelect}>
              {link.label}
            </NavLink>
          ))}
        </NavMenu.Root>
      </Stack>
      {groups.map((group, index) => (
        <Stack key={group.key} g="5">
          <NavGroupLabel id={groupLabelId(String(index))}>{group.label}</NavGroupLabel>
          <NavMenu.Root itemP="15" aria-labelledby={groupLabelId(String(index))}>
            {group.pages.map((page) => (
              <NavLink key={page.id} href={buildPageHref(page.id)} isCurrent={isCurrentPage(page.id)} onSelect={() => onOpenPage(page.id)}>
                {page.label}
              </NavLink>
            ))}
          </NavMenu.Root>
        </Stack>
      ))}
    </Stack>
  );
}

function NavGroupLabel({ id, children }: { id: string; children: ReactNode }) {
  return (
    <Text as="div" id={id} px="15" fz="2xs" fw="bold" c="text-2" o="p" tt="uppercase" lts="l" ovw="anywhere">
      {children}
    </Text>
  );
}

interface NavLinkProps {
  href: string;
  /** Decorative icon displayed for the viewer's primary navigation. */
  icon?: ElementType;
  isCurrent: boolean;
  /** Runs on a plain click, after the default navigation has been cancelled. */
  onSelect: () => void;
  children: ReactNode;
}

function NavLink({ href, icon, isCurrent, onSelect, children }: NavLinkProps) {
  return (
    <NavMenu.Item>
      <NavMenu.Link
        href={href}
        aria-current={isCurrent ? 'page' : undefined}
        fz="s"
        fw={isCurrent ? 'bold' : undefined}
        bgc={isCurrent ? 'base' : undefined}
        ovw="anywhere"
        onClick={navClickHandler(onSelect)}
      >
        {icon ? (
          <Flex as="span" ai="center" g="10">
            <Icon icon={{ as: icon, size: '1em' }} />
            {children}
          </Flex>
        ) : (
          children
        )}
      </NavMenu.Link>
    </NavMenu.Item>
  );
}
