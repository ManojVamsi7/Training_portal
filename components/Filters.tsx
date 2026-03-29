'use client';
import React, { useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';

interface FiltersProps {
  onSearch: (q: string) => void;
  onCompanyFilter: (c: string) => void;
  onLocationFilter: (l: string) => void;
  onDeptFilter: (d: string) => void;
  companies: string[];
  locations: string[];
  departments: string[];
}

export default function Filters({
  onSearch,
  onCompanyFilter,
  onLocationFilter,
  onDeptFilter,
  companies,
  locations,
  departments,
}: FiltersProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="filters-bar">
      <div className="search-wrap">
        <Search size={16} className="search-icon" />
        <input
          className="search-input"
          placeholder="Search by title, company or keyword…"
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      <button
        className="filter-toggle-btn"
        onClick={() => setOpen((p) => !p)}
        title="Filters"
      >
        <SlidersHorizontal size={16} />
        <span>Filters</span>
      </button>

      {open && (
        <div className="filter-dropdowns">
          <select onChange={(e) => onCompanyFilter(e.target.value)} className="filter-select">
            <option value="">All Companies</option>
            {companies.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select onChange={(e) => onLocationFilter(e.target.value)} className="filter-select">
            <option value="">All Locations</option>
            {locations.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <select onChange={(e) => onDeptFilter(e.target.value)} className="filter-select">
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
