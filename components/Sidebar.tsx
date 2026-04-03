'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Briefcase, LayoutDashboard, Users, ShieldCheck, Star,
} from 'lucide-react';

const NAV_ITEMS = [
  { icon: <Users size={18} />, label: 'Assigned Students', href: '/' },
  { icon: <LayoutDashboard size={18} />, label: 'Dashboard', href: '/' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Briefcase size={22} className="sidebar-logo-icon" />
        <span>JobPortal</span>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`sidebar-nav-item${pathname === item.href ? ' active' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}

      </nav>
    </aside>
  );
}
