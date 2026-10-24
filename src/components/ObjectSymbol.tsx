import React from 'react';
import { Building2, Zap, Database, CircleX, Network } from 'lucide-react';
import { ObjectType } from '../types';
import { objectColors } from '../lib/map';

export function ObjectSymbol({ type, className = '' }: { type: ObjectType | 'connection'; className?: string }) {
  const Icon = { building: Building2, transformer: Zap, distribution_box: Database, disconnect_point: CircleX, connection: Network }[type] || Network;
  return <span className={`inline-flex shrink-0 items-center justify-center rounded-lg border-2 border-white shadow-md ${className}`} style={{ width: 28, height: 28, background: objectColors[type] || '#64748b', color: 'white' }}><Icon size={17} strokeWidth={2.5} /></span>;
}
