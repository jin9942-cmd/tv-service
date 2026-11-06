/** Dev-only WSOP archive media (see vite.config.ts); `null` in every build. */
declare module 'virtual:nas-media' {
  const NAS: {
    credit: string;
    video: Record<'ft' | 'hall' | 'int' | 'deal' | 'hl', string>;
    stills: Record<'broadcast' | 'hands' | 'people' | 'venue', string[]>;
    hero: { table: string; portrait: string; finalTable: string };
  } | null;
  export default NAS;
}
