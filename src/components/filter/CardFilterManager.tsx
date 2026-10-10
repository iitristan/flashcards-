'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SlidersHorizontal,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Edit2,
  Check,
  X,
  RotateCcw,
  Search,
  Filter,
  ArrowUpDown,
  BookOpen,
  Tag,
  Stethoscope,
  Globe,
  UtensilsCrossed,
  Heart,
  Apple,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { useNutriStore } from '@/lib/store/useNutriStore';
import {
  CardGroupFilterConfig,
  CardGroupFilterItem,
  CardSortOption,
  CardFilterOption,
  Flashcard,
  getCardProgressInfo
} from '@/types';
import { resolveCardSubject } from '@/lib/services/boardReadinessService';
import { toast } from 'sonner';

export const CardFilterManager: React.FC = () => {
  const {
    decks,
    cardGroupFilters,
    updateGroupFilterConfig,
    addGroupFilterItem,
    removeGroupFilterItem,
    toggleGroupFilterItem,
    reorderGroupFilterItems,
    resetGroupFilterConfig,
    resetAllGroupFilters,
    updateCard
  } = useNutriStore();

  const groupKeys = useMemo(() => Object.keys(cardGroupFilters), [cardGroupFilters]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(groupKeys[0] || 'nbcd');

  // New filter input state
  const [isAddingFilter, setIsAddingFilter] = useState(false);
  const [newFilterLabel, setNewFilterLabel] = useState('');
  const [newFilterTag, setNewFilterTag] = useState('');

  // Editing existing filter state
  const [editingFilterId, setEditingFilterId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editTag, setEditTag] = useState('');

  // Search filter inside assigned cards
  const [cardSearch, setCardSearch] = useState('');

  // Card tagging modal/popover state
  const [taggingCardId, setTaggingCardId] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState('');

  // Pagination state for assigned cards preview
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const activeGroup: CardGroupFilterConfig | undefined = cardGroupFilters[selectedGroupId];

  // Map icons
  const getGroupIcon = (iconName: string) => {
    switch (iconName) {
      case 'Stethoscope':
        return <Stethoscope className="w-4 h-4" />;
      case 'Globe':
        return <Globe className="w-4 h-4" />;
      case 'UtensilsCrossed':
        return <UtensilsCrossed className="w-4 h-4" />;
      case 'Heart':
        return <Heart className="w-4 h-4" />;
      case 'Apple':
        return <Apple className="w-4 h-4" />;
      default:
        return <Layers className="w-4 h-4" />;
    }
  };

  // 1. Gather all cards that belong to this card group / practice area
  const allGroupCards: Array<{ card: Flashcard; deckTitle: string; deckCategory: string; deckId: string }> = useMemo(() => {
    if (!activeGroup) return [];
    const list: Array<{ card: Flashcard; deckTitle: string; deckCategory: string; deckId: string }> = [];

    for (const deck of decks) {
      for (const card of deck.cards || []) {
        let isMatch = false;
        if (activeGroup.ndleSubject) {
          const resolved = resolveCardSubject(card, deck.category);
          if (resolved === activeGroup.ndleSubject) {
            isMatch = true;
          }
        } else if (activeGroup.category) {
          if (deck.category === activeGroup.category) {
            isMatch = true;
          } else if ((card.tags || []).some(t => t.toLowerCase() === activeGroup.category?.toLowerCase())) {
            isMatch = true;
          }
        }

        if (isMatch) {
          list.push({
            card,
            deckTitle: deck.title,
            deckCategory: deck.category,
            deckId: deck.id
          });
        }
      }
    }
    return list;
  }, [decks, activeGroup]);

  // Helper to test if a card matches a filter item
  const cardMatchesFilter = (card: Flashcard, filter: CardGroupFilterItem): boolean => {
    const q = filter.tag.trim().toLowerCase();
    if (!q) return true;
    const cardTags = (card.tags || []).map(t => t.toLowerCase());
    if (cardTags.some(t => t.includes(q) || q.includes(t))) return true;
    if ((card.front || '').toLowerCase().includes(q)) return true;
    if ((card.back || '').toLowerCase().includes(q)) return true;
    if ((card.rationale || '').toLowerCase().includes(q)) return true;
    return false;
  };

  // Calculate card counts per filter item in this group
  const filterCounts = useMemo(() => {
    const map = new Map<string, number>();
    if (!activeGroup) return map;

    for (const f of activeGroup.filters) {
      let count = 0;
      for (const item of allGroupCards) {
        if (cardMatchesFilter(item.card, f)) {
          count++;
        }
      }
      map.set(f.id, count);
    }
    return map;
  }, [activeGroup, allGroupCards]);

  // 2. Filter & Sort cards according to this group's independent configuration
  const filteredAndSortedCards = useMemo(() => {
    if (!activeGroup) return [];
    let result = [...allGroupCards];

    // Filter by active group sub-filter tags
    const enabledFilters = activeGroup.filters.filter(f => f.enabled);
    if (activeGroup.filters.length > 0) {
      if (enabledFilters.length === 0) {
        // All filters untoggled -> empty set
        return [];
      } else if (enabledFilters.length < activeGroup.filters.length) {
        // Subset of filters enabled -> must match at least one enabled filter
        result = result.filter(item => enabledFilters.some(f => cardMatchesFilter(item.card, f)));
      }
    }

    // Filter by stage filter (progress)
    const stage = activeGroup.stageFilter;
    if (stage !== 'all') {
      const now = new Date();
      if (stage === 'unseen') {
        result = result.filter(item => !item.card.lastReviewedAt || (item.card.sm2?.repetitions || 0) === 0);
      } else if (stage === 'learning') {
        result = result.filter(item => (item.card.sm2?.repetitions || 0) > 0 && (item.card.sm2?.interval || 0) < 4);
      } else if (stage === 'developing') {
        result = result.filter(item => (item.card.sm2?.interval || 0) >= 4 && (item.card.sm2?.interval || 0) < 21);
      } else if (stage === 'mastered') {
        result = result.filter(item => (item.card.sm2?.interval || 0) >= 21 || (item.card.sm2?.repetitions || 0) >= 4);
      } else if (stage === 'due') {
        result = result.filter(item => !item.card.lastReviewedAt || new Date(item.card.sm2?.dueDate || 0) <= now);
      } else if (stage === 'wrong') {
        result = result.filter(item => item.card.lastReviewedAt && (item.card.sm2?.repetitions || 0) === 0);
      }
    }

    // Filter by search query
    const q = (cardSearch || activeGroup.searchQuery || '').trim().toLowerCase();
    if (q) {
      result = result.filter(item =>
        (item.card.front || '').toLowerCase().includes(q) ||
        (item.card.back || '').toLowerCase().includes(q) ||
        (item.card.rationale || '').toLowerCase().includes(q) ||
        (item.card.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }

    // Sort according to activeSort
    const sort = activeGroup.activeSort;
    if (sort === 'progress-asc') {
      result.sort((a, b) => (a.card.sm2?.repetitions || 0) - (b.card.sm2?.repetitions || 0));
    } else if (sort === 'progress-desc') {
      result.sort((a, b) => (b.card.sm2?.repetitions || 0) - (a.card.sm2?.repetitions || 0));
    } else if (sort === 'difficulty') {
      const diffOrder: Record<string, number> = { hard: 1, medium: 2, easy: 3 };
      result.sort((a, b) => (diffOrder[a.card.difficulty || 'medium'] || 2) - (diffOrder[b.card.difficulty || 'medium'] || 2));
    } else if (sort === 'alphabetical') {
      result.sort((a, b) => (a.card.front || '').localeCompare(b.card.front || ''));
    } else if (sort === 'most-reviewed') {
      result.sort((a, b) => (b.card.sm2?.repetitions || 0) - (a.card.sm2?.repetitions || 0));
    }

    return result;
  }, [allGroupCards, activeGroup, cardSearch]);

  // Pagination calculations
  const totalCards = filteredAndSortedCards.length;
  const totalPages = Math.max(1, Math.ceil(totalCards / pageSize));

  // Reset to page 1 on group or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedGroupId, cardSearch]);

  // Adjust page if it exceeds total pages
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCards);

  const paginatedCards = useMemo(() => {
    return filteredAndSortedCards.slice(startIndex, endIndex);
  }, [filteredAndSortedCards, startIndex, endIndex]);

  // Generate pagination buttons with smart ellipsis
  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, '...', totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  }, [totalPages, currentPage]);

  // Handlers for filter management
  const handleAddFilter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFilterLabel.trim() || !newFilterTag.trim()) {
      toast.error('Please provide both a label and a tag keyword.');
      return;
    }
    addGroupFilterItem(selectedGroupId, {
      label: newFilterLabel.trim(),
      tag: newFilterTag.trim().toLowerCase()
    });
    setNewFilterLabel('');
    setNewFilterTag('');
    setIsAddingFilter(false);
    toast.success(`Added filter "${newFilterLabel.trim()}" to ${activeGroup?.name}`);
  };

  const handleStartEdit = (f: CardGroupFilterItem) => {
    setEditingFilterId(f.id);
    setEditLabel(f.label);
    setEditTag(f.tag);
  };

  const handleSaveEdit = (fId: string) => {
    if (!editLabel.trim() || !editTag.trim() || !activeGroup) return;
    const updatedFilters = activeGroup.filters.map(f =>
      f.id === fId ? { ...f, label: editLabel.trim(), tag: editTag.trim().toLowerCase() } : f
    );
    updateGroupFilterConfig(selectedGroupId, { filters: updatedFilters });
    setEditingFilterId(null);
    toast.success('Filter updated');
  };

  const handleMoveUp = (index: number) => {
    if (!activeGroup || index <= 0) return;
    const newFilters = [...activeGroup.filters];
    const temp = newFilters[index - 1];
    newFilters[index - 1] = newFilters[index];
    newFilters[index] = temp;
    reorderGroupFilterItems(selectedGroupId, newFilters.map(f => f.id));
  };

  const handleMoveDown = (index: number) => {
    if (!activeGroup || index >= activeGroup.filters.length - 1) return;
    const newFilters = [...activeGroup.filters];
    const temp = newFilters[index + 1];
    newFilters[index + 1] = newFilters[index];
    newFilters[index] = temp;
    reorderGroupFilterItems(selectedGroupId, newFilters.map(f => f.id));
  };

  const handleDeleteFilter = (f: CardGroupFilterItem) => {
    if (window.confirm(`Delete the "${f.label}" filter from ${activeGroup?.name}?`)) {
      removeGroupFilterItem(selectedGroupId, f.id);
      toast.success(`Removed "${f.label}" filter`);
    }
  };

  const handleToggleAll = (enable: boolean) => {
    if (!activeGroup) return;
    const updated = activeGroup.filters.map(f => ({ ...f, enabled: enable }));
    updateGroupFilterConfig(selectedGroupId, { filters: updated });
    toast.info(enable ? 'Enabled all filters in this group' : 'Disabled all filters in this group');
  };

  const handleAddTagToCard = async (deckId: string, cardId: string, currentTags: string[]) => {
    if (!newTagInput.trim()) return;
    const tagToAdd = newTagInput.trim().toLowerCase();
    if (currentTags.includes(tagToAdd)) {
      toast.info('Card already has this tag');
      return;
    }
    const updatedTags = [...currentTags, tagToAdd];
    await updateCard(deckId, cardId, { tags: updatedTags });
    setNewTagInput('');
    setTaggingCardId(null);
    toast.success(`Tagged card with "${tagToAdd}"`);
  };

  const handleRemoveTagFromCard = async (deckId: string, cardId: string, tagToRemove: string, currentTags: string[]) => {
    const updatedTags = currentTags.filter(t => t.toLowerCase() !== tagToRemove.toLowerCase());
    await updateCard(deckId, cardId, { tags: updatedTags });
    toast.success(`Removed tag "${tagToRemove}"`);
  };

  if (!activeGroup) {
    return (
      <div className="p-8 text-center text-xs text-[var(--text-muted)]">
        Loading filter management...
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* ------------------------------------------------------------------- */}
      {/* HEADER BANNER                                                      */}
      {/* ------------------------------------------------------------------- */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center font-bold">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-[var(--text-main)]">
              Independent Filter & Sorting Manager
            </h2>
          </div>
          <p className="text-xs text-[var(--text-muted)] max-w-2xl leading-relaxed">
            Customize filters and sorting independently for each practice area. Changing filters in <strong>Clinical Nutrition</strong> will only isolate its cards, leaving other areas intact. Add new filters, reorder preferences, or remove filters like <strong>Maternal</strong> anytime.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (window.confirm('Reset all card groups and filters to their defaults?')) {
              resetAllGroupFilters();
              toast.success('All card group filters reset to default');
            }
          }}
          className="px-3.5 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-color)] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset All Defaults</span>
        </button>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* PRACTICE AREA / CARD GROUP SELECTOR TABS                           */}
      {/* ------------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {groupKeys.map((key) => {
          const grp = cardGroupFilters[key];
          if (!grp) return null;
          const isSelected = selectedGroupId === key;

          // Count cards belonging to this group
          let grpCardCount = 0;
          for (const d of decks) {
            for (const c of d.cards || []) {
              if (grp.ndleSubject && resolveCardSubject(c, d.category) === grp.ndleSubject) {
                grpCardCount++;
              } else if (grp.category && (d.category === grp.category || (c.tags || []).some(t => t.toLowerCase() === grp.category?.toLowerCase()))) {
                grpCardCount++;
              }
            }
          }

          const activeFiltersCount = grp.filters.filter(f => f.enabled).length;

          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setSelectedGroupId(key);
                setEditingFilterId(null);
                setIsAddingFilter(false);
              }}
              className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 relative overflow-hidden ${
                isSelected
                  ? 'border-[var(--primary)] bg-[var(--primary-light)]/40 shadow-xs ring-2 ring-[var(--primary)]/20'
                  : 'border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-subtle)] hover:border-[var(--border-subtle)]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center font-bold"
                  style={{
                    backgroundColor: `${grp.color}20`,
                    color: grp.color
                  }}
                >
                  {getGroupIcon(grp.icon)}
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
                  {grpCardCount} cards
                </span>
              </div>

              <div>
                <span className="font-extrabold text-xs text-[var(--text-main)] block leading-tight line-clamp-1">
                  {grp.name}
                </span>
                <span className="text-[10px] font-semibold text-[var(--text-muted)] block mt-0.5">
                  {activeFiltersCount} of {grp.filters.length} filters active
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* ACTIVE GROUP DETAIL & CONTROLS PANEL                              */}
      {/* ------------------------------------------------------------------- */}
      <div className="p-5 sm:p-7 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-6">
        {/* Group Header Info */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)]">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider"
                style={{
                  backgroundColor: `${activeGroup.color}20`,
                  color: activeGroup.color
                }}
              >
                {activeGroup.id.toUpperCase()} Practice Area
              </span>
              <h3 className="text-base sm:text-lg font-black text-[var(--text-main)]">
                {activeGroup.name}
              </h3>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              {activeGroup.description}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                resetGroupFilterConfig(selectedGroupId);
                toast.success(`Reset filters for ${activeGroup.name}`);
              }}
              className="px-3 py-1 rounded-xl border border-[var(--border-color)] text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] transition-colors cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restore Defaults</span>
            </button>
          </div>
        </div>

        {/* Independent Sort & Progress Stage Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">
          {/* 1. Sorting Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[var(--text-main)] flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span>Independent Sorting Preference:</span>
            </label>
            <select
              value={activeGroup.activeSort}
              onChange={(e) => updateGroupFilterConfig(selectedGroupId, { activeSort: e.target.value as CardSortOption })}
              aria-label="Independent Sorting Preference"
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-main)] focus:border-[var(--primary)] outline-none cursor-pointer"
            >
              <option value="default">Default Exam Order (Shuffled)</option>
              <option value="progress-asc">Unseen & In Learning First</option>
              <option value="progress-desc">Mastered First (Highest Reps)</option>
              <option value="difficulty">By Difficulty (Hard First)</option>
              <option value="most-reviewed">Most Reviewed First</option>
              <option value="alphabetical">Alphabetical (A to Z)</option>
            </select>
            <span className="text-[10px] text-[var(--text-muted)] block">
              Applied exclusively when practicing or reviewing {activeGroup.name}.
            </span>
          </div>

          {/* 2. Progress Stage Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[var(--text-main)] flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span>Independent Card Progression Stage:</span>
            </label>
            <select
              value={activeGroup.stageFilter}
              onChange={(e) => updateGroupFilterConfig(selectedGroupId, { stageFilter: e.target.value as CardFilterOption })}
              aria-label="Independent Card Progression Stage"
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-main)] focus:border-[var(--primary)] outline-none cursor-pointer"
            >
              <option value="all">All Progression Stages (Full Deck)</option>
              <option value="unseen">🆕 Unseen / New Cards Only</option>
              <option value="learning">🔄 In Learning Stage Only</option>
              <option value="developing">📈 Developing Recall Only</option>
              <option value="mastered">🏆 Mastered Cards Only</option>
              <option value="due">⏰ Due for Review Today Only</option>
              <option value="wrong">❌ Wrong / Difficult Cards Only</option>
            </select>
            <span className="text-[10px] text-[var(--text-muted)] block">
              Only focuses on cards at this learning stage for this card group.
            </span>
          </div>
        </div>

        {/* Filter Management (Add, Remove, Reorder, Delete) */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div>
              <h4 className="text-xs sm:text-sm font-extrabold text-[var(--text-main)] flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span>Filters Assigned to {activeGroup.name}</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--primary-light)] text-[var(--primary)] ml-1">
                  {activeGroup.filters.length}
                </span>
              </h4>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Toggle filters on/off to isolate cards. Reorder priority, edit criteria, or delete filters when not needed.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleToggleAll(true)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-[var(--primary)] hover:bg-[var(--primary-light)] transition-colors cursor-pointer"
              >
                Enable All
              </button>
              <button
                type="button"
                onClick={() => handleToggleAll(false)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-[var(--text-muted)] hover:bg-[var(--bg-surface-subtle)] transition-colors cursor-pointer"
              >
                Disable All
              </button>
              <button
                type="button"
                onClick={() => setIsAddingFilter(!isAddingFilter)}
                className="px-3 py-1.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold shadow-xs flex items-center gap-1 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Filter</span>
              </button>
            </div>
          </div>

          {/* ADD NEW FILTER FORM */}
          <AnimatePresence>
            {isAddingFilter && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleAddFilter}
                className="p-4 rounded-2xl bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-main)]">
                    Create New Filter for {activeGroup.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingFilter(false)}
                    className="text-xs text-[var(--text-subtle)] hover:text-[var(--text-main)]"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Filter Display Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Critical Care Nutrition"
                      value={newFilterLabel}
                      onChange={(e) => setNewFilterLabel(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs text-[var(--text-main)] focus:border-[var(--primary)] outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Matching Tag or Keyword
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. critical care, icu, enteral"
                      value={newFilterTag}
                      onChange={(e) => setNewFilterTag(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs text-[var(--text-main)] focus:border-[var(--primary)] outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingFilter(false)}
                    className="px-3 py-1 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-surface)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1 rounded-xl bg-[var(--primary)] text-white text-xs font-bold shadow-xs hover:bg-[var(--primary-hover)] cursor-pointer"
                  >
                    Save Filter
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* FILTER ITEMS LIST */}
          <div className="space-y-2">
            {activeGroup.filters.length === 0 ? (
              <div className="p-6 text-center rounded-2xl border border-dashed border-[var(--border-color)] text-xs text-[var(--text-muted)]">
                No filters currently defined for {activeGroup.name}. Click &quot;Add Filter&quot; above to create one.
              </div>
            ) : (
              activeGroup.filters.map((f, idx) => {
                const isEditing = editingFilterId === f.id;
                const matchCount = filterCounts.get(f.id) || 0;

                return (
                  <div
                    key={f.id}
                    className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      f.enabled
                        ? 'bg-[var(--bg-surface)] border-[var(--border-color)] shadow-2xs'
                        : 'bg-[var(--bg-surface-subtle)]/50 border-[var(--border-subtle)] opacity-60'
                    }`}
                  >
                    {isEditing ? (
                      <div className="flex-1 flex flex-col sm:flex-row gap-2 w-full">
                        <input
                          type="text"
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          className="flex-1 px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--primary)] text-xs font-bold text-[var(--text-main)]"
                          placeholder="Filter Label"
                        />
                        <input
                          type="text"
                          value={editTag}
                          onChange={(e) => setEditTag(e.target.value)}
                          className="flex-1 px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--primary)] text-xs font-bold text-[var(--text-main)]"
                          placeholder="Tag Keyword"
                        />
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(f.id)}
                            className="p-1.5 rounded-lg bg-[var(--primary)] text-white text-xs hover:bg-[var(--primary-hover)] cursor-pointer"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingFilterId(null)}
                            className="p-1.5 rounded-lg border border-[var(--border-color)] text-xs text-[var(--text-muted)] hover:bg-[var(--bg-surface-subtle)] cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Checkbox toggle */}
                        <button
                          type="button"
                          onClick={() => toggleGroupFilterItem(selectedGroupId, f.id)}
                          aria-label={`Toggle filter ${f.label}`}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                            f.enabled
                              ? 'bg-[var(--primary)] border-[var(--primary)] text-white'
                              : 'bg-[var(--bg-surface)] border-[var(--border-color)] text-transparent'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-xs text-[var(--text-main)]">
                              {f.label}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                              tag: #{f.tag}
                            </span>
                            {f.tag.includes('maternal') && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20">
                                Maternal Focus
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Matching count badge */}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-muted)] shrink-0">
                          {matchCount} {matchCount === 1 ? 'card' : 'cards'}
                        </span>
                      </div>
                    )}

                    {/* Action buttons (Reorder, Edit, Delete) */}
                    <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleMoveUp(idx)}
                        disabled={idx === 0}
                        aria-label="Move filter up"
                        className="p-1 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(idx)}
                        disabled={idx === activeGroup.filters.length - 1}
                        aria-label="Move filter down"
                        className="p-1 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(f)}
                        aria-label="Edit filter"
                        className="p-1 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] cursor-pointer"
                        title="Edit Filter Name/Tag"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteFilter(f)}
                        aria-label="Delete filter"
                        className="p-1 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        title="Delete Filter Entirely"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* ASSIGNED CARDS EXPLORER (SEGREGATED CARDS PREVIEW)               */}
        {/* ----------------------------------------------------------------- */}
        <div className="pt-4 border-t border-[var(--border-subtle)] space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div>
              <h4 className="text-xs sm:text-sm font-extrabold text-[var(--text-main)] flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span>Cards Matching Current Filters ({filteredAndSortedCards.length} of {allGroupCards.length})</span>
              </h4>
              <p className="text-[11px] text-[var(--text-muted)]">
                Viewing flashcards strictly segregated under {activeGroup.name} with your active filters and sort applied.
              </p>
            </div>

            {/* In-view search box */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3 h-3 text-[var(--text-subtle)] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search matching cards..."
                value={cardSearch}
                onChange={(e) => setCardSearch(e.target.value)}
                className="w-full pl-7 pr-7 py-1.5 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-main)] focus:border-[var(--primary)] outline-none"
              />
              {cardSearch && (
                <button
                  type="button"
                  onClick={() => setCardSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-subtle)] hover:text-[var(--text-main)]"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Top Pagination & Per-Page Controls Bar */}
          {totalCards > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 px-3 py-2 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-muted)]">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span>
                  Showing <span className="font-bold text-[var(--text-main)]">{startIndex + 1}–{endIndex}</span> of{' '}
                  <span className="font-bold text-[var(--text-main)]">{totalCards}</span> cards
                </span>

                <div className="flex items-center gap-1.5 text-[11px] border-l border-[var(--border-color)] pl-2.5">
                  <span className="text-[var(--text-subtle)]">Per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-main)] font-semibold outline-none cursor-pointer"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-subtle)] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    title="First page"
                    aria-label="First page"
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-subtle)] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    title="Previous page"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-1 mx-0.5">
                    {pageNumbers.map((page, idx) =>
                      page === '...' ? (
                        <span key={`top-ellipsis-${idx}`} className="px-1 text-[var(--text-subtle)]">
                          …
                        </span>
                      ) : (
                        <button
                          key={`top-${page}`}
                          type="button"
                          onClick={() => setCurrentPage(Number(page))}
                          className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            currentPage === page
                              ? 'bg-[var(--primary)] text-white shadow-xs'
                              : 'border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-subtle)] text-[var(--text-main)]'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-subtle)] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    title="Next page"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-subtle)] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    title="Last page"
                    aria-label="Last page"
                  >
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Cards List Grid */}
          <div className="space-y-2.5">
            {filteredAndSortedCards.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-[var(--bg-surface-subtle)] border border-dashed border-[var(--border-color)] space-y-2">
                <p className="text-xs font-semibold text-[var(--text-muted)]">
                  No flashcards match the current active filters for {activeGroup.name}.
                </p>
                <p className="text-[11px] text-[var(--text-subtle)]">
                  Try enabling additional filters or clearing the search keyword.
                </p>
                <button
                  type="button"
                  onClick={() => handleToggleAll(true)}
                  className="px-3 py-1 rounded-xl bg-[var(--primary)] text-white text-xs font-bold cursor-pointer"
                >
                  Enable All Filters
                </button>
              </div>
            ) : (
              paginatedCards.map(({ card, deckTitle, deckId }) => {
                const prog = getCardProgressInfo(card);
                const matchingActiveFilters = activeGroup.filters.filter(f => f.enabled && cardMatchesFilter(card, f));

                return (
                  <div
                    key={card.id}
                    className="p-3.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-[var(--primary)]/40 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${prog.color}`}>
                            {prog.badge}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] font-medium">
                            Deck: {deckTitle}
                          </span>
                          {card.difficulty && (
                            <span className="text-[10px] font-bold text-[var(--text-subtle)] uppercase">
                              • {card.difficulty}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-[var(--text-main)] pt-1 leading-snug">
                          {card.front}
                        </p>
                        <p className="text-xs font-medium text-[var(--primary)] pt-0.5">
                          Answer: {card.back}
                        </p>
                      </div>

                      {/* Add Tag to this card button */}
                      <button
                        type="button"
                        onClick={() => setTaggingCardId(taggingCardId === card.id ? null : card.id)}
                        className="px-2 py-1 rounded-lg border border-[var(--border-color)] text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] shrink-0 transition-colors cursor-pointer"
                        title="Add/Edit Tags"
                      >
                        + Tag
                      </button>
                    </div>

                    {/* Tagging input popover */}
                    {taggingCardId === card.id && (
                      <div className="p-2.5 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Enter tag (e.g. maternal, renal)..."
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          className="flex-1 px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs text-[var(--text-main)] outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddTagToCard(deckId, card.id, card.tags || [])}
                          className="px-3 py-1 rounded-lg bg-[var(--primary)] text-white text-xs font-bold cursor-pointer"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => setTaggingCardId(null)}
                          className="p-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-main)]"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {/* Matched Filter Tags & Card Tags */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[var(--border-subtle)]">
                      <span className="text-[10px] font-bold text-[var(--text-subtle)]">
                        Matches:
                      </span>
                      {matchingActiveFilters.map((mf) => (
                        <span
                          key={mf.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[var(--primary-light)] text-[var(--primary)] border border-[var(--primary)]/20"
                        >
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>{mf.label}</span>
                        </span>
                      ))}

                      {/* Card Tags */}
                      {(card.tags || []).map((t, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-mono bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] border border-[var(--border-subtle)]"
                        >
                          <span>#{t}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTagFromCard(deckId, card.id, t, card.tags || [])}
                            className="hover:text-rose-500 font-bold ml-0.5"
                            title="Remove tag"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Pagination Bar */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
              <span className="text-[11px]">
                Page <span className="font-bold text-[var(--text-main)]">{currentPage}</span> of{' '}
                <span className="font-bold text-[var(--text-main)]">{totalPages}</span> ({totalCards} total cards)
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-surface-subtle)] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                  title="First page"
                  aria-label="First page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-surface-subtle)] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                  title="Previous page"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1 mx-1">
                  {pageNumbers.map((page, idx) =>
                    page === '...' ? (
                      <span key={`btm-ellipsis-${idx}`} className="px-1 text-[var(--text-subtle)]">
                        …
                      </span>
                    ) : (
                      <button
                        key={`btm-${page}`}
                        type="button"
                        onClick={() => setCurrentPage(Number(page))}
                        className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          currentPage === page
                            ? 'bg-[var(--primary)] text-white shadow-xs'
                            : 'border border-[var(--border-color)] hover:bg-[var(--bg-surface-subtle)] text-[var(--text-main)]'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-surface-subtle)] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                  title="Next page"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-surface-subtle)] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                  title="Last page"
                  aria-label="Last page"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
